/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 2015-05-17
 */

var types = require('./types'),
    util = require('util'),
    xml = require('most-xml'),
    DEFAULT_NS = [
        { prefix:'bpmn2', uri:'http://www.omg.org/spec/BPMN/20100524/MODEL' },
        { prefix:'most', uri:'http://www.themost.io/schemas/bmpn' },
        { prefix:'drools', uri:'http://www.jboss.org/drools' }
    ];
/**
 * @class NativeProcess
 * @property {XDocument} document - Holds the business process definition XML
 * @constructor
 * @augments {SequentialProcess}
 */
function NativeProcess() {
    NativeProcess.super_.call(this);
    this.activities_ = { };
}
util.inherits(NativeProcess, types.SequentialProcess);

NativeProcess.prototype.load = function(file, done) {
    var self = this;
    try {
        xml.load(file, function(err, doc) {
            if (err) { done(err); return; }
            /**
             * @type {XDocument}
             */
            self.document = doc;
            //add namespace for MOST extensions
            var element = self.document.selectSingleNode('bpmn2:definitions', DEFAULT_NS);
            if (element) {
                var prefix = element.lookupPrefix('http://www.themost.io/schemas/bmpn');
                if (typeof prefix === 'undefined' || prefix == null) {
                    //add namespace attribute
                    element.setAttribute('xmlns:most', 'http://www.themost.io/schemas/bmpn');
                }
            }
            done();
        });
    }
    catch(e) {
        done(err);
    }
};

NativeProcess.prototype.activity = function(name, ctor) {
    this.activities_[name] = ctor;
};

NativeProcess.prototype.execute = function(context, done) {
    var self = this;
    try {
        if (typeof self.document === 'undefined')
            done(new Error('The business process definition was not loaded'));
        else {
            var node = self.document.selectSingleNode('bpmn2:definitions/bpmn2:process[1]/bpmn2:startEvent');
            if (node) {
                //initialize start activity
                var startActivity = new NativeActivity(node);
                startActivity.process = self;
                startActivity.executionState = types.ActivityExecutionState.Initialized;
                startActivity.execute(context, done);
            }
            else {
                done(new Error('Start Event activity cannot be found.'));
            }
        }
    }
    catch(e) {
        done(e);
    }
};

/**
 * @class NativeActivity
 * @property {XNode} node - Holds the business process definition XML node
 * @property {String} id - A string which represents the native identifier of this activity
 * @property {String} name - A string which represents the native name of this activity
 * @property {NativeProcess} process - Represents the parent process where this activity belongs
 * @constructor
 * @augments {Activity}
 * @param {XNode} node - The business process definition XML node
 */
function NativeActivity(node) {
    //call super constructor
    NativeActivity.super_.call(this);
    //set node
    this.node = node;
    var self = this;
    Object.defineProperty(this, 'id', {
        get: function() {
            if (self.node)
                return self.node.getAttribute('id');
        }, configurable:false, enumerable:false
    });
    Object.defineProperty(this, 'name', {
        get: function() {
            if (self.node)
                return self.node.getAttribute('name');
        }, configurable:false, enumerable:false
    });
    var __process;
    Object.defineProperty(this, 'process', {
        get: function() {
            return __process;
        }, set:function(value) {
            __process = value;
        }, configurable:false, enumerable:false
    });
}
util.inherits(NativeActivity, types.Activity);
/**
 * @param {function(Error=, NativeActivity=)} done
 */
NativeActivity.prototype.next = function(done) {
    if (this.node) {
        var nodes = this.node.selectNodes('bpmn2:outgoing/text()', DEFAULT_NS);
        if (nodes.length==0) {
            done();
        }
        else if (nodes.length==1) {
            var sequence_id = nodes[0].nodeValue;
            var sequenceNode = this.node.parentNode.selectSingleNode(util.format("bpmn2:sequenceFlow[@id='%s']", sequence_id), DEFAULT_NS);
            var targetNode = this.node.parentNode.selectSingleNode(util.format("*[@id='%s']", sequenceNode.getAttribute('targetRef')), DEFAULT_NS);
            var activityType = targetNode.getAttribute("drools:taskName"), result;
            if (activityType) {
                var ActivityCtor = this.process.activities_[activityType];
                if (typeof ActivityCtor === 'function') {
                    result = new ActivityCtor(targetNode);
                    result.process = this.process;
                }
                else {
                    return done(new Error('Unknown Activity Type'));
                }
            }
            else {
                result = new NativeActivity(targetNode);
                result.process = this.process;
            }
            done(null, result);
        }
        else {
            done(new Error('Not Implemented'));
        }
    }
};

NativeActivity.prototype.invoke = function(context, done) {
    done = done || function() {};
    done();
};
/**
 *
 * @param {*} context
 * @param {function(Error=,number=)} done
 */
NativeActivity.prototype.execute = function(context, done) {
    var self = this;
    done = done || function() {};
    NativeActivity.super_.prototype.execute.call(self, context, function(err) {
        //update activity node (status and result)
        self.node.setAttribute('most:result', self.resultText().toLowerCase());
        self.node.setAttribute('most:state', self.stateText().toLowerCase());
        if (self.succeeded()) {
            //get next activity if any
            self.next(function(err, nextActivity) {
                if (err) {
                    done(err);
                }
                else if (nextActivity) {
                    nextActivity.executionState = types.ActivityExecutionState.Initialized;
                    nextActivity.execute(context, done);
                }
                else {
                    done(null, self.executionResult);
                }
            });
        }
        else {
            done(err, self.executionResult);
        }
    });
};
/**
 * @class StartEventActivity
 * @constructor
 * @augnments NativeActivity
 */
function StartEventActivity() {
    StartEventActivity.super_.call(this);
}
util.inherits(StartEventActivity, NativeActivity);

/**
 * @class EndEventActivity
 * @constructor
 * @augnments NativeActivity
 */
function EndEventActivity() {
    EndEventActivity.super_.call(this);
}
util.inherits(EndEventActivity, NativeActivity);

var native = {
    NativeProcess: NativeProcess,
    NativeActivity: NativeActivity,
    StartEventActivity: StartEventActivity,
    EndEventActivity: EndEventActivity
};

if (typeof exports !== 'undefined')
{
    module.exports = native;
}

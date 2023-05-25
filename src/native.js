// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2023, THEMOST LP All rights reserved
import { SequentialProcess, Activity, ActivityExecutionState } from './types';
import { XDocument } from '@themost/xml';

const DEFAULT_NS = [
        { prefix:'bpmn2', uri:'http://www.omg.org/spec/BPMN/20100524/MODEL' },
        { prefix:'most', uri:'http://www.themost.io/schemas/bmpn' },
        { prefix:'drools', uri:'http://www.jboss.org/drools' }
    ];

class NativeProcess extends SequentialProcess {
    constructor() {
        super();
        this._activities = {};
    }
    load(file, done) {
        let self = this;
        try {
            XDocument.load(file, function (err, doc) {
                if (err) { done(err); return; }
                /**
                 * @type {XDocument}
                 */
                self.document = doc;
                //add namespace for MOST extensions
                let element = self.document.selectSingleNode('bpmn2:definitions', DEFAULT_NS);
                if (element) {
                    let prefix = element.lookupPrefix('http://www.themost.io/schemas/bmpn');
                    if (typeof prefix === 'undefined' || prefix == null) {
                        //add namespace attribute
                        element.setAttribute('xmlns:most', 'http://www.themost.io/schemas/bmpn');
                    }
                }
                done();
            });
        }
        catch (err) {
            done(err);
        }
    }
    activity(name, ctor) {
        this._activities[name] = ctor;
    }
    execute(context, done) {
        let self = this;
        try {
            if (typeof self.document === 'undefined')
                done(new Error('The business process definition was not loaded'));
            else {
                let node = self.document.selectSingleNode('bpmn2:definitions/bpmn2:process[1]/bpmn2:startEvent');
                if (node) {
                    //initialize start activity
                    let startActivity = new NativeActivity(node);
                    startActivity.process = self;
                    startActivity.executionState = ActivityExecutionState.Initialized;
                    startActivity.execute(context, done);
                }
                else {
                    done(new Error('Start Event activity cannot be found.'));
                }
            }
        }
        catch (e) {
            done(e);
        }
    }
}

class NativeActivity extends Activity {
    constructor(node) {
        super()
        //set node
        this.node = node;
        let self = this;
        Object.defineProperty(this, 'id', {
            get: function () {
                if (self.node) {
                    return self.node.getAttribute('id');
                }
                return undefined;
            }, configurable: false, enumerable: false
        });
        Object.defineProperty(this, 'name', {
            get: function () {
                if (self.node) {
                    return self.node.getAttribute('name');
                }
                return undefined;
            }, configurable: false, enumerable: false
        });
        let __process;
        Object.defineProperty(this, 'process', {
            get: function () {
                return __process;
            }, set: function (value) {
                __process = value;
            }, configurable: false, enumerable: false
        });
    }
    /**
     * @param {function(Error=, NativeActivity=)} done
     */
    next(done) {
        if (this.node) {
            let nodes = this.node.selectNodes('bpmn2:outgoing/text()', DEFAULT_NS);
            if (nodes.length == 0) {
                done();
            }
            else if (nodes.length == 1) {
                let sequence_id = nodes[0].nodeValue;
                let sequenceNode = this.node.parentNode.selectSingleNode(`bpmn2:sequenceFlow[@id='${sequence_id}']`, DEFAULT_NS);
                let targetRef = sequenceNode.getAttribute('targetRef')
                let targetNode = this.node.parentNode.selectSingleNode(`*[@id='${targetRef}']`, DEFAULT_NS);
                let activityType = targetNode.getAttribute('drools:taskName'), result;
                if (activityType) {
                    let ActivityCtor = this.process.activities_[activityType];
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
    }
    invoke(context, done) {
        done = done || function () { };
        done();
    }
    /**
     *
     * @param {*} context
     * @param {function(Error=,number=)} done
     */
    execute(context, done) {
        let self = this;
        done = done || function () { };
        NativeActivity.super_.prototype.execute.call(self, context, function (err) {
            //update activity node (status and result)
            self.node.setAttribute('most:result', self.resultText().toLowerCase());
            self.node.setAttribute('most:state', self.stateText().toLowerCase());
            if (self.succeeded()) {
                //get next activity if any
                self.next(function (err, nextActivity) {
                    if (err) {
                        done(err);
                    }
                    else if (nextActivity) {
                        nextActivity.executionState = ActivityExecutionState.Initialized;
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
    }
}


class StartEventActivity extends NativeActivity {
    constructor() {
        super();
    }
}


class EndEventActivity extends NativeActivity {
    constructor() {
        super();
    }
}


export {
    NativeProcess,
    NativeActivity,
    StartEventActivity,
    EndEventActivity
};

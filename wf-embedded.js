/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 2014-05-01
 */
var async = require('async'),
    path = require('path'),
    xml = require('most-xml'),
    web = require('most-web'),
    util = require('util'),
    wfTypes = require('./wf-types');
/**
 * @class EmbeddedWorkflowEngine
 * @param {HttpApplication} application
 * @constructor
 * @augments {EventEmitter}
 */
function EmbeddedWorkflowEngine(application) {
    /**
     * Gets or sets the current HTTP application
     * @type {HttpApplication}
     */
    this.application = application;
    /**
     * Gets or sets the in-process interval for workflow searching
     * @type {number}
     */
    this.interval = 30000;
    /**
     * Indicates whether workflow engine is started or not.
     * @type {boolean}
     */
    this.started = false;
}
util.inherits(wfTypes.classes.ActivityEventEmitter, EmbeddedWorkflowEngine);

EmbeddedWorkflowEngine.prototype.start = function() {
    try {
        if (this.started == true)
            return;
        /**
         * @private
         * @type {Object|*|number}
         */
        this.intervalTimer = setInterval(engine_timer, this.interval, this);
        /**
         * @type {boolean}
         */
        this.working = false;
        this.started = true;
    }
    catch(e) {
        throw e;
    }
};

EmbeddedWorkflowEngine.prototype.stop = function() {
    try {
        if (this.started == true)
            return;
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            delete this.intervalTimer;
            this.started = false;
            this.working = false;
        }
    }
    catch(e) {
        throw e;
    }
};
/**
 * Loads and executes a workflow instance.
 * @param {HttpContext} context
 * @param {*} instance
 * @param {function(Error=)} callback
 */
EmbeddedWorkflowEngine.prototype.load = function(context, instance, callback) {
    var self = this,
        bpmn = require('bpmn');
    try {
        callback = callback || function() {};
        if (web.common.isNullOrUndefined(instance)) {
            callback(); return;
        }
        var workflowInstances = context.model('WorkflowInstance'),
            workflowTemplates = context.model('WorkflowTemplate');
        web.common.debug(util.format('Loading workflow instance with ID [%s].', instance.id));
        workflowInstances.where('id').equal(instance.id).silent().flatten().first(function(err, result) {
            if (err) {
                callback(err);
            }
            else {
                if (web.common.isNullOrUndefined(result)) {
                    callback();
                }
                else {
                    //ensure workflow status
                    if (result.status !== 10) {
                        callback();
                        return;
                    }

                    var instance = result, template;
                    web.common.debug(util.format('Processing workflow instance with ID [%s].', instance.id));
                    async.series([
                        /**
                         * Gets instance template
                         * @param {function(Error=)} cb
                         */
                            function(cb) {
                            web.common.debug(util.format('Getting workflow instance [%s] template.', instance.id));
                            workflowTemplates.where('id').equal(result.template).silent().first(function(err, res) {
                                if (err) {
                                    cb(err);
                                }
                                else if (web.common.isNullOrUndefined(res)) {
                                    cb(new Error('The associated workflow template cannot be found for instance with ID ' + result.id));
                                }
                                else {
                                    template = res;
                                    cb();
                                }
                            });
                        },
                        /**
                         * Maps result to workflow instance
                         * @param {function(Error=)} cb
                         */
                            function(cb) {
                            web.common.debug(util.format('Mapping workflow instance [%s].', instance.id));
                            result.additionalType=result.additionalType || 'WorkflowInstance';
                            if (result.additionalType!=='WorkflowInstance') {
                                var instanceModel = context.model(result.additionalType);
                                if (instanceModel===null) {
                                    cb(new Error('Instance model cannot be found'))
                                }
                                else {
                                    instanceModel.where('id').equal(result.id).silent().first(function(err, res) {
                                        if (err) {
                                            cb(err);
                                        }
                                        else if (web.common.isNullOrUndefined(res)) {
                                            cb(new Error('Instance object cannot be found'));
                                        }
                                        else {
                                            instance = res;
                                            cb();
                                        }
                                    })
                                }
                            }
                        },
                        /**
                         * Executes instance
                         * @param {function(Error=)} cb
                         */
                            function(cb) {
                            web.common.debug(util.format('Executing workflow instance [%s].', instance.id));
                            var bpmnPath = path.join(process.cwd(), template.url);
                            web.common.debug(util.format('Loading workflow instance [%s] XML.', instance.id));
                            xml.load(bpmnPath, function(err, bpmnDoc) {
                                try {
                                    if (err) {
                                        web.common.log(err);
                                        cb(new Error('Error loading workflow template XML for ' + template.name));
                                    }
                                    else {
                                        //find start event
                                        var node = bpmnDoc.selectSingleNode('bpmn2:definitions/bpmn2:process/bpmn2:startEvent');
                                        if (node) {
                                            bpmn.createUnmanagedProcess(bpmnPath, function(err, instanceProcess){
                                                try {

                                                    /*instanceProcess._implementation.defaultEventHandler = function(eventType, currentFlowObjectName, handlerName, reason, done) {
                                                        var $this = this,
                                                            processDefinition = $this.getProcessDefinition();
                                                        //get current flow object
                                                        var currentFlowObject = processDefinition.flowObjects.find(function(x) { return x.name === currentFlowObjectName; });
                                                        if (currentFlowObject) {
                                                            if (currentFlowObject.isEndEvent) {
                                                                done();
                                                                return;
                                                            }
                                                        }
                                                        done();
                                                    };*/

                                                    instanceProcess._implementation.onEndHandler = function(currentFlowObjectName, data, done) {
                                                        var $this = this, $context;
                                                        var processDefinition = this.getProcessDefinition();
                                                        var currentFlowObject = processDefinition.flowObjects.find(function(x) { return x.name === currentFlowObjectName; });
                                                        if (currentFlowObject.isEndEvent) {
                                                            //finalize context
                                                            if ($this.instance) {
                                                                /**
                                                                 * @type {HttpContext}
                                                                 */
                                                                $context = $this.instance.context;
                                                                if (data instanceof Error) {
                                                                    //set status to Faulted
                                                                    $this.instance.status = 60; //Faulted
                                                                }
                                                                else {
                                                                    //set status to Succeeded
                                                                    $this.instance.status = 100; //Succeeded
                                                                }
                                                                $this.instance.save($context, function(err) {
                                                                    //and finalize context
                                                                    $context.finalize(function() {
                                                                        done(data);
                                                                    });
                                                                });
                                                                return;
                                                            }
                                                        }
                                                        else if (data instanceof Error) {
                                                            /**
                                                             * @type {HttpContext}
                                                             */
                                                            $context = $this.instance.context;
                                                            $this.instance.status = 60; //Faulted
                                                            $this.instance.save($context, function(err) {
                                                                //try to find error end event (from XML)
                                                                var processNode = bpmnDoc.selectSingleNode("bpmn2:definitions/bpmn2:process[@name='" + processDefinition.name + "']"), endErrorEventNode, targetFlowNode;
                                                                if (processNode) {
                                                                    //select sequence flows
                                                                    var sequenceFlowNodes = processNode.selectNodes("bpmn2:sequenceFlow[@sourceRef='" + currentFlowObject.bpmnId + "']");
                                                                    sequenceFlowNodes.forEach(function(sequenceFlowNode) {
                                                                        if (endErrorEventNode)
                                                                            return;
                                                                        var targetRef = sequenceFlowNode.getAttribute('targetRef');
                                                                        endErrorEventNode = processNode.selectSingleNode("bpmn2:endEvent[@id='" + targetRef + "'][bpmn2:errorEventDefinition]");
                                                                        if (endErrorEventNode)
                                                                            targetFlowNode = sequenceFlowNode;
                                                                    });
                                                                }
                                                                if (endErrorEventNode) {
                                                                    $context.finalize(function() {
                                                                        var sequenceFlowObject = processDefinition.sequenceFlows.find(function(x) {
                                                                            return (x.bpmnId === targetFlowNode.getAttribute('id'));
                                                                        });
                                                                        //check if error end event has a handler defined
                                                                        var errorFlowObject = processDefinition.flowObjects.find(function(x) { return x.bpmnId===sequenceFlowObject.targetRef; });
                                                                        if (errorFlowObject) {
                                                                            if (typeof $this._implementation.eventHandler[errorFlowObject.name] === 'undefined') {
                                                                                $this._implementation.eventHandler[errorFlowObject.name] = function(data, done) {
                                                                                    done(data);
                                                                                }
                                                                            }
                                                                        }
                                                                        $this._implementation.emitTokenAlong(currentFlowObject, sequenceFlowObject, data);
                                                                    });
                                                                }
                                                            });
                                                            return;
                                                        }
                                                        done(data);
                                                    };
                                                    web.current.unattended(function(context) {
                                                        instanceProcess.instance = context.model(instance.additionalType || 'WorkflowInstance').convert(instance);
                                                        instanceProcess.instance.status = 20; //Started
                                                        instanceProcess.instance.save(context, function(err) {
                                                           if (err) {
                                                               context.finalize(function() {
                                                                   cb(err);
                                                               });
                                                           }
                                                            else {
                                                               //trigger start
                                                               instanceProcess.triggerEvent(node.getAttribute('name'));
                                                               cb();
                                                           }
                                                        });

                                                    });
                                                }
                                                catch (e) {
                                                    cb(e);
                                                }
                                            });
                                        }
                                        else {
                                            cb(new Error('Error processing workflow template XML. Process start event cannot be found for template ' + template.name));
                                        }
                                    }
                                }
                                catch (e) {
                                    cb(e);
                                }
                            });
                        }], function(err) {
                        callback(err);
                    });
                }
            }
        });

    }
    catch(e) {
        callback(e);
    }
};

/**
 *
 * @param {EmbeddedWorkflowEngine} self
 */
function engine_timer(self) {
    var resetWorking = function() {
        if (self)
            self.working = false;
    };
    try {
        if (self.working)
            return;
        self.working = true;
        self.application.unattended(function(context) {
            try {
                web.common.debug('Getting workflow instances which have not being started yet.');
                context.model('WorkflowInstance').where('status').equal(10).select('id').take(10, function(err, result) {
                    if (err) {
                        web.common.log(err);
                        context.finalize(resetWorking);
                    }
                    else if (result.length==0) {
                        web.common.debug('There are no pending workflow instances.');
                        context.finalize(resetWorking);
                    }
                    else {
                        web.common.debug(util.format('Executing the collection of the workflow instances (% item(s)).', result.length));
                        async.eachSeries(result, function(instance, cb) {
                            self.load(context, instance, function(err) {
                                if (err) {
                                    web.common.log('An error occured while trying to load workflow instance with ID ' + instance.id);
                                    web.common.log(err);
                                }
                                cb();
                            });
                        }, function(err) {
                            if (err)
                                web.common.log(err);
                            context.finalize(resetWorking);
                        })
                    }

                });
            }
            catch (e) {
                web.common.log(e);
                context.finalize(resetWorking);
            }
        });
    }
    catch(e) {
        web.common.log(e);
        resetWorking();
    }
}
/**
 * @class EmbeddedWorkflowInstanceClient
 * @param {HttpContext} context
 * @param {*} instance
 * @constructor
 */
function EmbeddedWorkflowInstanceClient(context, instance)
{
    this.instance = instance;
    this.context = context;
}

EmbeddedWorkflowInstanceClient.prototype.setStatus = function(status, callback) {
    var self = this;
    try {
        var item = { id:self.instance.id, status:status };
        self.context.model('WorkflowInstance').save(item, function(err) {
            if (err) {
                callback(err);
            }
            else {
                self.instance.status = item.status;
                callback();
            }
        });
    }
    catch (e) {
        callback(e);
    }
};

EmbeddedWorkflowInstanceClient.prototype.writeHistory = function(data, callback) {
    var self = this;
    try {
        data.workflowInstance = self.instance.id;
        data.workflowStatus = self.instance.status;
        self.context.model('WorkflowHistory').save(data, function(err) {
            callback(err);
        });
    }
    catch (e) {
        callback(e);
    }
};

var wfEmbedded = {
    /**
     * @param {HttpApplication} application
     * @returns {EmbeddedWorkflowEngine}
     */
    createEngine: function(application) {
        return new EmbeddedWorkflowEngine(application);
    },
    classes: {
        /**
         * @constructs EmbeddedWorkflowEngine
         */
        EmbeddedWorkflowEngine: EmbeddedWorkflowEngine,
        /**
         * @constructs EmbeddedWorkflowInstance
         */
        EmbeddedWorkflowInstanceClient: EmbeddedWorkflowInstanceClient
    }
};

if (typeof exports !== 'undefined') {
    module.exports = wfEmbedded;
}
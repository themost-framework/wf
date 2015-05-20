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
    types = require('./types');
/**
 * @class EmbeddedProcessEngine
 * @param {HttpApplication} application
 * @constructor
 * @augments {EventEmitter}
 */
function EmbeddedProcessEngine(application) {
    /**
     * Gets or sets the current HTTP application
     * @type {HttpApplication}
     */
    this.application = application;
    /**
     * Gets or sets the in-process interval for business process searching
     * @type {number}
     */
    this.interval = 10000;
    /**
     * Gets or sets the in-process bad execution retries for business processes
     * @type {number}
     */
    this.badExecutionTimes = 4;
    /**
     * Indicates whether workflow engine is started or not.
     * @type {boolean}
     */
    this.started = false;
}
util.inherits(EmbeddedProcessEngine, types.BusinessProcessRuntime);

EmbeddedProcessEngine.prototype.start = function() {
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

EmbeddedProcessEngine.prototype.stop = function() {
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
 * Loads and executes a process instance.
 * @param {HttpContext} context
 * @param {*} instance
 * @param {function(Error=)} callback
 */
EmbeddedProcessEngine.prototype.load = function(context, instance, callback) {
    var self = this,
        bpmn = require('bpmn');
    try {
        callback = callback || function() {};
        if (web.common.isNullOrUndefined(instance)) {
            callback(); return;
        }
        var processInstances = context.model('ProcessInstance'),
            processTemplates = context.model('ProcessTemplate');
        web.common.debug(util.format('Loading business process instance with ID [%s].', instance.id));
        processInstances.where('id').equal(instance.id).silent().flatten().first(function(err, result) {
            if (err) {
                callback(err);
            }
            else {
                if (web.common.isNullOrUndefined(result)) {
                    callback();
                }
                else {
                    //ensure workflow status
                    if (result.status !== types.ActivityExecutionResult.None) {
                        callback();
                        return;
                    }

                    var instance = result, template;
                    web.common.debug(util.format('Processing business process instance with ID [%s].', instance.id));
                    async.series([
                        /**
                         * Gets instance template
                         * @param {function(Error=)} cb
                         */
                            function(cb) {
                            web.common.debug(util.format('Getting business process instance [%s] template.', instance.id));
                            processTemplates.where('id').equal(result.template).silent().first(function(err, res) {
                                if (err) {
                                    cb(err);
                                }
                                else if (web.common.isNullOrUndefined(res)) {
                                    cb(new Error('The associated business process template cannot be found for instance with ID ' + result.id));
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
                            web.common.debug(util.format('Mapping business process instance [%s].', instance.id));
                            result.additionalType=result.additionalType || 'ProcessInstance';
                            if (result.additionalType!=='ProcessInstance') {
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
                            web.common.debug(util.format('Executing business process instance [%s].', instance.id));
                            var bpmnPath = path.join(process.cwd(), template.url);
                            web.common.debug(util.format('Loading business process instance [%s] XML.', instance.id));
                            xml.load(bpmnPath, function(err, bpmnDoc) {
                                try {
                                    if (err) {
                                        web.common.log(err);
                                        cb(new Error('Error loading business process template XML for ' + template.name));
                                    }
                                    else {
                                        //find start event
                                        var node = bpmnDoc.selectSingleNode('bpmn2:definitions/bpmn2:process/bpmn2:startEvent');
                                        if (node) {
                                            bpmn.createUnmanagedProcess(bpmnPath, function(err, instanceProcess){
                                                try {

                                                    /**
                                                     * gets boundary events (customize prototype BPMMNProcessDefinition in order to allow attaching boundary error events)
                                                     * @returns {{}}
                                                     */
                                                    instanceProcess._implementation.processDefinition.boundaryEventsByAttachmentIndex = function() {
                                                        var index = {};
                                                        var self = this;
                                                        var boundaryEvents = this.getBoundaryEvents();
                                                        boundaryEvents.forEach(function(boundaryEvent) {
                                                            var attachedToRef = boundaryEvent.attachedToRef;
                                                            var activity = self.getFlowObject(attachedToRef);
                                                            if (activity) {
                                                                if (activity.isWaitTask) {
                                                                    var entry = index[attachedToRef];
                                                                    if (entry) {
                                                                        entry.push(boundaryEvent);
                                                                    } else {
                                                                        index[attachedToRef] = [boundaryEvent];
                                                                    }
                                                                }
                                                            } else {
                                                                throw new Error("Cannot find the activity the boundary event '" + boundaryEvent.name +
                                                                    "' is attached to (activity BPMN ID: '" + boundaryEvent.attachedToRef + "'.");
                                                            }
                                                        });
                                                        return index;
                                                    };

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
                                                                    $this.instance.status = types.ActivityExecutionResult.Faulted; //Faulted
                                                                }
                                                                else {
                                                                    //set status to Succeeded
                                                                    $this.instance.status = types.ActivityExecutionResult.Succeeded; //Succeeded
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
                                                            $this.instance.status = types.ActivityExecutionResult.Faulted; //Faulted
                                                            $this.instance.save($context, function(err) {
                                                                //get error boundary event
                                                                var boundaryFlowObject = processDefinition.flowObjects.find(function(x) { return (x.isBoundaryEvent) && (x.attachedToRef === currentFlowObject.bpmnId) });
                                                                if (boundaryFlowObject) {
                                                                    var sequenceFlowObject = processDefinition.sequenceFlows.find(function(x) {
                                                                        return (x.sourceRef === boundaryFlowObject.bpmnId);
                                                                    });
                                                                    $this._implementation.emitTokenAlong(currentFlowObject, sequenceFlowObject, data);
                                                                }
                                                            });
                                                            return;
                                                        }
                                                        done(data);
                                                    };
                                                    web.current.unattended(function(context) {
                                                        instanceProcess.instance = context.model(instance.additionalType || 'ProcessInstance').convert(instance);
                                                        instanceProcess.instance.status = types.ActivityExecutionResult.Started; //Started
                                                        instanceProcess.instance.save(context, function(err) {
                                                           if (err) {
                                                               context.finalize(function() {
                                                                   cb(err);
                                                               });
                                                           }
                                                            else {
                                                               //get process definition
                                                               var processDefinition = instanceProcess.getProcessDefinition();
                                                               //find start event
                                                               var startEvent = processDefinition.flowObjects.find(function(x) { return x.isStartEvent; });
                                                               //and trigger start
                                                               if (typeof instanceProcess.instance.target === 'function') {
                                                                   instanceProcess.instance.target(function(err, result) {
                                                                      if (err) {
                                                                          instanceProcess.instance.status = types.ActivityExecutionResult.Faulted;
                                                                          instanceProcess.instance.save(context, function(err) {
                                                                              if (err) {
                                                                                  context.finalize(function () {
                                                                                      cb(err);
                                                                                  });
                                                                              }
                                                                          });
                                                                      }
                                                                       else {
                                                                          //set instance target data
                                                                          instanceProcess.data = result;
                                                                          instanceProcess.triggerEvent(startEvent.name, result);
                                                                      }
                                                                   });
                                                               }
                                                               else {
                                                                   instanceProcess.triggerEvent(startEvent.name);
                                                               }
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
                                            cb(new Error('Error processing business process template XML. Process start event cannot be found for template ' + template.name));
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
 * @param {EmbeddedProcessEngine} self
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
                web.common.debug('Getting process instances which have not being started yet.');
                context.model('ProcessInstance').where('status').equal(types.ActivityExecutionResult.None).and('executionDate').lowerOrEqual(new Date()).silent().select('id').take(10, function(err, result) {
                    if (err) {
                        web.common.log(err);
                        context.finalize(resetWorking);
                    }
                    else if (result.length==0) {
                        web.common.debug('There are no pending business process instances.');
                        context.finalize(resetWorking);
                    }
                    else {
                        web.common.debug(util.format('Executing the collection of the process instances (%s item(s)).', result.length));
                        async.eachSeries(result, function(instance, cb) {
                            self.load(context, instance, function(err) {
                                if (err) {
                                    web.common.log('An error occured while trying to load business process instance with ID ' + instance.id);
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
 * @class EmbeddedProcessInstanceClient
 * @param {HttpContext} context
 * @param {*} instance
 * @constructor
 */
function EmbeddedProcessInstanceClient(context, instance)
{
    this.instance = instance;
    this.context = context;
}

EmbeddedProcessInstanceClient.prototype.setStatus = function(status, callback) {
    var self = this;
    try {
        var item = { id:self.instance.id, status:status };
        self.context.model('ProcessInstance').save(item, function(err) {
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

EmbeddedProcessInstanceClient.prototype.writeHistory = function(data, callback) {
    var self = this;
    try {
        data.ProcessInstance = self.instance.id;
        data.workflowStatus = self.instance.status;
        self.context.model('WorkflowHistory').save(data, function(err) {
            callback(err);
        });
    }
    catch (e) {
        callback(e);
    }
};

var embedded = {
    /**
     * @constructs EmbeddedProcessEngine
     */
    EmbeddedProcessEngine: EmbeddedProcessEngine,
    /**
     * @constructs EmbeddedProcessInstanceClient
     */
    EmbeddedProcessInstanceClient: EmbeddedProcessInstanceClient
};

if (typeof exports !== 'undefined') {
    module.exports = embedded;
}
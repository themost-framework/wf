// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2023, THEMOST LP All rights reserved
const async = require('async');
const path = require('path');
const { XDocument } = require('@themost/xml');
const { BusinessProcessRuntime, ActivityExecutionResult } = require('./types');
const moment = require('moment');

function createLogger() {
    let winston = require('winston'),
        /**
         * @type {{mkdir:Function,mkdirSync}}
         */
        fs = require('fs');
    if (process.env.NODE_ENV==='development') {
        return new winston.createLogger({
            transports: [
                new (winston.transports.Console)({ level: 'debug', json:false, timestamp: function() { return (new Date()).toUTCString(); } })
            ]
        });
    }
    else {
        let logger = new winston.createLogger({
            transports: [
                new (winston.transports.File)({ level: (process.env.NODE_ENV==='development')?'debug':'info',timestamp: function() { return (new Date()).toUTCString(); }, filename: path.join(process.cwd(), 'logs/bpmn.log'), json:false, maxsize:1536000})
            ]
        });
        try {
            fs.mkdirSync(path.join(process.cwd(), 'logs'));
            return logger;
        }
        catch(e) {
            if (e.code!=='EEXIST') {
                console.log('An error occured while creating log directory (/logs/).Process logging is falling to console only logging.');
                return new (winston.Logger)({
                    transports: [
                        new (winston.transports.Console)({ level: (process.env.NODE_ENV==='development')?'debug':'info' })
                    ]
                });
            }
            return logger;
        }
    }
}

/**
 * @class EmbeddedProcessEngine
 * @param {HttpApplication} application
 * @constructor
 * @augments {EventEmitter}
 */
class EmbeddedProcessEngine extends BusinessProcessRuntime {
    constructor(application) {
        super();
        /**
         * Gets or sets the current HTTP application
         * @type {import('@themost/common').ApplicationBase}
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
        /**
         * Gets or sets the number of business processes to be executed on a single execution cycle
         * @type {number}
         */
        this.maxProcesses = 10;

        this.logger = createLogger();
    }
    start() {
        if (this.started == true) {
                return;
        }
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
    /**
     * @param {string} level
     * @param {string} message
     * @param {*=} p1
     * @param {*=} p2
     * @returns {EmbeddedProcessEngine}
     */
    // eslint-disable-next-line no-unused-vars
    log(level, message, p1, p2) {
        try {
            if (this.logger) {
                this.logger.log.apply(this.logger, arguments);
                return this;
            }
        }
        catch (e) {
            //
        }
    }
    stop() {
        if (this.started == true) {
                return;
        }
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            delete this.intervalTimer;
            this.started = false;
            this.working = false;
        }
    }
    /**
     * Loads and executes a process instance.
     * @param {HttpContext} context
     * @param {*} instance
     * @param {function(Error=)} callback
     */
    load(context, instance, callback) {
        let self = this, bpmn = require('bpmn');
        try {
            callback = callback || function () { };
            if (typeof instance === 'undefined' || instance == null) {
                return callback();
            }
            let processInstances = context.model('ProcessInstance'), processTemplates = context.model('ProcessTemplate');
            self.log('debug', 'Loading business process instance with ID [%s].', instance.id);
            processInstances.where('id').equal(instance.id).silent().flatten().first(function (err, result) {
                if (err) {
                    callback(err);
                }
                else {
                    if (typeof result === 'undefined' || result == null) {
                        callback();
                    }
                    else {
                        let instance = result, template;
                        self.log('debug', 'Processing business process instance with ID [%s].', instance.id);
                        async.series([
                            /**
                             * Gets instance template
                             * @param {function(Error=)} cb
                             */
                            function (cb) {
                                self.log('debug', 'Getting business process instance [%s] template.', instance.id);
                                processTemplates.where('id').equal(result.template).silent().first(function (err, res) {
                                    if (err) {
                                        cb(err);
                                    }
                                    else if (typeof res === 'undefined' || res == null) {
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
                            function (cb) {
                                self.log('debug', 'Mapping business process instance [%s].', instance.id);
                                result.additionalType = result.additionalType || 'ProcessInstance';
                                if (result.additionalType !== 'ProcessInstance') {
                                    let instanceModel = context.model(result.additionalType);
                                    if (instanceModel === null) {
                                        cb(new Error('Instance model cannot be found'));
                                    }
                                    else {
                                        instanceModel.where('id').equal(result.id).silent().first(function (err, res) {
                                            if (err) {
                                                cb(err);
                                            }
                                            else if (typeof res === 'undefined' || res == null) {
                                                cb(new Error('Instance object cannot be found'));
                                            }
                                            else {
                                                instance = res;
                                                cb();
                                            }
                                        });
                                    }
                                }
                            },
                            /**
                             * Executes instance
                             * @param {function(Error=)} cb
                             */
                            function (cb) {
                                self.log('debug', 'Executing business process instance [%s].', instance.id);
                                let bpmnPath = path.join(process.cwd(), template.url);
                                self.log('debug', 'Loading business process instance [%s] XML.', instance.id);
                                XDocument.load(bpmnPath, function (err, bpmnDoc) {
                                    try {
                                        if (err) {
                                            self.log('error', err);
                                            cb(new Error('Error loading business process template XML for ' + template.name));
                                        }
                                        else {
                                            //find start event
                                            let ns = [
                                                { prefix: 'bpmn2', uri: 'http://www.omg.org/spec/BPMN/20100524/MODEL' }
                                            ];
                                            let node = bpmnDoc.selectSingleNode('bpmn2:definitions/bpmn2:process/bpmn2:startEvent', ns);
                                            if (node) {
                                                bpmn.createUnmanagedProcess(bpmnPath, function (err, instanceProcess) {
                                                    try {
                                                        /**
                                                         * @param {string} level
                                                         * @param {string} message
                                                         * @param {*=} p1
                                                         * @param {*=} p2
                                                         */
                                                        // eslint-disable-next-line no-unused-vars
                                                        instanceProcess.log = function (level, message, p1, p2) {
                                                            self.log.apply(self, arguments);
                                                        };
                                                        /**
                                                         * gets boundary events (customize prototype BPMMNProcessDefinition in order to allow attaching boundary error events)
                                                         * @returns {{}}
                                                         */
                                                        instanceProcess._implementation.processDefinition.boundaryEventsByAttachmentIndex = function () {
                                                            let index = {};
                                                            let self = this;
                                                            let boundaryEvents = this.getBoundaryEvents();
                                                            boundaryEvents.forEach(function (boundaryEvent) {
                                                                let attachedToRef = boundaryEvent.attachedToRef;
                                                                let activity = self.getFlowObject(attachedToRef);
                                                                if (activity) {
                                                                    if (activity.isWaitTask) {
                                                                        let entry = index[attachedToRef];
                                                                        if (entry) {
                                                                            entry.push(boundaryEvent);
                                                                        } else {
                                                                            index[attachedToRef] = [boundaryEvent];
                                                                        }
                                                                    }
                                                                } else {
                                                                    throw new Error('Cannot find the activity the boundary event \'' + boundaryEvent.name +
                                                                        '\' is attached to (activity BPMN ID: \'' + boundaryEvent.attachedToRef + '\'.');
                                                                }
                                                            });
                                                            return index;
                                                        };

                                                        instanceProcess.meta = function (name, value) {
                                                            let meta = JSON.parse(this.instance['metadata']) || {};
                                                            if (typeof value === 'undefined') {
                                                                return meta[name];
                                                            }
                                                            else {
                                                                meta[name] = value;
                                                                this.instance['metadata'] = JSON.stringify(meta);
                                                                return this;
                                                            }
                                                        };

                                                        instanceProcess._implementation.onBeginHandler = function (currentFlowObjectName, data, done) {
                                                            let processDefinition = this.getProcessDefinition(), currentFlowObject = processDefinition.flowObjects.find(function (x) { return x.name === currentFlowObjectName; });
                                                            //save current executing flow object
                                                            let context = instanceProcess.instance.context, meta = JSON.parse(instanceProcess.instance['metadata']) || {};
                                                            meta.state = meta.state || {};
                                                            meta.state.lastFlowObject = currentFlowObject.bpmnId;
                                                            instanceProcess.instance['metadata'] = JSON.stringify(meta);
                                                            instanceProcess.instance.save(context, function (err) {
                                                                if (err) {
                                                                    done(err);
                                                                }
                                                                else {
                                                                    done(data);
                                                                }
                                                            });
                                                        };

                                                        instanceProcess._implementation.onEndHandler = function (currentFlowObjectName, data, done) {
                                                            let $this = this, $context;
                                                            let processDefinition = this.getProcessDefinition();
                                                            let currentFlowObject = processDefinition.flowObjects.find(function (x) { return x.name === currentFlowObjectName; });
                                                            if (currentFlowObject.isEndEvent) {
                                                                //finalize context
                                                                if ($this.instance) {
                                                                    /**
                                                                     * @type {HttpContext}
                                                                     */
                                                                    $context = $this.instance.context;
                                                                    if (data instanceof Error) {
                                                                        //set status to Faulted
                                                                        $this.instance.status = ActivityExecutionResult.Faulted; //Faulted
                                                                    }
                                                                    else {
                                                                        if ($this.reload) {
                                                                            //set status to Started
                                                                            $this.instance.status = ActivityExecutionResult.None;
                                                                            if ($this.instance.executionDate instanceof Date) {
                                                                                if ($this.instance.executionDate <= (new Date())) {
                                                                                    //execute again in 4 minutes
                                                                                    $this.instance.executionDate = moment().add(4, 'm').toDate();
                                                                                }
                                                                            }
                                                                            else {
                                                                                $this.instance.executionDate = moment().add(4, 'm').toDate();
                                                                            }
                                                                        }
                                                                        else {
                                                                            //set status to Succeeded
                                                                            $this.instance.status = ActivityExecutionResult.Succeeded; //Succeeded
                                                                        }

                                                                    }
                                                                    // eslint-disable-next-line no-unused-vars
                                                                    $this.instance.save($context, function (err) {
                                                                        //and finalize context
                                                                        $context.finalize(function () {
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
                                                                $this.instance.status = ActivityExecutionResult.Faulted; //Faulted
                                                                // eslint-disable-next-line no-unused-vars
                                                                $this.instance.save($context, function (err) {
                                                                    //get error boundary event
                                                                    let boundaryFlowObject = processDefinition.flowObjects.find(function (x) { return (x.isBoundaryEvent) && (x.attachedToRef === currentFlowObject.bpmnId); });
                                                                    if (boundaryFlowObject) {
                                                                        let sequenceFlowObject = processDefinition.sequenceFlows.find(function (x) {
                                                                            return (x.sourceRef === boundaryFlowObject.bpmnId);
                                                                        });
                                                                        $this._implementation.emitTokenAlong(currentFlowObject, sequenceFlowObject, data);
                                                                    }
                                                                });
                                                                return;
                                                            }
                                                            done(data);
                                                        };
                                                        self.application.unattended(function (context) {
                                                            instanceProcess.instance = context.model(instance.additionalType || 'ProcessInstance').convert(instance);
                                                            instanceProcess.instance.status = ActivityExecutionResult.Started; //Started
                                                            instanceProcess.instance.save(context, function (err) {
                                                                if (err) {
                                                                    context.finalize(function () {
                                                                        cb(err);
                                                                    });
                                                                }
                                                                else {
                                                                    //get process definition
                                                                    let processDefinition = instanceProcess.getProcessDefinition();
                                                                    //find start event
                                                                    let startEvent = processDefinition.flowObjects.find(function (x) { return x.isStartEvent; });
                                                                    //and trigger start
                                                                    if (typeof instanceProcess.instance.target === 'function') {
                                                                        instanceProcess.instance.target(function (err, result) {
                                                                            if (err) {
                                                                                instanceProcess.instance.status = ActivityExecutionResult.Faulted;
                                                                                instanceProcess.instance.save(context, function (err) {
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
                            }
                        ], function (err) {
                            callback(err);
                        });
                    }
                }
            });

        }
        catch (e) {
            callback(e);
        }
    }
}

/**
 *
 * @param {EmbeddedProcessEngine} self
 */
function engine_timer(self) {
    let resetWorking = function() {
        if (self)
            self.working = false;
    };
    try {
        if (self.working)
            return;
        self.working = true;
        self.application.unattended(function(context) {
            try {
                self.log('debug','Getting process instances which have not being started yet.');
                let q = context.model('ProcessInstance').where('status').equal(ActivityExecutionResult.None)
                    .or('status').equal(ActivityExecutionResult.Faulted)
                    .or('status').equal(ActivityExecutionResult.Paused)
                    .prepare();
                q.where('badExecutionCount').lowerThan(self.badExecutionTimes)
                    .and('executionDate').lowerOrEqual(new Date()).silent()
                    .orderBy('executionDate')
                    .select('id').take(self.maxProcesses, function(err, result) {
                    if (err) {
                        self.log('error', err);
                        context.finalize(resetWorking);
                    }
                    else if (result.length==0) {
                        self.log('debug','There are no pending business process instances.');
                        context.finalize(resetWorking);
                    }
                    else {
                        self.log('debug','Executing the collection of the process instances (%s item(s)).', result.length);
                        async.eachSeries(result, function(instance, cb) {
                            self.load(context, instance, function(err) {
                                if (err) {
                                    self.log('error','An error occured while trying to load business process instance with ID ' + instance.id);
                                    self.log('error', err);
                                }
                                cb();
                            });
                        }, function(err) {
                            if (err)
                                self.log('error', err);
                            context.finalize(resetWorking);
                        })
                    }

                });
            }
            catch (e) {
                self.log('error', e);
                context.finalize(resetWorking);
            }
        });
    }
    catch(e) {
        self.log('error',e);
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
    let self = this;
    try {
        let item = { id:self.instance.id, status:status };
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
    let self = this;
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

module.exports = {
    EmbeddedProcessEngine,
    EmbeddedProcessInstanceClient
};
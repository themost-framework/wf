// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2023, THEMOST LP All rights reserved
import winston from 'winston';
import { format } from 'logform'
const async = require('async');
const path = require('path');
const { XDocument } = require('@themost/xml');
const { BusinessProcessRuntime, ActivityExecutionResult } = require('./types');
const moment = require('moment');
const bpmn = require('@themost/bpmn');
const fs = require('fs');

function createLogger() {
    const loggerFormat = format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.metadata(),
        format.json(),
      )
    if (process.env.NODE_ENV==='development') {
        return new winston.createLogger({
            format: loggerFormat,
            transports: [
                new (winston.transports.Console)({ level: 'debug', json:false, timestamp: function() { return (new Date()).toUTCString(); } })
            ]
        });
    }
    else {
        let logger = new winston.createLogger({
            format: loggerFormat,
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
                    format: loggerFormat,
                    transports: [
                        new (winston.transports.Console)({ level: (process.env.NODE_ENV==='development')?'debug':'info' })
                    ]
                });
            }
            return logger;
        }
    }
}

function loadDocument(file, callback) {
    fs.readFile(file, 'utf-8', (err, data) => {
        if (err) {
            return callback(err);
        }
        try {
            const document = XDocument.loadXML(data);
            return callback(null, document);
        } catch (err) {
            return callback(err);
        }
    });
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
        if (this.started) {
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
                this.logger.log.apply(this.logger, Array.from(arguments));
                return this;
            }
        }
        catch (e) {
            //
        }
    }
    stop() {
        if (this.started === false) {
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
        const self = this;
        try {
            callback = callback || function () { };
            if (typeof instance === 'undefined' || instance == null) {
                return callback();
            }
            self.log('debug', `Loading business process instance with ID [${instance.id}].`);
            context.model('ProcessInstance').where('id').equal(instance.id).silent().getItem().then(function (result) {
                if (result == null) {
                    return callback();
                }
                let instance = result, template;
                self.log('debug', `Processing business process instance with ID [${instance.id}].`);
                async.series([
                    /**
                     * Gets instance template
                     * @param {function(Error=)} cb
                     */
                    function (cb) {
                        self.log('debug', `Getting business process instance [${instance.id}] template.`);
                        context.model('ProcessTemplate').where('id').equal(result.template.id).silent().getItem().then(function (res) {
                            if (res == null) {
                                return cb(new Error(`The associated business process template cannot be found for instance with ID ${result.id}`));
                            }
                            template = res;
                            return cb();
                        }).catch(function(err) {
                            return cb(err);
                        });
                    },
                    /**
                     * Maps result to workflow instance
                     * @param {function(Error=)} cb
                     */
                    function (cb) {
                        self.log('debug', `Mapping business process instance [${instance.id}]`);
                        let instanceModel = context.model(result.additionalType);
                        instanceModel.where('id').equal(result.id).silent().getItem().then(function (res) {
                            if (res == null) {
                                return cb(new Error('Instance object cannot be found'));
                            }
                            else {
                                instance = res;
                                return cb();
                            }
                        }).catch(function(err) {
                            return cb(err);
                        });
                    },
                    /**
                     * Executes instance
                     * @param {function(Error=)} cb
                     */
                    function (cb) {
                        self.log('debug', `Executing business process instance [${instance.id}].`);
                        let bpmnPath = path.join(process.cwd(), template.url);
                        self.log('debug', `Loading business process instance [${instance.id}] XML.`);
                        loadDocument(bpmnPath, function (err, bpmnDoc) {
                            try {
                                if (err) {
                                    self.log('error', err);
                                    cb(new Error(`Error loading business process template XML for ${template.name}`));
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
                                                    const processDefinition = this.getProcessDefinition(), currentFlowObject = processDefinition.flowObjects.find(function (x) { return x.name === currentFlowObjectName; });
                                                    //save current executing flow object
                                                    const meta = instanceProcess.instance.metadata ? JSON.parse(instanceProcess.instance.metadata) : {};
                                                    meta.state = meta.state || {};
                                                    meta.state.lastFlowObject = currentFlowObject.bpmnId;
                                                    instanceProcess.instance.metadata = JSON.stringify(meta);
                                                    return instanceProcess.instance.save().then(function () {
                                                        return done(data);
                                                    }).catch((err) => {
                                                        return done(err);
                                                    });
                                                };

                                                instanceProcess._implementation.onEndHandler = function (currentFlowObjectName, data, done) {
                                                    const self = this;
                                                    let context;
                                                    const processDefinition = this.getProcessDefinition();
                                                    const currentFlowObject = processDefinition.flowObjects.find(function (x) { return x.name === currentFlowObjectName; });
                                                    if (currentFlowObject.isEndEvent) {
                                                        //finalize context
                                                        if (self.instance) {
                                                            /**
                                                             * @type {HttpContext}
                                                             */
                                                            context = self.instance.context;
                                                            if (data instanceof Error) {
                                                                //set status to Faulted
                                                                self.instance.status = ActivityExecutionResult.Faulted; //Faulted
                                                            }
                                                            else {
                                                                if (self.reload) {
                                                                    //set status to Started
                                                                    self.instance.status = ActivityExecutionResult.None;
                                                                    if (self.instance.executionDate instanceof Date) {
                                                                        if (self.instance.executionDate <= (new Date())) {
                                                                            //execute again in 4 minutes
                                                                            self.instance.executionDate = moment().add(4, 'm').toDate();
                                                                        }
                                                                    }
                                                                    else {
                                                                        self.instance.executionDate = moment().add(4, 'm').toDate();
                                                                    }
                                                                }
                                                                else {
                                                                    //set status to Succeeded
                                                                    self.instance.status = ActivityExecutionResult.Succeeded; //Succeeded
                                                                }

                                                            }
                                                            // eslint-disable-next-line no-unused-vars
                                                            return self.instance.save().then(function () {
                                                                //and finalize context
                                                                return context.finalize(function () {
                                                                    return done(data);
                                                                });
                                                            }).catch(function(err) {
                                                                return done(err);
                                                            });
                                                        }
                                                    } else if (data instanceof Error) {
                                                        /**
                                                         * @type {HttpContext}
                                                         */
                                                        context = self.instance.context;
                                                        self.instance.status = ActivityExecutionResult.Faulted; //Faulted
                                                        // eslint-disable-next-line no-unused-vars
                                                        return self.instance.save().then(function () {
                                                            //get error boundary event
                                                            let boundaryFlowObject = processDefinition.flowObjects.find(function (x) { return (x.isBoundaryEvent) && (x.attachedToRef === currentFlowObject.bpmnId); });
                                                            if (boundaryFlowObject) {
                                                                let sequenceFlowObject = processDefinition.sequenceFlows.find(function (x) {
                                                                    return (x.sourceRef === boundaryFlowObject.bpmnId);
                                                                });
                                                                self._implementation.emitTokenAlong(currentFlowObject, sequenceFlowObject, data);
                                                            }
                                                        }).catch(function(err) {
                                                            return done(err); 
                                                        });
                                                    }
                                                    return done(data);
                                                };
                                                unattendExecution(self.application)(function (context) {
                                                    instanceProcess.instance = context.model(instance.additionalType || 'ProcessInstance').convert(instance);
                                                    instanceProcess.instance.status = ActivityExecutionResult.Started; //Started
                                                    return instanceProcess.instance.save().then(function () {
                                                        //get process definition
                                                        const processDefinition = instanceProcess.getProcessDefinition();
                                                        //find start event
                                                        const startEvent = processDefinition.flowObjects.find(function (x) { return x.isStartEvent; });
                                                        //and trigger start
                                                        if (typeof instanceProcess.instance.target === 'function') {
                                                            return  instanceProcess.instance.target(function (err, result) {
                                                                if (err) {
                                                                    instanceProcess.instance.status = ActivityExecutionResult.Faulted;
                                                                    return instanceProcess.instance.save().then(function () {
                                                                        return cb();
                                                                    }).catch(function(err) {
                                                                        return context.finalize(function () {
                                                                            cb(err);
                                                                        });
                                                                    });
                                                                }
                                                                else {
                                                                    //set instance target data
                                                                    instanceProcess.data = result;
                                                                    instanceProcess.triggerEvent(startEvent.name, result);
                                                                    return cb();
                                                                }
                                                            });
                                                        }
                                                        instanceProcess.triggerEvent(startEvent.name);
                                                        return cb();
                                                    }).catch(function(err) {
                                                        return context.finalize(function () {
                                                            return cb(err);
                                                        });
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
            }).catch(function(err) {
                return callback(err);
            });

        }
        catch (err) {
            return callback(err);
        }
    }
}

/**
 * @param {import('@themost/express').ExpressDataApplication} application
 * @returns {function()}
 */
function unattendExecution(application) {
    /**
     * @type {function(context)}
     */
    return function(func) {
        const context = application.createContext();
        const account = application.getConfiguration().getSourceAt('settings/auth/unattendedExecutionAccount');
        if (account) {
            context.user = {
                name: account,
                authenticationType: 'Basic'
            }
        }
        return func(context);
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
        unattendExecution(self.application)(function(context) {
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
                        self.log('debug',`Executing the collection of the waiting process instances (${result.length} item(s))`);
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
            catch (err) {
                self.log('error', err);
                context.finalize(resetWorking);
            }
        });
    }
    catch(err) {
        self.log('error', err);
        resetWorking();
    }
}
/**
 * @class EmbeddedProcessInstanceClient
 * @param {HttpContext} context
 * @param {*} instance
 * @constructor
 */
class EmbeddedProcessInstanceClient {
    constructor(context, instance) {
        this.instance = instance;
        this.context = context;
    }
    setStatus(status, callback) {
        let self = this;
        try {
            let item = { id: self.instance.id, status: status };
            self.context.model('ProcessInstance').save(item).then(function () {
                self.instance.status = item.status;
                return callback();
            }).catch(function(err) {
                return callback(err);
            });
        }
        catch (err) {
            callback(err);
        }
    }
    writeHistory(data, callback) {
        let self = this;
        try {
            data.ProcessInstance = self.instance.id;
            data.workflowStatus = self.instance.status;
            self.context.model('ProcessLog').save(data).then(function () {
                return callback();
            }).catch(function(err) {
                return callback(err);
            });
        }
        catch (err) {
            return callback(err);
        }
    }
}

export {
    EmbeddedProcessEngine,
    EmbeddedProcessInstanceClient
}
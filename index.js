/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 2015-08-25
 */
var events = require('events'),
    util = require('util'),
    async = require('async'),
    wfEmbedded = require('./wf-embedded'),
    wfTypes = require('./wf-types'),
    web = require('most-web');



/**
 * Enumeration of activity result values that qualifies the state of an Activity that has an ActivityExecutionStatus of Closed.
 * @constructor
 */
function ActivityExecutionResult() {
    //
}
/**
 * The activity is not in the Closed state.
 * @type {number}
 */
ActivityExecutionResult.None = 0;
/**
 * The activity has transitioned to the closed state from the executing state.
 * @type {number}
 */
ActivityExecutionResult.Succeeded = 1;
/**
 * The activity has transitioned to the closed state from the canceling state.
 * @type {number}
 */
ActivityExecutionResult.Canceled = 2;
/**
 * The activity has transitioned to the closed state from the compensating state.
 * @type {number}
 */
ActivityExecutionResult.Compensated = 3;
/**
 * The activity has transitioned to the closed state from the faulting state.
 * @type {number}
 */
ActivityExecutionResult.Faulted = 4;
/**
 * 	The activity has transitioned to the closed state from the initialized state
 * @type {number}
 */
ActivityExecutionResult.Uninitialized = 5;

/**
 * Enumeration of activity status values that correspond to the life cycle of an activity within a running workflow instance.
 * @constructor
 */
function ActivityExecutionStatus() {
    //
}
/**
 * Represents the status when an activity is being initialized.
 * @type {number}
 */
ActivityExecutionStatus.Initialized = 0;
/**
 * Represents the status when an activity is executing.
 * @type {number}
 */
ActivityExecutionStatus.Executing = 1;
/**
 * Represents the status when an activity is in the process of being canceled.
 * @type {number}
 */
ActivityExecutionStatus.Canceling = 2;
/**
 * Represents the status when an activity is closed.
 * @type {number}
 */
ActivityExecutionStatus.Closed = 3;
/**
 * Represents the status when an activity is compensating.
 * @type {number}
 */
ActivityExecutionStatus.Compensating = 4;
/**
 * Represents the status when an activity is faulting.
 * @type {number}
 */
ActivityExecutionStatus.Faulting = 5;
/**
 * @class ActivityStatusChangedEventArgs
 * @constructor
 */
function ActivityStatusChangedEventArgs() {
    /**
     * Gets the ActivityExecutionResult of the Activity that raised the event corresponding to the value when the event occurred.
     * @type {number}
     */
    this.executionResult = 0;
    /**
     * Gets the ActivityExecutionStatus of the Activity that raised the event corresponding to the value when the event occurred.
     * @type {number}
     */
    this.executionStatus = 0;
    /**
     * Gets the Activity that raised the event.
     * @type {null}
     */
    this.activity = null;
    /**
     * Gets the execution error if any.
     * @type {null}
     */
    this.error = null;
}

/**
 * @class Activity
 * @constructor
 * @augments EventEmitter
 */
function Activity() {
    /**
     * Gets the execution result of the last attempt to run this instance.
     * @type {number}
     */
    this.executionResult = ActivityExecutionResult.None;
    /**
     * Gets the current execution status of this instance.
     * @type {number}
     */
    this.executionStatus = ActivityExecutionStatus.Initialized;
    /**
     * Gets or sets a value that indicates whether this instance is enabled for execution and validation.
     * @type {boolean}
     */
    this.enabled = true;
    /**
     * Gets or sets the name of this instance.
     * @type {string}
     */
    this.name = "Activity1";
    /**
     * Gets or sets the user-defined description of the Activity.
     * @type {string}
     */
    this.description = "";
    /**
     * Gets the CompositeActivity that contains this Activity.
     * @type {Activity}
     */
    this.parent = undefined;
    var parent = null;
    Object.defineProperty(this, 'parent', { get: function() {
        return parent;
    }, set: function(value) {
        parent = value;
    }, configurable:false, enumerable:false });
    var self = this;
    /**
     * Gets the type of the activity instance.
     * @type {string}
     */
    this.type = undefined;
    Object.defineProperty(this, 'type', { get: function() {
        return self.__proto__.constructor.name;
    }, configurable:false, enumerable:true });

    /**
     * Gets or sets an object that associates custom data with this class instance.
     * @type {*}
     */
    this.data = null;

}
util.inherits(Activity, wfTypes.classes.ActivityEventEmitter);
/**
 * Initializes the current activity instance.
 * @param {*} context The execution context to associate with this Activity and execution.
 * @param {Function} callback A callback function
 */
Activity.prototype.initialize = function(context, callback) {
    var self = this;
    callback = callback || function() {};
    //raise initialized event (initialized+none)
    self.status(ActivityExecutionStatus.Initialized).result(ActivityExecutionResult.None).raiseEvent('initializing', function() { callback(); });
};

/**
 * Cancels the current activity instance.
 * @param {*} context The execution context to associate with this Activity and execution.
 * @param {Function} callback A callback function
 */
Activity.prototype.cancel = function(context, callback) {
    var self = this;
    callback = callback || function() {};
    //set activity status to ActivityExecutionStatus.Initialized
    self.executionStatus = ActivityExecutionStatus.Canceling;
    //raise event canceling
    self.emit('canceling', { executionStatus:self.executionStatus, executionResult:self.executionResult, activity:self }, function(err) {
        if (err) {
            //raise event (closed+faulted)
            self.status(ActivityExecutionStatus.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function() { callback(); });
        }
        else {
            //raise event (closed+canceled)
            self.status(ActivityExecutionStatus.Closed).result(ActivityExecutionResult.Canceled).raiseEvent('closed', function() { callback(); });
        }
    });
};

Activity.prototype.raiseEvent = function(name, callback) {
    var self = this;
    callback = callback || function() {};
    self.emit(name, { executionStatus:self.executionStatus, executionResult:self.executionResult, activity:self }, function(err) {
        if (err)
            util.log(err);
        callback(err);
    });
};
/**
 * Gets or sets current activity execution status
 * @param {number} executionStatus The execution status
 * @returns {number|Activity}
 */
Activity.prototype.status = function(executionStatus) {
    if (typeof executionStatus === 'undefined')
        return this.executionStatus;
    this.executionStatus = executionStatus;
    return this;
};
/**
 * Gets execution status description
 * @returns {string}
 */
Activity.prototype.statusText = function() {
    switch (this.executionStatus) {
        case 0: return 'Initialized';
        case 1: return 'Executing';
        case 2: return 'Canceling';
        case 3: return 'Closed';
        case 4: return 'Compensating';
        case 5: return 'Faulting';
        default: return 'Unknown';
    }
};
/**
 * Gets execution result description
 * @returns {string}
 */
Activity.prototype.resultText = function() {
    switch (this.executionResult) {
        case 0: return 'None';
        case 1: return 'Succeeded';
        case 2: return 'Canceled';
        case 3: return 'Compensated';
        case 4: return 'Faulted';
        case 5: return 'Uninitialized';
        default: return 'Unknown';
    }
};

/**
 * Gets or sets current activity execution result
 * @param executionResult
 * @returns {number|Activity}
 */
Activity.prototype.result = function(executionResult) {
    if (typeof executionResult === 'undefined')
        return this.executionResult;
    this.executionResult = executionResult;
    return this;
};


/**
 *
 * @param {*} context The execution context to associate with this Activity and execution.
 * @param {Function} callback A callback function
 */
Activity.prototype.execute = function(context, callback) {
    var self = this;
    callback = callback || function() {};
    if (self.executionStatus!=ActivityExecutionStatus.Initialized) {
        //activity cannot be executed while execution status is different than initialized
        callback();
    }
    else {
        //otherwise execute method
        self.status(ActivityExecutionStatus.Executing).raiseEvent('executing', function(err) {
            if (err) {
                self.status(ActivityExecutionStatus.Faulting).emit('faulting', { executionStatus:self.executionStatus, executionResult:self.executionResult, activity:self, error:err },function() {
                    //raise event closed (closed+faulted)
                    self.status(ActivityExecutionStatus.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function() { callback(); });
                });
            }
            else {
                //invoke activity
                if (typeof self.invoke === 'function') {
                    self.invoke(context, function(err) {
                       if (err) {
                           self.status(ActivityExecutionStatus.Faulting).emit('faulting', { executionStatus:self.executionStatus, executionResult:self.executionResult, activity:self, error:err },function() {
                               //raise event closed (closed+faulted)
                               self.status(ActivityExecutionStatus.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function() { callback(); });
                           });
                       }
                        else {
                           //raise event closed (closed+succeeded)
                           self.status(ActivityExecutionStatus.Closed).result(ActivityExecutionResult.Succeeded).raiseEvent('closed', function() { callback(); });
                       }
                    });
                }
                else {
                    //raise event closed (closed+succeeded)
                    self.status(ActivityExecutionStatus.Closed).result(ActivityExecutionResult.Succeeded).raiseEvent('closed', function() { callback(); });
                }
            }
        });
    }
};
/**
 * Abstract method that invokes the current activity instance
 * @param context
 * @param callback
 */
Activity.prototype.invoke = function(context, callback) {
    callback = callback || function() {};
    callback();
}

/**
 * @class CompositeActivity
 * @constructor
 * @augments Activity
 */
function CompositeActivity() {
    /**
     * Gets the object representing the collection of all child activities.
     * @type {Activity[]}
     */
    this.activities = [];
    CompositeActivity.super_.call(this);
}
util.inherits(CompositeActivity, Activity);
/**
 *
 * @param {string} name
 * @return Activity
 */
CompositeActivity.prototype.getActivityByName = function(name) {
    if (typeof name !== 'string')
        return null;
    if (util.isArray(this.activities)) {
        var res = this.activities.filter(function(x) { return x.name==name; });
        if (typeof res[0] === 'undefined')
            return null;
        return res[0];
    }
    return null;
};
/**
 *
 * @param {*} context The execution context to associate with this Activity and execution.
 * @param {Function} callback A callback function
 */
CompositeActivity.prototype.execute = function(context, callback) {
    var self = this;
    if (util.isArray(self.activities)) {
        self.status(ActivityExecutionStatus.Executing).raiseEvent('executing', function(err) {
            if (err) {
                self.emit('faulting', { executionStatus:self.executionStatus, executionResult:self.executionResult, activity:self, error:err },function() {
                    //raise event closed (faulted+closed)
                    self.status(ActivityExecutionStatus.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function() { callback(); });
                });
            }
            async.eachSeries(self.activities, function(activity, cb) {
                activity.execute(context, function(err) {
                    if (activity.executionResult==ActivityExecutionResult.Faulted) {
                        //raise default error for a failed activity
                        cb(new Error('A child activity was failed.'))
                    }
                    else {
                        cb();
                    }
                });
            }, function(err) {
                if (err) {
                    self.emit('faulting', { executionStatus:self.executionStatus, executionResult:self.executionResult, activity:self, error:err },function() {
                        //raise event closed (faulted+closed)
                        self.status(ActivityExecutionStatus.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function() { callback(); });
                    });
                }
                else {
                    //raise event closed (succeeded+closed)
                    self.status(ActivityExecutionStatus.Closed).result(ActivityExecutionResult.Succeeded).raiseEvent('closed', function() { callback(); });
                }
            });
        });
    }
    else {
        //do nothing (finalize execution)
        callback();
    }
};

/**
 * Represents a workflow that executes activities sequentially.
 * @class SequentialWorkflow
 * @constructor
 * @augments CompositeActivity
 */
function SequentialWorkflow() {
    SequentialWorkflow.super_.call(this);
}
util.inherits(SequentialWorkflow, CompositeActivity);

/**
 * Serves as the root container for state machine workflows. Contains event-driven activities and states.
 * @class StateMachineWorkflow
 * @constructor
 * @augments CompositeActivity
 */
function StateMachineWorkflow() {
    //
}
util.inherits(StateMachineWorkflow, CompositeActivity);

/**
 * Represents a workflow that executes activities sequentially.
 * @class WorkflowService
 * @constructor
 * @augments EventEmitter
 */
function WorkflowService() {
    //
}
util.inherits(SequentialWorkflow, wfTypes.classes.ActivityEventEmitter);

var wf = {
    classes: {
        /**
         * @constructs ActivityEventEmiiter
         */
        ActivityEventEmiiter:wfTypes.classes.ActivityEventEmitter,
        /**
         * @constructs ActivityExecutionResult
         */
        ActivityExecutionResult: ActivityExecutionResult,
        /**
         * @constructs ActivityExecutionStatus
         */
        ActivityExecutionStatus: ActivityExecutionStatus,
        /**
         * @constructs Activity
         */
        Activity: Activity,
        /**
         * @constructs CompositeActivity
         */
        CompositeActivity: CompositeActivity,
        /**
         * @constructs SequentialWorkflow
         */
        SequentialWorkflow: SequentialWorkflow,
        /**
         * @constructs WorkflowService
         */
        WorkflowService: WorkflowService
    },
    embedded: {
        /**
         * @constructs EmbeddedWorkflowEngine
         */
        EmbeddedWorkflowEngine: wfEmbedded.classes.EmbeddedWorkflowEngine,
        /**
         * @constructs EmbeddedWorkflowInstanceClient
         */
        EmbeddedWorkflowInstanceClient: wfEmbedded.classes.EmbeddedWorkflowInstanceClient
    }
};

var __currentEmbedded;
/**
 @name wf.embedded#current
 @type EmbeddedWorkflowEngine
 @readonly
 */
Object.defineProperty(wf.embedded, 'current', {
    /**
     * @returns {EmbeddedWorkflowEngine}
     */
    get: function() {
        if (__currentEmbedded) {
            return __currentEmbedded;
        }
        __currentEmbedded = new wfEmbedded.classes.EmbeddedWorkflowEngine(web.current);
        return __currentEmbedded;
    },
    enumerable: false,
    configurable:false
});
if (typeof exports !== 'undefined')
{
    module.exports = wf;
}

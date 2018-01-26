/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2014, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD3-Clause license
 * Date: 2015-05-15
 */
var util = require('util'),
    events = require('events'),
    async = require('async');
/**
 * @class ActivityEventEmitter
 * @augments EventEmitter
 * @constructor
 */
function ActivityEventEmitter() {
    //
}
util.inherits(ActivityEventEmitter, events.EventEmitter);
/**
 * Raises the specified event and executes event listeners as series.
 * @param {String} event The event that is going to be raised.
 * @param {*} args An object that contains the event arguments.
 * @param {Function} callback A callback function to be invoked after the execution.
 */
ActivityEventEmitter.prototype.emit = function(event, args, callback)
{
    var self = this;
    ////example: call super class function
    //EventEmitter2.super_.emit.call(this);
    //ensure callback
    callback = callback || function() {};
    //get listeners
    var listeners = this.listeners(event);
    //validate listeners
    if (listeners.length==0) {
        //exit emitter
        callback.call(self, null);
        return;
    }
    //apply each series
    async.applyEachSeries(listeners, args, function(err) {
        callback.call(self, err);
    });
};

ActivityEventEmitter.prototype.once = function(type, listener) {
    var self = this;
    if (typeof listener !== 'function')
        throw TypeError('listener must be a function');
    var fired = false;
    function g() {
        self.removeListener(type, g);
        if (!fired) {
            fired = true;
            listener.apply(this, arguments);
        }
    }
    g.listener = listener;
    this.on(type, g);
    return this;
};




/**
 * Enumeration of activity result values that qualifies the state of an Activity that has an ActivityExecutionState of Closed.
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
 * 	The activity has transitioned to the executing state from the initialized state
 * @type {number}
 */
ActivityExecutionResult.Started = 6;
/**
 * 	The activity has transitioned to the pausing state from the executing state
 * @type {number}
 */
ActivityExecutionResult.Paused = 7;

/**
 * Enumeration of activity state values that correspond to the life cycle of an activity within a running workflow instance.
 * @constructor
 */
function ActivityExecutionState() {
    //
}
/**
 * Represents the state when an activity is being initialized.
 * @type {number}
 */
ActivityExecutionState.Initialized = 0;
/**
 * Represents the state when an activity is executing.
 * @type {number}
 */
ActivityExecutionState.Executing = 1;
/**
 * Represents the state when an activity is in the process of being canceled.
 * @type {number}
 */
ActivityExecutionState.Canceling = 2;
/**
 * Represents the state when an activity is closed.
 * @type {number}
 */
ActivityExecutionState.Closed = 3;
/**
 * Represents the state when an activity is compensating.
 * @type {number}
 */
ActivityExecutionState.Compensating = 4;
/**
 * Represents the state when an activity is faulting.
 * @type {number}
 */
ActivityExecutionState.Faulting = 5;
/**
 * Represents the state when an activity is pausing.
 * @type {number}
 */
ActivityExecutionState.Pausing = 6;
/**
 * @class ActivityStateChangedEventArgs
 * @constructor
 */
function ActivityStateChangedEventArgs() {
    /**
     * Gets the ActivityExecutionResult of the Activity that raised the event corresponding to the value when the event occurred.
     * @type {number}
     */
    this.executionResult = 0;
    /**
     * Gets the ActivityExecutionState of the Activity that raised the event corresponding to the value when the event occurred.
     * @type {number}
     */
    this.executionState = 0;
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
     * Gets the current execution state of this instance.
     * @type {number}
     */
    this.executionState = ActivityExecutionState.Initialized;
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
util.inherits(Activity, ActivityEventEmitter);
/**
 * Gets a boolean value which indicates whether current activity has been closed or not
 * @returns {boolean}
 */
Activity.prototype.closed = function() {
    return (this.executionState == ActivityExecutionState.Closed);
};

/**
 * Gets a boolean value which indicates whether current activity has been faulted or not
 * @returns {boolean}
 */
Activity.prototype.faulted = function() {
    return (this.executionResult == ActivityExecutionResult.Faulted);
};

/**
 * Gets a boolean value which indicates whether current activity has been succeeded or not
 * @returns {boolean}
 */
Activity.prototype.succeeded = function() {
    return (this.executionResult == ActivityExecutionResult.Succeeded);
};

/**
 * Gets a boolean value which indicates whether current activity has been canceled or not
 * @returns {boolean}
 */
Activity.prototype.canceled = function() {
    return (this.executionResult == ActivityExecutionResult.Canceled);
};
/**
 * Initializes the current activity instance.
 * @param {*} context The execution context to associate with this Activity and execution.
 * @param {Function} callback A callback function
 */
Activity.prototype.initialize = function(context, callback) {
    var self = this;
    callback = callback || function() {};
    //raise initialized event (initialized+none)
    self.state(ActivityExecutionState.Initialized).result(ActivityExecutionResult.None).raiseEvent('initializing', function() { callback(); });
};

/**
 * Cancels the current activity instance.
 * @param {*} context The execution context to associate with this Activity and execution.
 * @param {Function} callback A callback function
 */
Activity.prototype.cancel = function(context, callback) {
    var self = this;
    callback = callback || function() {};
    //set activity state to ActivityExecutionState.Initialized
    self.executionState = ActivityExecutionState.Canceling;
    //raise event canceling
    self.emit('canceling', { executionState:self.executionState, executionResult:self.executionResult, activity:self }, function(err) {
        if (err) {
            //raise event (closed+faulted)
            self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function() { callback(); });
        }
        else {
            //raise event (closed+canceled)
            self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Canceled).raiseEvent('closed', function() { callback(); });
        }
    });
};

Activity.prototype.raiseEvent = function(name, callback) {
    var self = this;
    callback = callback || function() {};
    self.emit(name, { executionState:self.executionState, executionResult:self.executionResult, activity:self }, function(err) {
        if (err)
            util.log(err);
        callback(err);
    });
};
/**
 * Gets or sets current activity execution state
 * @param {number} executionState The execution state
 * @returns {number|Activity}
 */
Activity.prototype.state = function(executionState) {
    if (typeof executionState === 'undefined')
        return this.executionState;
    this.executionState = executionState;
    return this;
};
/**
 * Gets execution state description
 * @returns {string}
 */
Activity.prototype.stateText = function() {
    switch (this.executionState) {
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
 * @param {function(Error=,number=)} callback A callback function
 */
Activity.prototype.execute = function(context, callback) {
    var self = this;
    callback = callback || function() {};
    if (self.executionState!=ActivityExecutionState.Initialized) {
        //activity cannot be executed while execution state is different than initialized
        callback();
    }
    else {
        //otherwise execute method
        self.state(ActivityExecutionState.Executing).raiseEvent('executing', function(err) {
            if (err) {
                self.state(ActivityExecutionState.Faulting).emit('faulting', { executionState:self.executionState, executionResult:self.executionResult, activity:self, error:err },function() {
                    //raise event closed (closed+faulted)
                    self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function() { callback(); });
                });
            }
            else {
                //invoke activity
                if (typeof self.invoke === 'function') {
                    self.invoke(context, function(err) {
                        if (err) {
                            self.state(ActivityExecutionState.Faulting).emit('faulting', { executionState:self.executionState, executionResult:self.executionResult, activity:self, error:err },function() {
                                //raise event closed (closed+faulted)
                                self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function() { callback(); });
                            });
                        }
                        else {
                            //raise event closed (closed+succeeded)
                            self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Succeeded).raiseEvent('closed', function() { callback(); });
                        }
                    });
                }
                else {
                    //raise event closed (closed+succeeded)
                    self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Succeeded).raiseEvent('closed', function() { callback(); });
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
        self.state(ActivityExecutionState.Executing).raiseEvent('executing', function(err) {
            if (err) {
                self.emit('faulting', { executionState:self.executionState, executionResult:self.executionResult, activity:self, error:err },function() {
                    //raise event closed (faulted+closed)
                    self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function() { callback(); });
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
                    self.emit('faulting', { executionState:self.executionState, executionResult:self.executionResult, activity:self, error:err },function() {
                        //raise event closed (faulted+closed)
                        self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function() { callback(); });
                    });
                }
                else {
                    //raise event closed (succeeded+closed)
                    self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Succeeded).raiseEvent('closed', function() { callback(); });
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
 * @class SequentialProcess
 * @constructor
 * @augments CompositeActivity
 */
function SequentialProcess() {
    SequentialProcess.super_.call(this);
}
util.inherits(SequentialProcess, CompositeActivity);

/**
 * Serves as the root container for state machine workflows. Contains event-driven activities and states.
 * @class StateMachineProcess
 * @constructor
 * @augments CompositeActivity
 */
function StateMachineProcess() {
    //
}
util.inherits(StateMachineProcess, CompositeActivity);

/**
 * Represents a business process that executes activities sequentially.
 * @class BusinessProcessService
 * @constructor
 * @augments EventEmitter
 */
function BusinessProcessService() {
    //
}
util.inherits(BusinessProcessService, ActivityEventEmitter);

/**
 * Represents a business process engine.
 * @class BusinessProcessEngine
 * @constructor
 * @augments EventEmitter
 */
function BusinessProcessRuntime() {
    //
}
/**
 * Starts the current business process engine.
 * @param {Function} done
 */
BusinessProcessRuntime.prototype.start = function(done) {
    //
};

/**
 * Stops the current business process engine.
 * @param {Function} done
 */
BusinessProcessRuntime.prototype.stop = function(done) {
    //
};

/**
 * Loads and executes a process instance against this business process engine.
 * @param {*} context
 * @param {*} instance
 * @param {Function} done
 */
BusinessProcessRuntime.prototype.load = function(context, instance, done) {
    //
};

/**
 * Unloads and executes a process instance from the business process engine.
 * @param {*} context
 * @param {*} instance
 * @param {Function<Error?>} done
 */
BusinessProcessRuntime.prototype.unload = function(context, instance, done) {
    //
};

util.inherits(BusinessProcessRuntime, ActivityEventEmitter);

var wfTypes = {
    /**
     * @constructs ActivityExecutionResult
     */
    ActivityExecutionResult: ActivityExecutionResult,
    /**
     * @constructs ActivityExecutionState
     */
    ActivityExecutionState: ActivityExecutionState,
    /**
     * @constructs ActivityEventEmitter
     */
    ActivityEventEmitter: ActivityEventEmitter,
    /**
     * @constructs Activity
     */
    Activity: Activity,
    /**
     * @constructs CompositeActivity
     */
    CompositeActivity: CompositeActivity,
    /**
     * @constructs SequentialProcess
     */
    SequentialProcess: SequentialProcess,
    /**
     * @constructs BusinessProcessService
     */
    BusinessProcessService: BusinessProcessService,
    /**
     * @constructs BusinessProcessRuntime
     */
    BusinessProcessRuntime: BusinessProcessRuntime

};

if (typeof exports !== 'undefined')
{
    module.exports = wfTypes;
}
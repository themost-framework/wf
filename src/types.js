// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2023, THEMOST LP All rights reserved
import { TraceUtils } from '@themost/common';
import { EventEmitter } from 'events';
import { applyEachSeries, eachSeries } from 'async';

class ActivityEventEmitter extends EventEmitter {

    constructor() {
        super()
    }
    /**
     * Raises the specified event and executes event listeners as series.
     * @param {String} event The event that is going to be raised.
     * @param {*} args An object that contains the event arguments.
     * @param {Function} callback A callback function to be invoked after the execution.
     */
    emit(event, args, callback) {
        let self = this;
        ////example: call super class function
        //EventEmitter2.super_.emit.call(this);
        //ensure callback
        callback = callback || function () { };
        //get listeners
        let listeners = this.listeners(event);
        //validate listeners
        if (listeners.length == 0) {
            //exit emitter
            callback.call(self, null);
            return;
        }
        //apply each series
        applyEachSeries(listeners, args, function (err) {
            callback.call(self, err);
        });
    }
    once(type, listener) {
        let self = this;
        if (typeof listener !== 'function')
            throw TypeError('listener must be a function');
        let fired = false;
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
    }
}


/**
 * Enumeration of activity result values that qualifies the state of an Activity that has an ActivityExecutionState of Closed.
 */
class ActivityExecutionResult {
    //
    static None = 1;
    static Succeeded = 2;
    static Cancelled = 3;
    static Compensated = 4;
    static Faulted = 5;
    static Uninitialized = 6;
    static Started = 7;
    static Paused = 8;

}

/**
 * Enumeration of activity state values that correspond to the life cycle of an activity within a running workflow instance.

 */
class ActivityExecutionState {
    static Initialized = 1;
    static Executing = 2;
    static Cancelling = 3;
    static Closed = 4;
    static Compensating = 5;
    static Faulting = 6;
    static Pausing = 7;
}

class ActivityStateChangedEventArgs {
    constructor() {
        /**
         * Gets the ActivityExecutionResult of the Activity that raised the event corresponding to the value when the event occurred.
         * @type {number}
         */
        this.executionResult = ActivityExecutionResult.None;
        /**
         * Gets the ActivityExecutionState of the Activity that raised the event corresponding to the value when the event occurred.
         * @type {number}
         */
        this.executionState = ActivityExecutionState.Initialized;
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
}

class Activity extends EventEmitter {
    constructor() {
        super();
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
        this.name = 'Activity1';
        /**
         * Gets or sets the user-defined description of the Activity.
         * @type {string}
         */
        this.description = '';
        /**
         * Gets the CompositeActivity that contains this Activity.
         * @type {Activity}
         */
        this.parent = undefined;
        let parent = null;
        Object.defineProperty(this, 'parent', {
            get: function () {
                return parent;
            }, set: function (value) {
                parent = value;
            }, configurable: false, enumerable: false
        });
        let self = this;
        /**
         * Gets the type of the activity instance.
         * @type {string}
         */
        this.type = undefined;
        Object.defineProperty(this, 'type', {
            get: function () {
                return self.__proto__.constructor.name;
            }, configurable: false, enumerable: true
        });

        /**
         * Gets or sets an object that associates custom data with this class instance.
         * @type {*}
         */
        this.data = null;

    }
    /**
     * Gets a boolean value which indicates whether current activity has been closed or not
     * @returns {boolean}
     */
    closed() {
        return (this.executionState == ActivityExecutionState.Closed);
    }
    /**
     * Gets a boolean value which indicates whether current activity has been faulted or not
     * @returns {boolean}
     */
    faulted() {
        return (this.executionResult == ActivityExecutionResult.Faulted);
    }
    /**
     * Gets a boolean value which indicates whether current activity has been succeeded or not
     * @returns {boolean}
     */
    succeeded() {
        return (this.executionResult == ActivityExecutionResult.Succeeded);
    }
    /**
     * Gets a boolean value which indicates whether current activity has been canceled or not
     * @returns {boolean}
     */
    cancelled() {
        return (this.executionResult == ActivityExecutionResult.Cancelled);
    }
    /**
     * Initializes the current activity instance.
     * @param {*} context The execution context to associate with this Activity and execution.
     * @param {Function} callback A callback function
     */
    initialize(context, callback) {
        let self = this;
        callback = callback || function () { };
        //raise initialized event (initialized+none)
        self.state(ActivityExecutionState.Initialized).result(ActivityExecutionResult.None).raiseEvent('initializing', function () { callback(); });
    }
    /**
     * Cancels the current activity instance.
     * @param {*} context The execution context to associate with this Activity and execution.
     * @param {Function} callback A callback function
     */
    cancel(context, callback) {
        let self = this;
        callback = callback || function () { };
        //set activity state to ActivityExecutionState.Initialized
        self.executionState = ActivityExecutionState.Canceling;
        //raise event canceling
        self.emit('canceling', { executionState: self.executionState, executionResult: self.executionResult, activity: self }, function (err) {
            if (err) {
                //raise event (closed+faulted)
                self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function () { callback(); });
            }
            else {
                //raise event (closed+canceled)
                self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Cancelled).raiseEvent('closed', function () { callback(); });
            }
        });
    }
    raiseEvent(name, callback) {
        let self = this;
        callback = callback || function () { };
        self.emit(name, { executionState: self.executionState, executionResult: self.executionResult, activity: self }, function (err) {
            if (err) {
                TraceUtils.log(err);
            }
            callback(err);
        });
    }
    /**
     * Gets or sets current activity execution state
     * @param {number} executionState The execution state
     * @returns {number|Activity}
     */
    state(executionState) {
        if (typeof executionState === 'undefined')
            return this.executionState;
        this.executionState = executionState;
        return this;
    }
    /**
     * Gets execution state description
     * @returns {string}
     */
    stateText() {
        switch (this.executionState) {
            case 0: return 'Initialized';
            case 1: return 'Executing';
            case 2: return 'Canceling';
            case 3: return 'Closed';
            case 4: return 'Compensating';
            case 5: return 'Faulting';
            default: return 'Unknown';
        }
    }
    /**
     * Gets execution result description
     * @returns {string}
     */
    resultText() {
        switch (this.executionResult) {
            case 0: return 'None';
            case 1: return 'Succeeded';
            case 2: return 'Cancelled';
            case 3: return 'Compensated';
            case 4: return 'Faulted';
            case 5: return 'Uninitialized';
            default: return 'Unknown';
        }
    }
    /**
     * Gets or sets current activity execution result
     * @param executionResult
     * @returns {number|Activity}
     */
    result(executionResult) {
        if (typeof executionResult === 'undefined')
            return this.executionResult;
        this.executionResult = executionResult;
        return this;
    }
    /**
     *
     * @param {*} context The execution context to associate with this Activity and execution.
     * @param {function(Error=,number=)} callback A callback function
     */
    execute(context, callback) {
        let self = this;
        callback = callback || function () { };
        if (self.executionState != ActivityExecutionState.Initialized) {
            //activity cannot be executed while execution state is different than initialized
            callback();
        }
        else {
            //otherwise execute method
            self.state(ActivityExecutionState.Executing).raiseEvent('executing', function (err) {
                if (err) {
                    self.state(ActivityExecutionState.Faulting).emit('faulting', { executionState: self.executionState, executionResult: self.executionResult, activity: self, error: err }, function () {
                        //raise event closed (closed+faulted)
                        self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function () { callback(); });
                    });
                }
                else {
                    //invoke activity
                    if (typeof self.invoke === 'function') {
                        self.invoke(context, function (err) {
                            if (err) {
                                self.state(ActivityExecutionState.Faulting).emit('faulting', { executionState: self.executionState, executionResult: self.executionResult, activity: self, error: err }, function () {
                                    //raise event closed (closed+faulted)
                                    self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function () { callback(); });
                                });
                            }
                            else {
                                //raise event closed (closed+succeeded)
                                self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Succeeded).raiseEvent('closed', function () { callback(); });
                            }
                        });
                    }
                    else {
                        //raise event closed (closed+succeeded)
                        self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Succeeded).raiseEvent('closed', function () { callback(); });
                    }
                }
            });
        }
    }
    /**
     * Abstract method that invokes the current activity instance
     * @param context
     * @param callback
     */
    invoke(context, callback) {
        callback = callback || function () { };
        callback();
    }
}

class CompositeActivity extends Activity {
    constructor() {
        super();
        /**
         * Gets the object representing the collection of all child activities.
         * @type {Activity[]}
         */
        this.activities = [];
    }
    /**
     *
     * @param {string} name
     * @return Activity
     */
    getActivityByName(name) {
        if (typeof name !== 'string')
            return null;
        if (Array.isArray(this.activities)) {
            let res = this.activities.filter(function (x) { return x.name == name; });
            if (typeof res[0] === 'undefined')
                return null;
            return res[0];
        }
        return null;
    }
    /**
     *
     * @param {*} context The execution context to associate with this Activity and execution.
     * @param {Function} callback A callback function
     */
    execute(context, callback) {
        let self = this;
        if (Array.isArray(self.activities)) {
            self.state(ActivityExecutionState.Executing).raiseEvent('executing', function (err) {
                if (err) {
                    self.emit('faulting', { executionState: self.executionState, executionResult: self.executionResult, activity: self, error: err }, function () {
                        //raise event closed (faulted+closed)
                        self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function () { callback(); });
                    });
                }
                eachSeries(self.activities, function (activity, cb) {
                    // eslint-disable-next-line no-unused-vars
                    activity.execute(context, function (err) {
                        if (activity.executionResult == ActivityExecutionResult.Faulted) {
                            //raise default error for a failed activity
                            cb(new Error('A child activity was failed.'));
                        }
                        else {
                            cb();
                        }
                    });
                }, function (err) {
                    if (err) {
                        self.emit('faulting', { executionState: self.executionState, executionResult: self.executionResult, activity: self, error: err }, function () {
                            //raise event closed (faulted+closed)
                            self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Faulted).raiseEvent('closed', function () { callback(); });
                        });
                    }
                    else {
                        //raise event closed (succeeded+closed)
                        self.state(ActivityExecutionState.Closed).result(ActivityExecutionResult.Succeeded).raiseEvent('closed', function () { callback(); });
                    }
                });
            });
        }
        else {
            //do nothing (finalize execution)
            callback();
        }
    }
}

/**
 * Represents a workflow that executes activities sequentially.
 */
class SequentialProcess extends CompositeActivity {
    constructor() {
        super();
    }
}


/**
 * Serves as the root container for state machine workflows. Contains event-driven activities and states.
 */
class StateMachineProcess extends CompositeActivity {
    constructor() {
        super()
    }
}

/**
 * Represents a business process that executes activities sequentially.
 */
class BusinessProcessService extends EventEmitter {
    constructor() {
        super();
    }
}

/**
 * Represents a business process engine.
 * @class BusinessProcessEngine
 * @constructor
 * @augments EventEmitter
 */
class BusinessProcessRuntime extends EventEmitter {
    constructor() {
        super();
    }
    /**
     * Starts the current business process engine.
     * @param {function(Error=)} done
     */
    // eslint-disable-next-line no-unused-vars
    start(done) {
        //
    }
    /**
     * Stops the current business process engine.
     * @param {function(Error=)} done
     */
    // eslint-disable-next-line no-unused-vars
    stop(done) {
        //
    }
    /**
     * Loads and executes a process instance against this business process engine.
     * @param {*} context
     * @param {*} instance
     * @param {function(Error=)} done
     */
    // eslint-disable-next-line no-unused-vars
    load(context, instance, done) {
        //
    }
    /**
     * Unloads and executes a process instance from the business process engine.
     * @param {*} context
     * @param {*} instance
     * @param {function(Error=)} done
     */
    // eslint-disable-next-line no-unused-vars
    unload(context, instance, done) {
        //
    }
}


export {
    ActivityExecutionResult,
    ActivityStateChangedEventArgs,
    ActivityExecutionState,
    ActivityEventEmitter,
    Activity,
    CompositeActivity,
    SequentialProcess,
    StateMachineProcess,
    BusinessProcessService,
    BusinessProcessRuntime
};
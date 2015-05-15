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
var util = require('util'), events = require('events');
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

var wfTypes = {
    classes: {
        /**
         * @constructs ActivityEventEmitter
         */
        ActivityEventEmitter: ActivityEventEmitter
    }
};

if (typeof exports !== 'undefined')
{
    module.exports = wfTypes;
}
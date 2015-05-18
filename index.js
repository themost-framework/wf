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
    embedded = require('./embedded'),
    types = require('./types'),
    native = require('./native'),
    web = require('most-web');

var wf = {
    types: types,
    native:native,
    embedded: {
        /**
         * @constructs EmbeddedProcessEngine
         */
        EmbeddedProcessEngine: embedded.EmbeddedProcessEngine,
        /**
         * @constructs EmbeddedProcessInstanceClient
         */
        EmbeddedProcessInstanceClient: embedded.EmbeddedProcessInstanceClient
    }
};

var __currentEmbedded;
/**
 @name wf.embedded#current
 @type EmbeddedProcessEngine
 @readonly
 */
Object.defineProperty(wf.embedded, 'current', {
    /**
     * @returns {EmbeddedProcessEngine}
     */
    get: function() {
        if (__currentEmbedded) {
            return __currentEmbedded;
        }
        __currentEmbedded = new embedded.EmbeddedProcessEngine(web.current);
        return __currentEmbedded;
    },
    enumerable: false,
    configurable:false
});
if (typeof exports !== 'undefined')
{
    module.exports = wf;
}

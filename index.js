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
var async = require('async'),
    embedded = require('./embedded'),
    types = require('./types'),
    native = require('./native');

/**
 * @exports most-wf
 */
var wf = { };

/**
 * Creates a new instance of EmbeddedProcessEngine class
 * @param {HttpApplication} app - The target web application
 * @returns {EmbeddedProcessEngine}
 */
wf.createEmbeddedEngine = function(app) {
    return new embedded.EmbeddedProcessEngine(app);
};
wf.types = types;
wf.NativeProcess = native.NativeProcess;
wf.NativeActivity = native.NativeActivity;
wf.StartEventActivity = native.StartEventActivity;
wf.EndEventActivity = native.EndEventActivity;
wf.EmbeddedProcessEngine = embedded.EmbeddedProcessEngine;
wf.EmbeddedProcessInstanceClient= embedded.EmbeddedProcessInstanceClient;

module.exports = wf;

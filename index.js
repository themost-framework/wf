/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
var embedded = require('./embedded');
var types = require('./types');
var native = require('./native');

if (typeof exports !== 'undefined') {
    module.exports.types = types;
    module.exports.NativeProcess = native.NativeProcess;
    module.exports.NativeActivity = native.NativeActivity;
    module.exports.StartEventActivity = native.StartEventActivity;
    module.exports.EndEventActivity = native.EndEventActivity;
    module.exports.EmbeddedProcessEngine = embedded.EmbeddedProcessEngine;
    module.exports.EmbeddedProcessInstanceClient= embedded.EmbeddedProcessInstanceClient;
}


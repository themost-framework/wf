// MOST Web Framework 2.0 Codename Blueshift BSD-3-Clause license Copyright (c) 2017-2023, THEMOST LP All rights reserved
const {EmbeddedProcessEngine, EmbeddedProcessInstanceClient} = require('./embedded');
const types = require('./types');
const {NativeProcess, NativeActivity, StartEventActivity, EndEventActivity} = require('./native');

/**
 * Creates a new instance of EmbeddedProcessEngine class
 * @param {import('@themost/common').ApplicationBase} app - The target web application
 * @returns {EmbeddedProcessEngine}
 */
function createEmbeddedEngine(app) {
    return new EmbeddedProcessEngine(app);
};

module.exports = {
    types,
    createEmbeddedEngine,
    EmbeddedProcessEngine,
    EmbeddedProcessInstanceClient,
    NativeProcess,
    StartEventActivity,
    EndEventActivity
};

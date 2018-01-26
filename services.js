/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
var DataObject = require("@themost/data/data-object").DataObject;
var DataError = require("@themost/common/errors").DataError;
var DataNotFoundError = require("@themost/common/errors").DataNotFoundError;
var DataContext = require("@themost/data/types").DataContext;
var BusinessProcessRuntime = require('./types').BusinessProcessRuntime;
var Q = require('q');
var _ = require('lodash');
var LangUtils = require('@themost/common/utils').LangUtils;
var Args = require('@themost/common/utils').Args;
var Symbol = require('symbol');
var runtimeProperty = Symbol('runtime');
var contextProperty = Symbol('runtime');
var ActionModel = "Action";

/**
 * @class
 * @augments DataObject
 * @constructor
 */
function TypedDataObject(type, obj) {
    TypedDataObject.super_.bind(this)(type, obj);
    /**
     * @property
     * @name TypedDataObject#additionalType
     * @type {string}
     */
    /**
     * @property
     * @name TypedDataObject#sameAs
     * @type {string}
     */
    /**
     * @property
     * @name TypedDataObject#dateCreated
     * @type {Date}
     */
    /**
     * @property
     * @name TypedDataObject#dateModified
     * @type {Date}
     */
    /**
     * @property
     * @name TypedDataObject#createdBy
     * @type {Number|*}
     */
    /**
     * @property
     * @name TypedDataObject#modifiedBy
     * @type {Number|*}
     */
}
LangUtils.inherits(TypedDataObject, DataObject);

/**
 * @class
 * @constructor
 * @param {BusinessProcessRuntime} runtime
 * @param {DataContext} context
 */
function TaskService(runtime, context) {
    Args.check(runtime instanceof BusinessProcessRuntime, new TypeError('Invalid business process runtime argument. Expected an instance of BusinessProcessRuntime class.'));
    this[runtimeProperty] = runtime;
    Args.check(runtime instanceof DataContext, new TypeError('Invalid data context argument. Expected an instance of DataContext class.'));
    this[contextProperty] = context;
}

/**
 * @returns {BusinessProcessRuntime}
 */
TaskService.prototype.getRuntime = function() {
    return this[runtimeProperty];
};

/**
 * @returns {DataContext}
 */
TaskService.prototype.getContext = function() {
    return this[contextProperty];
};

/**
 * Gets a task based on the given id
 * @param {*} id
 * @returns {Promise.<DataObject>}
 */
TaskService.prototype.getTaskById = function(id) {
    return this.getContext().model('Action').where('id').equal(id).getTypedItem();
};

/**
* @param {DataObject|TypedDataObject|*} task
* @returns {Promise}
*/
TaskService.prototype.addTask = function(task) {
    if (task instanceof DataObject) {
        return this.getContext().model(task.getType()).save(task);
    }
    if (task.hasOwnProperty('additionalType')) {
        return this.getContext().model(task.additionalType).save(task);
    }
    return this.getContext().model(ActionModel).save(task);
};

/**
 * @param {*} id
 * @param {string} user
 * @returns {Promise|*}
 */
TaskService.prototype.claim = function(id, user) {
    var self = this;
    if (typeof user !== 'string') {
        return Q.reject(new DataError('Invalid user. Expected string'));
    }
    return self.getContext().model(ActionModel)
        .where('id').equal(id).getTypedItem().then((task) => {
            if (_.isNil(task)) {
                return Q.reject(new DataNotFoundError('Task was not found.'));
            }
            if (_.isNil(task['agent'])) {
                task['agent'] = {
                    "name":user
                };
                return task.save(self.getContext());
            }
            return Q.reject(new DataError('Task has been already claimed.'));
        });
};

if (typeof exports !== 'undefined') {
    module.exports.TaskService  = TaskService;
}
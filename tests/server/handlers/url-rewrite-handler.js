/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import rewrite from 'express-urlrewrite';
import async from 'async';
import _ from 'lodash';
/**
 * @class
 * @abstract
 */
class UrlRewriteConfiguration {
    /**
     * @constructor
     */
    constructor() {
        /**
         * @property
         * @name UrlRewriteConfiguration#src
         * @type {string}
         */
        /**
         * @property
         * @name UrlRewriteConfiguration#dst
         * @type {string}
         */
    }
}

export default class UrlRewriteHandler {
    /**
     *
     * @param {HttpContext} context
     * @param {Function} callback
     */
    beginRequest(context, callback) {
        /**
         *
         * @type {Array.<UrlRewriteConfiguration>|*}
         */
        const rules = context.getApplication().getConfiguration().getSourceAt('rewrite');
        if (_.isArray(rules)) {
            return async.eachSeries(rules, (x, cb) => {
                try {
                    if (x.hasOwnProperty('src') && typeof x.src === 'string') {
                        return rewrite(x.src, x.dst)(context.request, context.response, ()=> {
                            return cb();
                        });
                    }
                    return cb();
                }
                catch(err) {
                    return cb(err);
                }

            }, (err) => {
                return callback(err);
            });
        }
        return callback();
    }
}
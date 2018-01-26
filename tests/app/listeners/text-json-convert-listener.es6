/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import _ from 'lodash';
const resultProperty = "result";
/**
 *
 * @param {DataEventArgs} event
 * @param {Function} callback
 */
export function afterExecute(event, callback) {
    if (event.emitter.query && event.emitter.query.$select) {
        if (_.isArray(event[resultProperty])) {
            _.forEach(event[resultProperty], (x)=> {
               if (x.hasOwnProperty('metadata') && typeof x.metadata === 'string') {
                   x.metadata = JSON.parse(x.metadata);
               }
            });
        }
    }
    return callback();
}
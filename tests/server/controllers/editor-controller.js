/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import HttpBaseController from '@themost/web/controllers/base';
import {httpController, httpAction, httpGet, httpPut, httpPost, httpDelete, httpPatch} from '@themost/web/decorators';
import {ODataModelBuilder} from "@themost/data/odata";
import pluralize from 'pluralize';

/**
 * @class
 * @augments {HttpBaseController}
 */
@httpController()
export default class EditorController extends HttpBaseController {
    constructor() {
        super();
    }

}
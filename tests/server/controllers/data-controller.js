/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import Q from 'q';
import HttpDataController from '@themost/web/controllers/data';
import {httpController, httpAction, httpGet, httpPut, httpPost, httpDelete, httpPatch} from '@themost/web/decorators';
import {ODataModelBuilder} from "@themost/data/odata";
import pluralize from 'pluralize';

@httpController()
export default class DataController extends HttpDataController {
    constructor() {
        super();
        Object.defineProperty(this, 'model', {
            get:()=> {
                if (this.context) {
                    const thisEntitySet = this.getBuilder().getEntitySet(this.context.request.routeData.entitySet || this.context.request.routeData.controller);
                    if (thisEntitySet) {
                        return this.context.model(thisEntitySet.entityType.name);
                    }
                }
            }
        });
    }

    getBuilder() {
        return this.context.getApplication().getService(ODataModelBuilder);
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("index")
    @httpGet()
    getItems() {
        const superIndex = super.index;
        //execute
        return Q.nbind(superIndex,this)();
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("index")
    @httpPost()
    @httpPut()
    postItems() {
        const superIndex = super.index;
        return Q.nbind(superIndex,this)();
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("index")
    @httpDelete()
    deleteItems() {
        const superIndex = super.index;
        return Q.nbind(superIndex,this)();
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("edit")
    @httpGet()
    getItem() {
        const superEdit = super.edit;
        return Q.nbind(superEdit,this)();
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("edit")
    @httpPost()
    @httpPut()
    postItem() {
        const superEdit = super.edit;
        return Q.nbind(superEdit,this)();
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("edit")
    @httpDelete()
    deleteItem() {
        const superRemove = super.remove;
        return Q.nbind(superRemove,this)();
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("association")
    @httpGet()
    getAssociation(id) {
        const superAssociation = super.association;
        //set context params which are required by super action
        this.context.params.model = this.context.params.association;
        this.context.params.parent = id;
        return Q.nbind(superAssociation,this)();
    }

    /**
     * @returns {Promise|*}
     */
    @httpAction("schema")
    @httpGet()
    getSchema(id) {
        const superFunc = super.schema;
        //set pluralize func
        this.context.pluralize = (s)=> {
            return pluralize.plural(s);
        };
        return Q.nbind(superFunc,this)();
    }

}
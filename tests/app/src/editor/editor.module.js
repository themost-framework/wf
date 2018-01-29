/**
 * @license
 * MOST Web Framework 2.0 Codename Blueshift
 * Copyright (c) 2017, THEMOST LP All rights reserved
 *
 * Use of this source code is governed by an BSD-3-Clause license that can be
 * found in the LICENSE file at https://themost.io/license
 */
import angular from "angular";
import 'angular-component';
import uirouter from '@uirouter/angularjs';
import mostModule from '@themost/angularjs/module';
import {editorComponent} from './editor.component';
import {navbarComponent} from "./components/navbar/navbar.component";
import 'angular-component';

//init app module
const editorModule = angular.module('editor', [uirouter, mostModule]);

//app config
editorModule.config(['$contextProvider', function($contextProvider) {
    $contextProvider.defaults.base = "/api/";
    $contextProvider.defaults = {
        "base": "/api/",
        "options": {
            "useMediaTypeExtensions":false
        }
    }
}]);

editorModule.directive('editor', editorComponent);
editorModule.directive('navbar', navbarComponent);

//noinspection JSUnusedGlobalSymbols//
export default editorModule.name;

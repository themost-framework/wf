/**
 * Created by kbarbounakis on 5/17/15.
 */
var wf = require('./../index'),
    path = require('path');
describe('Test Native Processes', function() {
    describe('Native Process', function () {
        it('should load process without error', function (done) {
            var pr = new wf.native.NativeProcess();
            pr.load(path.join(process.cwd(), 'test-process.bpmn'), function(err) {
               if (err) { throw err; }
                pr.execute({}, done);
            });
        });
    });
});


var util = require('util'),
    wf = require('./../index');

function TestActivity1() {
    TestActivity1.super_.call(this);
}
util.inherits(TestActivity1, wf.Activity);

TestActivity1.prototype.invoke = function(context, callback) {
    setTimeout(function() {
        console.log('Test Activity 1');
        callback();
    }, 2000);
};

function TestActivity2() {
    TestActivity2.super_.call(this);
}
util.inherits(TestActivity2, wf.Activity);

TestActivity2.prototype.invoke = function(context, callback) {
    setTimeout(function() {
        console.log('Test Activity 2');
        callback();
    }, 1000);
};


exports.testActivity1 = function(test) {
    /**
     *
     * @type {wf.SequentialWorkflow|SequentialWorkflow}
     */
    var wf1 = new wf.SequentialWorkflow();
    wf1.activities.push(new TestActivity1());
    wf1.activities.push(new TestActivity2());
    wf1.activities.push(new TestActivity1());

    util.log(JSON.stringify(wf1));

    wf1.on('closed', function(e, cb) {
        util.log('Workflow was closed');
        cb();
    }).on('executing', function(e, cb) {
        util.log('Workflow is executing.');
        cb();
    });

    wf1.execute({}, function(err) {
        util.log(util.format('Workflow was completed. Status=%s, Result=%s', wf1.statusText(), wf1.resultText()));
        test.done();
    });

}
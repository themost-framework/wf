const SpecReporter = require('jasmine-spec-reporter').SpecReporter;

// noinspection JSCheckFunctionSignatures
// eslint-disable-next-line no-undef
jasmine.getEnv().addReporter(new SpecReporter({  // add jasmine-spec-reporter
    spec: {
        displayPending: true,
        displayStacktrace: 'raw'
    }
}));
// eslint-disable-next-line no-undef
jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

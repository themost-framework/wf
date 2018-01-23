#### Run tests ####

Use babel-core by passing --require mocha option e.g.:
    
    node_modules/mocha/bin/mocha --require babel-core/register --timeout 0 --ui bdd ./tests/test-common.es6
    
Note: If you try to debug tests in Webstorm you cannot babel-node because of deprecation warning of debug options:
    
    `node --debug` and `node --debug-brk` are invalid. Please use `node --inspect` or `node --inspect-brk` instead

This error is thrown because Webstorm fails to validate babel-node version
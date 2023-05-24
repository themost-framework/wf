require('module-alias/register');
const {addAliases} = require('module-alias');
const path = require('path');
const fs = require('fs');
if (fs.existsSync(path.resolve(process.cwd(), 'jsconfig.json'))) {
    // load configuration
    const jsconfig = require(path.resolve(process.cwd(), 'jsconfig.json'));
    if (jsconfig && jsconfig.compilerOptions && jsconfig.compilerOptions.paths) {
        const paths = jsconfig.compilerOptions.paths;
        addAliases(Object.keys(paths).reduce((obj, key) => {
            Object.defineProperty(obj, key, {
                enumerable: true,
                configurable: true,
                value: path.resolve(process.cwd(), paths[key])
            });
            return obj;
        }, {}));
    }
    
}

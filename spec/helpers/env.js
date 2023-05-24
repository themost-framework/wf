// add default options
if (process && process.env) {
    process.env.NODE_ENV = 'development';
}
// use dotenv for other environment variables
require('dotenv').config();

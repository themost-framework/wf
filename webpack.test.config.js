var webpack = require('webpack');
var path = require('path');
module.exports = {
    entry: {
        'module':'./tests/app/src/app.ts'
    },
    output: {
        filename: './tests/app/src/app.js'
    },
    externals: {
        "angular":"angular"
    },
    devtool: 'eval-source-map',
    resolve: {
        extensions: ['.ts' ]
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin()
    ],
    module: {
        loaders: [
            { test: /\.ts$/, loader: 'ts-loader' }
        ]
    }
};
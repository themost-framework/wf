var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var path = require('path');
module.exports = {
    entry: {
        'editor':'./tests/app/src/editor/editor.js'
    },
    output: {
        path: path.resolve(__dirname,'./tests/server/public/editor/' ),
        filename: '[name].js'
    },
    devtool: 'inline-source-map',
    resolve: {
        extensions: ['.js'],
        modules: ["node_modules"],
        symlinks: false,
        alias: {
            "angular": path.resolve( __dirname, "node_modules/angular")
        }
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './tests/app/src/public/index.html',
            inject: 'body'
        }),
       new webpack.optimize.CommonsChunkPlugin({
            name: 'vendor',
            minChunks: function(module) {
                console.log(module.resource);
                return /node_modules/.test(module.resource);
            }
        })
    ],
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.scss$/,
                use: [{
                    loader: "style-loader"
                }, {
                    loader: "css-loader"
                }, {
                    loader: "sass-loader", query: {sourceMap: true}
                }]
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
                loader: 'file-loader'
            }, {
                test: /\.html$/,
                loader: 'raw-loader'
            }
        ]
    }
};
const path = require('path'); // For directory use
const MinifyPlugin = require("babel-minify-webpack-plugin"); // Babel minify plugin

module.exports = getConfiguration; // The primary webpack config object

function getConfiguration(env) {
    var outFile;
    var plugins = [];
    if (env === 'prod') {
        outFile = 'webjpip.dev'; // Make out file name webjpip.dev if development
        plugins.push(new MinifyPlugin()); // Add minify to plugins list if production
    } else {
        if (env !== 'dev') {
            console.log('Unknown env ' + env + '. Defaults to dev');
        }
        outFile = 'webjpip.dev.debug'; // Make out file name webjpip.dev.debug if development
    }
    
    var entry = {};
    entry[outFile] = './src/webjpip-exports.js'; // Entry is always webjpip-exports.js

    return {
        entry: entry, // Always webjpip-exports.js
        plugins: plugins, // None if development, minify if production
        output: {
            filename: '[name].js', // Output filename 8
            path: __dirname, // Output to project root dir
            library: 'webjpip',
            libraryTarget: 'var', // Trying to make global

            publicPath: "../" // Trying this prop out
        },
        resolve: {
            modules: [
                path.resolve(__dirname, 'vendor', 'pdf.js', 'core'),
                path.resolve(__dirname, 'vendor', 'pdf.js', 'shared'),
                path.resolve(__dirname, 'src', 'api'),
                path.resolve(__dirname, 'src', 'databins'),
                path.resolve(__dirname, 'src', 'image-structures'),
                path.resolve(__dirname, 'src', 'misc'),
                path.resolve(__dirname, 'src', 'parsers'),
                path.resolve(__dirname, 'src', 'protocol'),
                path.resolve(__dirname, 'src', 'quality-layers'),
                path.resolve(__dirname, 'src', 'writers'),
                path.resolve(__dirname, 'demo') // DEMO ATTEMPT
            ]
        },
        module: { rules: [
            {
                test: /\.js$/, // include .js files
                enforce: 'pre', // preload the jshint loader
                exclude: /node_modules|vendor.pdf\.js.core|vendor.pdf\.js.shared/, // Exclude npm modules, and vendor
                use: [ { loader: 'jshint-loader' } ]
            },
            {
                test: [/\.js$/],
                exclude: [/node_modules/],
                loader: 'babel-loader',
                options: { presets: ['es2015'] }
            }
        ] }
    };
}

// Note: there are no plugins used
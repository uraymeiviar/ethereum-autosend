"use strict";

var express     = require("express");
var compression = require('compression');
var expressApp  = express();
expressApp.use(compression());
var webServer   = require('./server/webserver.js');
var config      = require('config');
var chalk       = require('chalk');
var rpc         = require('./server/ethrpc.js');
var accounting  = require('./server/accounting.js');

var logError = chalk.red;
var logWarning = chalk.yellow;
var logInfo = chalk.gray;
var logSuccess = chalk.green;

console.log(logInfo("starting server.."));

var bodyParser = require('body-parser');
expressApp.use(bodyParser.json());       // to support JSON-encoded bodies
expressApp.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));
expressApp.use(bodyParser.text());
expressApp.use(bodyParser.raw());

rpc.init(false, function(){
    webServer.init(expressApp,function(){
        accounting.init(function(){
            rpc.startBlockPooler();
        });
    });
});

process.stdin.resume();

function exitHandler(options, err) {
    if (options.cleanup) {
        console.log(logInfo('clean'));
    }
    if (err) {
        console.log(logError(err.stack));
    }
    if (options.exit) {
        console.log(logWarning('received exit by SIGINT'));
        process.exit();
    }
}

process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
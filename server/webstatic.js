"use strict";
var express = require("express");
var config  = require('config');

module.exports = function(expressApp){
    var webServerStaticPath = '../client';
    if(config.has('webserver.staticPath')){
        webServerStaticPath = config.get('webserver.staticPath');
    }
    expressApp.use('/',express.static(__dirname+'/../'+webServerStaticPath));
    console.log("web server static path : "+__dirname+'/../'+webServerStaticPath)
};
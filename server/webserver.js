"use strict";
var config      = require('config');
var chalk       = require('chalk');
var logError    = chalk.red;
var logSuccess  = chalk.green;

function padHexStr(strval, length){
    var byteLength = length;
    if(length === undefined || length === null || length === 0){
        byteLength = 32;
    }
    var pad = "00".repeat(byteLength);
    if(strval.substring(0,2) === "0x"){
        var trunStrVal = strval.substring(2,strval.length);
        return padHexStr(trunStrVal, length);
    }
    else{
        return "0x"+pad.substring(0,pad.length-strval.length)+strval;
    }
}

module.exports = {
    webServer : null,
    webServerPort : 8080,
    webSocketIo : null,
    webSocket: null,

    initWebsocket: function(httpServer, done){
        var self = this;
        self.webSocketIo = require('socket.io');
        self.webSocket = self.webSocketIo.listen(httpServer);
        self.webSocket.on('connection', function(client){
            var clientAddress = client.request.connection.remoteAddress;
            var clientPort = client.request.connection.remotePort;
            console.log('client connected from ' + clientAddress + ':' + clientPort);
        });
        done();
    },
    init : function(expressApp,done){
        var self = this;

        self.webServer   = require("http").createServer(expressApp);
        console.log('activating web server');
        if(config.has('webserver.port')){
            self.webServerPort = config.get('webserver.port');
        }
        require('./webtemplate')(expressApp);
        require('./webstatic')(expressApp);
        self.webServer.listen(self.webServerPort, function(err){
            if(err){
                logError(err);
                return;
            }
            console.log(logSuccess("server listening  on port: "+self.webServerPort));
            self.initWebsocket(self.webServer,done);
        });
    }
};
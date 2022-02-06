"use strict";
var config      = require('config');
var httpRequest = require('request');
var moment      = require('moment');
var chalk       = require('chalk');

String.prototype.repeat = function(count) {
    if (count < 1) return '';
    var result = '', pattern = this.valueOf();
    while (count > 1) {
        if (count & 1) result += pattern;
        count >>= 1, pattern += pattern;
    }
    return result + pattern;
};

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
    rpcHost : "127.0.0.1",
    rpcPort : 8545,
    rpcBlockPooler : null,
    httpRequestCounter : 0,
    currentBlockNumber : 0,
    currentBlockHeaderHash : "",
    currentBlockSeedHash : "",
    currentBlockTarget : "",
    lastBlockTime : moment(),
    lastBlockDeltaMs : 0,
    nodeIndex :0,
    eventNewBlock : [],

    refreshEthNode : function(cycle){
        var self = this;
        if(self.httpRequestCounter === 0 || cycle === true){
            if(cycle){
                self.nodeIndex++;
            }
            if(config.has('ethNodes')){
                var nodes = config.get('ethNodes');
                if(nodes.length > 0){
                    if(self.nodeIndex >= nodes.length){
                        self.nodeIndex = 0;
                    }
                    if(nodes[self.nodeIndex].hasOwnProperty('ethHost')){
                        self.rpcHost = nodes[self.nodeIndex].ethHost;
                    }
                    if(nodes[self.nodeIndex].hasOwnProperty('ethPort')){
                        self.rpcPort = nodes[self.nodeIndex].ethPort;
                    }
                }
            }
        }
    },

    init : function(cycle, done){
        var self = this;
        self.refreshEthNode(cycle);
        done();
    },

    createHttpRequestMsg : function(method,params){
        var self = this;
        self.refreshEthNode(false);
        self.httpRequestCounter++;
        return {
            url:'http://'+self.rpcHost+":"+self.rpcPort,
            method:"POST",
            json:{
                jsonrpc:"2.0",
                method:method,
                params:params,
                id:self.httpRequestCounter
            }
        };
    },

    getBlockNumber : function(done){
        var self = this;
        httpRequest(self.createHttpRequestMsg("eth_blockNumber",[]),done);
    },

    getCurrentBlockNumber : function(done){
        var self = this;
        done(self.currentBlockNumber);
    },

    getBalance : function(address,done){
        var params = [address, "latest"];
        httpRequest(this.createHttpRequestMsg("eth_getBalance",params),done);
    },

    getGasPrice : function(done){
        httpRequest(this.createHttpRequestMsg("eth_gasPrice",[]),function(err,res,body){
            if(err === null && body !==undefined){
                if(body.hasOwnProperty('result')){
                    var price = parseInt(body.result,16);
                    done(true,price);
                }
                else{
                    done(false,null);
                }
            }
            else{
                done(false,null);
            }
        });
    },

    estimageSendTxGas : function(from, to, wei, done){
        httpRequest(this.createHttpRequestMsg("eth_estimateGas",[{
            from:from,0x4DE23f3f0Fb3318287378AdbdE030cf61714b2f3
            to:to,0x482e43C33891B122D9402FF759A4F1815E279cA7
            value:'0x'+wei.toString(16)
        }]),function(err,res,body){
            if(err === null && body !==undefined){
                if(body.hasOwnProperty('result')){
                    var gas = parseInt(body.result,16);
                    done(true,gas);
                }
                else{
                    done(false,null);
                }
            }
            else{
                done(false,null);
            }
        });
    },

    unlockAccount : function(address, password, duration, done){
        httpRequest(this.createHttpRequestMsg("personal_unlockAccount",[
            address,
            password,
            duration
        ]),function(err,res,body){
            if(err === null && body !==undefined){
                if(body.hasOwnProperty('result')){
                    done(true,body.result);
                }
                else{
                    done(false, body);
                }
            }
            else{
                done(false,err);
            }
        });
    },

    sendTransaction : function(from, to, wei,done){
        var tx = {
            from: from,0x4DE23f3f0Fb3318287378AdbdE030cf61714b2f3
            to: to,0x482e43C33891B122D9402FF759A4F1815E279cA7
            value:"0x"+wei.toString(16)
        };
        this.sendTransactions([tx],done);
    },

    sendTransactionAdv : function(from, to, wei, gas, gasPrice, done){
        var tx = {
            from: from,0x4DE23f3f0Fb3318287378AdbdE030cf61714b2f3
            to: to,0x482e43C33891B122D9402FF759A4F1815E279cA7
            value:"0x"+wei.toString(16),
            gas:"0x"+gas.toString(16),
            gasPrice:"0x"+gasPrice.toString(16)
        };
        this.sendTransactions([tx],done);
    },

    sendTransactions : function(tx,done){
        httpRequest(this.createHttpRequestMsg("eth_sendTransaction",tx),done);
    },

    updateWork : function(done){
        var self = this;
        self.getBlockNumber(function(err, res, body){
            if(body !== undefined && body.hasOwnProperty('result')){
                var blockNumInt = parseInt(body.result,16);
                if(blockNumInt !== self.currentBlockNumber){
                    self.currentBlockNumber = blockNumInt;
                    var now = moment();
                    self.lastBlockDeltaMs = now.diff(self.lastBlockTime,'miliseconds')/1000.0;
                    console.log(chalk.gray("block# "+parseInt(body.result,16)+
                        " dt="+self.lastBlockDeltaMs.toFixed(2)+
                        "secs "));
                    self.lastBlockTime = now;
                    done(true);
                }
                else{
                    done(false);
                }
            }
            else{
                done(false);
            }
        });
    },

    startBlockPooler : function(){
        var self = this;
        if(self.rpcBlockPooler === null){
            var blockPoolingInterval = 500;
            if(config.has('blockPoolingInterval')){
                blockPoolingInterval = config.get('blockPoolingInterval');
            }
            self.rpcBlockPooler = setInterval(function(){
                self.updateWork(function(isNewBlock){
                    if(isNewBlock){
                        for(var newBlockEvNdx in self.eventNewBlock){
                            if(self.eventNewBlock.hasOwnProperty(newBlockEvNdx) && self.eventNewBlock[newBlockEvNdx] !== null){
                                self.eventNewBlock[newBlockEvNdx](self.currentBlockNumber);
                            }
                        }
                    }
                });
            },blockPoolingInterval);
        }
    },

    stopBlockPooler : function(){
        var self = this;
        if(self.rpcBlockPooler !== null){
            clearInterval(self.rpcBlockPooler);
            self.rpcBlockPooler = null;
        }
    }
};

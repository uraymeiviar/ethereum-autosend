"use strict";
var config  = require('config');
var rpc = require('./ethrpc');
var async = require('async');
var chalk = require('chalk');

var logError = chalk.red;
var logWarning = chalk.yellow;
var logInfo = chalk.gray;
var logSuccess = chalk.green;

module.exports = {
    gasPrice : 0,
    processAutoSend: function(from, balance, config, done){
        var self = this;
        var minimal = 0;
        if(config.hasOwnProperty('minimal')){
            minimal = parseInt(config.minimal);
        }
        if( (balance > minimal) && config.hasOwnProperty('to') && (from !== config.to) ){
            rpc.estimageSendTxGas(from,config.to,balance,function(result,gas){
                var gasNeeded = 20000;
                if(result){
                    gasNeeded = gas;
                    console.log(logInfo("gas requirement estimation : "+gasNeeded));
                    console.log(logInfo("estimated transaction cost : "+(gasNeeded*self.gasPrice/1000000000000000000).toFixed(6)));
                }
                var amount = balance - gasNeeded*self.gasPrice;
                rpc.unlockAccount(from,config.password,60,function(result,reason){
                    if(result){
                        rpc.sendTransactionAdv(from, config.to, amount, gasNeeded, self.gasPrice,
                            function(err, res, body){
                                if( err !== null){
                                    console.log(logError("failed to send "+amount+" from:"+from+" to:"+config.to));
                                    console.log(logError("err = "+err));
                                }
                                else{
                                    if(body.hasOwnProperty('error')){
                                        console.log(logError("failed to send "+amount+" from:"+from+" to:"+config.to));
                                        console.log(logError("reply = "+body.error.message));
                                    }
                                    else{
                                        console.log(logSuccess("sent "+amount+" from:"+from+" to:"+config.to));
                                        console.log(logInfo("TX = "+body.result));
                                    }
                                }
                                done();
                            }
                        );
                    }
                    else{
                        console.log(logError("failed to send "+balance+" from:"+from+" to:"+config.to));
                        console.log(logError("reply = "+reason.error.message));
                        done();
                    }
                });
            });
        }
        else{
            done();
        }
    },
    processAccount: function (accountName, accountConfig, done) {
        var self = this;
        rpc.getBalance(accountConfig.accountId,function(err,res,body){
            if((err===null) && (body!==undefined) && body.hasOwnProperty('result')){
                var balance = parseInt(body.result,16);
                var balanceEth = (balance/1000000000000000000).toFixed(6);
                console.log(accountConfig.accountId+" : "+balanceEth+" "+accountName);
                if(accountConfig.hasOwnProperty('autosend')){
                    self.processAutoSend(accountConfig.accountId,balance,accountConfig.autosend, done);
                }
                else{
                    done();
                }
            }
            else{
                done();
            }
        });
    },

    eventNewBlockHandler: function(blockNum){
        var self = this;
        rpc.getGasPrice(function(result,price){
            if(result){
                self.gasPrice = price;
                console.log(logInfo("gas price = "+(price/1000000000000000000).toFixed(9)));
            }
            if(config.has('accounts')){
                var accounts = config.get('accounts');
                async.eachSeries(Object.keys(accounts), function(accountName, callback){
                    self.processAccount(accountName, accounts[accountName], callback);
                });
            }
        });
    },

    init: function (done) {
        var self = this;
        rpc.eventNewBlock.push(function(blockNum){
            self.eventNewBlockHandler(blockNum);
        });
        done();
    }
};
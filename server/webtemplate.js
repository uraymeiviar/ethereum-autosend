"use strict";

var fs      = require('fs');
var path    = require('path');
var config  = require('config');
var templatePath = '../client/templates';
if(config.has('webserver.templatePath')){
    templatePath = '../'+config.get('webserver.templatePath');
}
var webServerStaticPath = '../client';
if(config.has('webserver.staticPath')){
    webServerStaticPath = '../'+config.get('webserver.staticPath');
}
var webServerCachePath = '/';
if(config.has('webserver.staticCacheUrl')){
    webServerCachePath = config.get('webserver.staticCacheUrl');
}

module.exports = function(express){
    var walk = function(dir, done) {
        var results = [];
        fs.readdir(dir, function(err, list) {
            if (err) {
                return done(err);
            }
            var pending = list.length;
            if (!pending) {
                return done(null, results);
            }
            list.forEach(function(file) {
                file = path.resolve(dir, file);
                fs.stat(file, function(err, stat) {
                    if (stat && stat.isDirectory()) {
                        walk(file, function(err, res) {
                            results = results.concat(res);
                            if (!--pending) {
                                done(null, results);
                            }
                        });
                    } else {
                        results.push(file);
                        if (!--pending) {
                            done(null, results);
                        }
                    }
                });
            });
        });
    };

    express.get('/templatelist', function(req, res){
        var rootPath = path.resolve(__dirname+'/'+webServerStaticPath);
        var dirPath = path.resolve(__dirname+'/'+templatePath);

        walk(dirPath, function(err,results){
            for(var i=0 ; i<results.length ; i++){
                results[i] = webServerCachePath+path.relative(rootPath,results[i]);
            }
            res.json(results);
        });
    });
};
const enigma = require('enigma.js');
const WebSocket = require('ws');
const fs = require('fs');
const util = require('util')
// var qrsInteract = require('qrs-interact');
// var request = require('request');
// var restify = require('restify');
var winston = require('winston');
var config = require('config');
var yaml = require('js-yaml');
var later = require('later');



// Set up Winston logger, logging both to console and different disk files
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            name: 'console_log',
            'timestamp': true,
            'colorize': true
        }),
        new (winston.transports.File)({
            name: 'file_info',
            filename: config.get('logDirectory') + '/info.log',
            level: 'info'
        }),
        new (winston.transports.File)({
            name: 'file_verbose',
            filename: config.get('logDirectory') + '/verbose.log',
            level: 'verbose'
        }),
        new (winston.transports.File)({
            name: 'file_error',
            filename: config.get('logDirectory') + '/error.log',
            level: 'error'
        })
    ]
});

// Set default log level
logger.transports.console_log.level = config.get('defaultLogLevel');

logger.log('info', 'Starting Qlik Sense cache warmer.');


// Read certificates
const client = fs.readFileSync(config.get('clientCertPath'));
const client_key = fs.readFileSync(config.get('clientCertKeyPath'));


// Set up enigma.js configuration
const qixSchema = require('enigma.js/schemas/qix/3.2/schema.json');
const configEnigma = {
    schema: qixSchema,
    session: {
        host: config.get('host'),
        port: 4747, // Standard Engine port
        secure: config.get('isSecure'),
        disableCache: true
    },
    createSocket: (url, sessionConfig) => {
        return new WebSocket(url, {
            // ca: rootCert,
            key: client_key,
            cert: client,
            headers: {
                'X-Qlik-User': 'UserDirectory=Internal;UserId=sa_repository'
            },
            rejectUnauthorized: false
        });
    }
}



var schedules = [];

// Load app config doc, or throw exception on error
try {
  var appConfigDoc = yaml.safeLoad(fs.readFileSync('./config/apps.yaml', 'utf8'));
  console.log(appConfigDoc);

  appConfigDoc.apps.forEach(function(appConfig) {
    var sched = later.parse.text(appConfig.freq);
    var t = later.setInterval(function() {loadAppIntoCache(appConfig)}, sched);

    console.log('');
    console.log(appConfig.id);
    console.log(appConfig.freq);
  }, this);

} catch (e) {
  console.log(e);
}



function loadAppIntoCache(appConfig) {
    logger.log('verbose', 'Starting loading of appid ' + appConfig.appId);

    // Load the app specified by appId
    var configEnigma2 = configEnigma;
    configEnigma2.session.host = appConfig.server;

    enigma.getService('qix', configEnigma2).then((qix) => {
        const g = qix.global;

        // Connect to engine
        logger.log('debug', 'Connecting to QIX engine on ' + appConfig.server);


        g.openApp(appConfig.appId).then((app) => {
            logger.log('info', 'App loaded: ' + appConfig.appId);
        })
        .catch(err => {
            // Return error msg
            logger.log('error', 'Error 1: ' + err);
            return;
        })
    })
    .catch(err => {
        // Return error msg
        logger.log('error', 'Error 2 (failed opening Sense app): ' + err);
        return;
    });


}


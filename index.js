const enigma = require('enigma.js');
const WebSocket = require('ws');
const fs = require('fs');
const util = require('util')
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
  console.log('');

  // Loop over all apps in app config file
  appConfigDoc.apps.forEach(function(appConfig) {
    var sched = later.parse.text(appConfig.freq);
    var t = later.setInterval(function() {loadAppIntoCache(appConfig)}, sched);

    // Do an initial caching run for current app
    var sched2 = later.parse.recur().every(5).second();
    var t2 = later.setTimeout(function () {loadAppIntoCache(appConfig)}, sched2);

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

            // Clear all selections
            logger.log('debug', appConfig.appId + ': Clear selections');
            app.clearAll(true);

            // Should we step through all sheets of the app?
            if(appConfig.appStepThroughSheets) {

                logger.log('debug', appConfig.appId + ': Get list of all sheets');
                
                // Create session object and use it to retrieve a list of all sheets in the app. 
                app.createSessionObject({ qInfo: { qType: 'sheetlist' }, qAppObjectListDef: { qType: 'sheet', qData: { 'id': '/cells'} } }).then((listObject) => {
                    listObject.getLayout().then((layout) => {

                        logger.log('debug', appConfig.appId + ': Retrieved list of sheets');
                        layout.qAppObjectList.qItems.forEach( function(sheet) {

                            // Loop over all cells (each chart is a cell on a sheet)
                            sheet.qData.cells.forEach( function(cell) {

                                // Get object reference to chart, based on its name/id
                                app.getObject(cell.name).then( (chartObject) => {

                                    // Getting a chart's layout force a calculation of the chart
                                    chartObject.getLayout().then((chartLayout) => {
                                        
                                        logger.log('debug', 'Chart cached (app=' + appConfig.appId + ', object type=' + chartLayout.qInfo.qType + ', object ID=' + chartLayout.qInfo.qId + ', object=' + chartLayout.title);
                                    })
                                    .catch(err => {
                                        // Return error msg
                                        logger.log('error', 'Error 1: ' + err);
                                        return;
                                    })
                                })
                                .catch(err => {
                                    // Return error msg
                                    logger.log('error', 'Error 2: ' + err);
                                    return;
                                });
                            });
                        });
                    })
                    .catch(err => {
                        // Return error msg
                        logger.log('error', 'Error 3: ' + err);
                        return;
                    });
                });
            }

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

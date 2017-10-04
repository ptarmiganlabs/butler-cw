const enigma = require('enigma.js');
const WebSocket = require('ws');
const fs = require('fs');
const util = require('util')
var winston = require('winston');
var config = require('config');
var yaml = require('js-yaml');
var later = require('later');
var GitHubApi = require('github');
var Promise = require('bluebird');



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

//read QIX schema
const qixSchema = require('enigma.js/schemas/qix/' + config.get('qixVersion') + '/schema.json');
// Read certificates
const client = config.has('clientCertPath') ? fs.readFileSync(config.get('clientCertPath')): null;
const client_key = config.has('clientCertPath') ? fs.readFileSync(config.get('clientCertKeyPath')): null;


// Should per-app config data be read from disk or GitHub?
var appConfigYaml = '';

try {
    if (config.get('appConfig.configSource') == 'disk') {

        appConfigYaml = fs.readFileSync('./config/apps.yaml', 'utf8');
        loadAppConfig(appConfigYaml);

    } else if (config.get('appConfig.configSource') == 'github') {

        var github = new GitHubApi({
            // optional
            debug: true,
            protocol: 'https',
            host: config.get('appConfig.github.host'),
            pathPrefix: '/api/v3',
            headers: {
                'user-agent': 'Qlik-Sense-cache-warmer'
            },
            Promise: Promise,
            followRedirects: false,
            timeout: 5000
        });

        github.authenticate({
            type: 'basic',
            username: config.get('appConfig.github.username'),
            password: config.get('appConfig.github.password')
        })

        github.repos.getContent({
            owner: config.get('appConfig.github.owner'),
            repo: config.get('appConfig.github.repo'),
            path: config.get('appConfig.github.path')
        }).then((res) => {
            console.log('---------------');
            console.log(res);
            console.log('---------------');
            appConfigYaml = Buffer.from(res.data.content, 'base64').toString();
            console.log(appConfigYaml);
            console.log('---------------');

            loadAppConfig(appConfigYaml);
        })
    }
} catch(e) {
    logger.log('error', 'Error while reading app config data: ' + e)
}



function loadAppConfig(appConfig) {
    // Load app config doc, or throw exception on error
    try {

        var appConfigDoc = yaml.safeLoad(appConfigYaml);
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
        logger.log('error', 'Error while reading app config data: ' + e)
    }

}


function loadAppIntoCache(appConfig) {
    logger.log('verbose', 'Starting loading of appid ' + appConfig.appId);

    // Load the app specified by appId
    const configEnigma = {
        schema: qixSchema,
        session: {
            host: appConfig.server,
            port: config.has('clientCertPath') ? 4747 : 4848,  // Engine /Desktop port
            secure: config.get('isSecure'),
            disableCache: true
        },
        createSocket: (url, sessionConfig) => {
            return new WebSocket(url, config.has('clientCertPath') ? {
                // ca: rootCert,
                key: client_key,
                cert: client,
                headers: {
                    'X-Qlik-User': 'UserDirectory=Internal;UserId=sa_repository'
                },
                rejectUnauthorized: false
            } : {});
        }
    };

    enigma.getService('qix', configEnigma).then((qix) => {
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

                var sheetCnt = 0, visCnt = 0;
                logger.log('debug', appConfig.appId + ': Get list of all sheets');
                
                // Create session object and use it to retrieve a list of all sheets in the app. 
                app.createSessionObject({ qInfo: { qType: 'sheetlist' }, qAppObjectListDef: { qType: 'sheet', qData: { 'id': '/cells'} } }).then((listObject) => {
                    listObject.getLayout().then((layout) => {

                        logger.log('debug', appConfig.appId + ': Retrieved list of sheets');
                        layout.qAppObjectList.qItems.forEach( function(sheet) {

                            sheetCnt++;
                            // Loop over all cells (each chart is a cell on a sheet)
                            sheet.qData.cells.forEach( function(cell) {

                                visCnt++;
                                // Get object reference to chart, based on its name/id
                                app.getObject(cell.name).then( (chartObject) => {

                                    // Getting a chart's layout force a calculation of the chart
                                    chartObject.getLayout().then((chartLayout) => {
                                        
                                        logger.log('debug', 'Chart cached (app=' + appConfig.appId + ', object type=' + chartLayout.qInfo.qType + ', object ID=' + chartLayout.qInfo.qId + ', object=' + chartLayout.title);
                                    })
                                    .catch(err => {
                                        // Return error msg
                                        logger.log('error', 'getLayout error: ' + JSON.stringify(err));
                                        return;
                                    })
                                })
                                .catch(err => {
                                    // Return error msg
                                    logger.log('error', 'getObject error: ' + JSON.stringify(err));
                                    return;
                                });
                            });
                        });
                        logger.log('info', 'Cached ' + visCnt + ' visualizations on ' + sheetCnt + ' sheets.');
                    })
                    .catch(err => {
                        // Return error msg
                        logger.log('error', 'sheetlist error: ' + JSON.stringify(err));
                        return;
                    });
                });
            }

        })
        .catch(err => {
            // Return error msg
            logger.log('error', 'openApp error: ' + JSON.stringify(err));
            return;
        })
    })
    .catch(err => {
        // Return error msg
        logger.log('error', 'enigma error: ' + JSON.stringify(err));
        return;
    });

}

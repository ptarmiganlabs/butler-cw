const enigma = require('enigma.js');
const SenseUtilities = require('enigma.js/sense-utilities');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const dockerHealthCheckServer = require('fastify')({ logger: false });

// const util = require('util');
var config = require('config');
var yaml = require('js-yaml');
var later = require('later');
var GitHubApi = require('@octokit/rest');
var winston = require('winston');

require('winston-daily-rotate-file');
const heartbeat = require('./heartbeat.js');
const serviceUptime = require('./service_uptime');

// Get app version from package.json file
var appVersion = require('./package.json').version;

// Set up logger with timestamps and colors, and optional logging to disk file
const logTransports = [];

logTransports.push(
    new winston.transports.Console({
        name: 'console',
        level: config.get('logLevel'),
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
        ),
    }),
);

if (config.get('fileLogging')) {
    logTransports.push(
        new winston.transports.DailyRotateFile({
            // dirname: path.join(__dirname, config.get('logDirectory')),
            dirname: path.join(__dirname, 'log'),
            filename: 'butler-cw.%DATE%.log',
            level: config.get('logLevel'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
        }),
    );
}

logger = winston.createLogger({
    transports: logTransports,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
    ),
});

// Function to get current logging level
getLoggingLevel = () => {
    return logTransports.find(transport => {
        return transport.name == 'console';
    }).level;
};

var appConfigYaml = '';
var schema;
var rootCert;
var client;
var client_key;

async function mainScript() {

    logger.info('--------------------------------------');
    logger.info('Starting Butler CW.');
    logger.info(`Log level is: ${getLoggingLevel()}`);
    logger.info(`App version is: ${appVersion}`);
    logger.info('--------------------------------------');

    // Read QIX schema
    schema = require(`enigma.js/schemas/${config.get('qixVersion')}.json`);

    // Read certificates
    rootCert = config.has('clientCertCAPath')
        ? fs.readFileSync(config.get('clientCertCAPath'))
        : null;
    client = config.has('clientCertPath') ? fs.readFileSync(config.get('clientCertPath')) : null;
    client_key = config.has('clientCertKeyPath')
        ? fs.readFileSync(config.get('clientCertKeyPath'))
        : null;

    // Start Docker healthcheck REST server on port set in config file
    if (config.get('dockerHealthCheck.enabled') == true) {
        try {
            logger.verbose('MAIN: Starting Docker healthcheck server...');

            // Use http://localhost:12398/health as Docker healthcheck URL
            // Create restServer object
            dockerHealthCheckServer.register(require('fastify-healthcheck'));
            await dockerHealthCheckServer.listen(
                config.get('dockerHealthCheck.port')
            );

            logger.info(
                `MAIN: Started Docker healthcheck server on port ${config.get('dockerHealthCheck.port')}.`
            );
        } catch (err) {
            globals.logger.error(
                `MAIN: Error while starting Docker healthcheck server on port ${config.get('dockerHealthCheck.port')}.`
            );
            dockerHealthCheckServer.log.error(err);
            process.exit(1);
        }

    }

    // Set up heartbeats, if enabled in the config file
    if (config.get('heartbeat.enabled') == true) {
        heartbeat.setupHeartbeatTimer(config, logger);
    }

    // Set up uptime logging
    if (config.get('uptimeMonitor.enabled') == true) {
        serviceUptime.serviceUptimeStart(config, logger);
    }

    try {
        if (config.get('appConfig.configSource') == 'disk') {
            appConfigYaml = fs.readFileSync('./config/apps.yaml', 'utf8');
            loadAppConfig(appConfigYaml);
        } else if (config.get('appConfig.configSource') == 'github') {
            var github = new GitHubApi({
                // optional
                // debug: true,
                // protocol: 'https',
                // host: config.get('appConfig.github.host'),
                // pathPrefix: '/api/v3',
                headers: {
                    'user-agent': 'Qlik-Sense-cache-warmer',
                },
                // custom GitHub Enterprise URL
                baseUrl: 'https://api.github.com',

                // Promise: Promise,
                // followRedirects: false,
                timeout: 5000,
            });

            github.authenticate({
                type: 'basic',
                username: config.get('appConfig.github.username'),
                password: config.get('appConfig.github.password'),
            });

            github.repos
                .getContent({
                    owner: config.get('appConfig.github.owner'),
                    repo: config.get('appConfig.github.repo'),
                    path: config.get('appConfig.github.path'),
                })
                .then(res => {
                    appConfigYaml = Buffer.from(res.data.content, 'base64').toString();
                    logger.log('debug', 'apps config loaded from GitHub: ');
                    logger.log('debug', appConfigYaml);

                    loadAppConfig(appConfigYaml);
                });
        }
    } catch (e) {
        logger.log('error', 'Error while reading app config data: ' + e);
    }
}


function loadAppConfig(appConfig) {
    // Load app config doc, or throw exception on error
    try {
        var appConfigDoc = yaml.load(appConfigYaml);
        logger.log(
            'debug',
            'Loading app config using following config:\n ' + JSON.stringify(appConfigDoc, null, 2),
        );

        // Loop over all apps in app config file
        appConfigDoc.apps.forEach(function (appConfig) {
            var sched = later.parse.text(appConfig.freq);
            var t = later.setInterval(function () {
                loadAppIntoCache(appConfig);
            }, sched);

            // Do an initial caching run for current app
            var sched2 = later.parse.recur().every(5).second();
            var t2 = later.setTimeout(function () {
                loadAppIntoCache(appConfig);
            }, sched2);
        }, this);
    } catch (e) {
        logger.log('error', 'Error while reading app config data: ' + e);
    }
}

async function loadAppIntoCache(appConfig) {
    logger.log('verbose', 'Starting loading of appid ' + appConfig.appId);

    // Load the app specified by appId
    const urlConfig = {
        host: appConfig.server,
        port: config.has('clientCertPath') ? 4747 : 4848, // Engine /Desktop port
        appId: appConfig.appId,
        secure: config.get('isSecure'),
    };

    const configEnigma = {
        // qixSchema,
        schema,
        url: SenseUtilities.buildUrl(urlConfig),
        createSocket: url =>
            new WebSocket(url, {
                ca: rootCert,
                key: client_key,
                cert: client,
                headers: {
                    'X-Qlik-User': 'UserDirectory=Internal;UserId=sa_repository',
                },
                rejectUnauthorized: false,
            }),
    };
    logger.log('debug', 'DEBUG SenseUtilities: ' + SenseUtilities.buildUrl(urlConfig));

    const s = enigma.create(configEnigma);

    try {
        global = await s.open();
    } catch (err) {
        logger.log('error', 'enigmaOpen error: ' + JSON.stringify(err));
        return;
    }

    const g = global;

    // Open document/app
    logger.log('debug', 'Connecting to QIX engine on ' + appConfig.server);

    let app;

    try {
        app = await g.openDoc(appConfig.appId);
        logger.log('info', 'App loaded: ' + appConfig.appId);
    } catch (err) {
        logger.log('error', 'openDoc error: ' + JSON.stringify(err));
        return;
    }

    // Clear all selections
    try {
        let a = await app.clearAll(true);
        logger.log('debug', appConfig.appId + ': Clear selections');
    } catch (err) {
        logger.log('error', 'clearAll error: ' + JSON.stringify(err));
        return;
    }

    // Should we step through all sheets of the app?
    if (appConfig.appStepThroughSheets) {
        var sheetCnt = 0,
            visCnt = 0;
        logger.log('debug', appConfig.appId + ': Get list of all sheets');

        // Create session object and use it to retrieve a list of all sheets in the app.
        let listObject = await app.createSessionObject({
            qInfo: {
                qType: 'sheetlist',
            },
            qAppObjectListDef: {
                qType: 'sheet',
                qData: {
                    id: '/cells',
                },
            },
        });

        layout = await listObject.getLayout();

        let promises = [];
        logger.log('debug', appConfig.appId + ': Retrieved list of sheets');
        layout.qAppObjectList.qItems.forEach(function (sheet) {
            sheetCnt++;
            // Loop over all cells (each chart is a cell on a sheet)
            sheet.qData.cells.forEach(function (cell) {
                visCnt++;
                // Get object reference to chart, based on its name/id
                promises.push(
                    app
                        .getObject(cell.name)
                        .then(chartObject => {
                            // Getting a chart's layout force a calculation of the chart
                            return chartObject
                                .getLayout()
                                .then(chartLayout => {
                                    logger.log(
                                        'debug',
                                        'Chart cached (app=' +
                                        appConfig.appId +
                                        ', object type=' +
                                        chartLayout.qInfo.qType +
                                        ', object ID=' +
                                        chartLayout.qInfo.qId +
                                        ', object=' +
                                        chartLayout.title,
                                    );
                                })
                                .catch(err => {
                                    // Return error msg
                                    logger.log('error', 'getLayout error: ' + JSON.stringify(err));
                                    return;
                                });
                        })
                        .catch(err => {
                            // Return error msg
                            logger.log('error', 'getObject error: ' + JSON.stringify(err));
                            return;
                        }),
                );
            });
        });

        Promise.all(promises).then(function () {
            app.session.close();
            logger.log(
                'info',
                `App ${appConfig.appId}: Cached ${visCnt} visualizations on ${sheetCnt} sheets.`,
            );
            // logger.log('verbose', `Heap used: ${formatter.format(process.memoryUsage().heapUsed)}`);
        });
    } else {
        app.session.close();
        // logger.log('verbose', `Heap used: ${formatter.format(process.memoryUsage().heapUsed)}`);
    }
}

mainScript();
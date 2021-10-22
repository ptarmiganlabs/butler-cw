const enigma = require('enigma.js');
const SenseUtilities = require('enigma.js/sense-utilities');
const WebSocket = require('ws');
const fs = require('fs');
const dockerHealthCheckServer = require('fastify')({ logger: false });
const yaml = require('js-yaml');
const later = require('@breejs/later');
const GitHubApi = require('@octokit/rest');
const mqtt = require('mqtt');

const globals = require('./globals');
const heartbeat = require('./heartbeat');
const serviceUptime = require('./service_uptime');

let appConfigYaml = '';
let schema;
let rootCert;
let client;
let clientKey;
let mqttClient;

async function loadAppIntoCache(appConfig) {
    globals.logger.log('verbose', `Starting loading of appid ${appConfig.appId}`);

    // Load the app specified by appId
    const urlConfig = {
        host: appConfig.server,
        port: globals.config.has('clientCertPath') ? 4747 : 4848, // Engine /Desktop port
        appId: appConfig.appId,
        secure: globals.config.get('isSecure'),
    };

    const configEnigma = {
        // qixSchema,
        schema,
        url: SenseUtilities.buildUrl(urlConfig),
        createSocket: (url) =>
            new WebSocket(url, {
                ca: rootCert,
                key: clientKey,
                cert: client,
                headers: {
                    'X-Qlik-User': 'UserDirectory=Internal;UserId=sa_repository',
                },
                rejectUnauthorized: false,
            }),
    };
    globals.logger.log('debug', `DEBUG SenseUtilities: ${SenseUtilities.buildUrl(urlConfig)}`);

    const s = enigma.create(configEnigma);
    let g;

    try {
        g = await s.open();
    } catch (err) {
        globals.logger.log('error', `enigmaOpen error: ${JSON.stringify(err)}`);
        return;
    }

    // Open document/app
    globals.logger.log('debug', `Connecting to QIX engine on ${appConfig.server}`);

    let app;

    try {
        app = await g.openDoc(appConfig.appId);
        globals.logger.log('info', `App loaded: ${appConfig.appId}`);
    } catch (err) {
        globals.logger.log('error', `openDoc error: ${JSON.stringify(err)}`);
        return;
    }

    // Clear all selections
    try {
        await app.clearAll(true);
        globals.logger.log('debug', `${appConfig.appId}: Clear selections`);
    } catch (err) {
        globals.logger.log('error', `clearAll error: ${JSON.stringify(err)}`);
        return;
    }

    // Should we step through all sheets of the app?
    if (appConfig.appStepThroughSheets) {
        let sheetCnt = 0;
        let visCnt = 0;
        globals.logger.log('debug', `${appConfig.appId}: Get list of all sheets`);

        // Create session object and use it to retrieve a list of all sheets in the app.
        const listObject = await app.createSessionObject({
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

        const layout = await listObject.getLayout();

        const promises = [];
        globals.logger.log('debug', `${appConfig.appId}: Retrieved list of sheets`);
        layout.qAppObjectList.qItems.forEach((sheet) => {
            sheetCnt += 1;
            // Loop over all cells (each chart is a cell on a sheet)
            sheet.qData.cells.forEach((cell) => {
                visCnt += 1;
                // Get object reference to chart, based on its name/id
                promises.push(
                    app
                        .getObject(cell.name)
                        .then((chartObject) =>
                            // Getting a chart's layout force a calculation of the chart
                            chartObject
                                .getLayout()
                                .then((chartLayout) => {
                                    globals.logger.log(
                                        'debug',
                                        `Chart cached (app=${appConfig.appId}, object type=${chartLayout.qInfo.qType}, object ID=${chartLayout.qInfo.qId}, object=${chartLayout.title}`
                                    );
                                })
                                .catch((err) => {
                                    // Return error msg
                                    globals.logger.log(
                                        'error',
                                        `getLayout error: ${JSON.stringify(err)}`
                                    );
                                })
                        )
                        .catch((err) => {
                            // Return error msg
                            globals.logger.log('error', `getObject error: ${JSON.stringify(err)}`);
                        })
                );
            });
        });

        Promise.all(promises).then(() => {
            app.session.close();
            globals.logger.log(
                'info',
                `App ${appConfig.appId}: Cached ${visCnt} visualizations on ${sheetCnt} sheets.`
            );

            const sched = later.parse.text(appConfig.freq);
            const occurrence = later.schedule(sched).next();
            let nextRun;

            if (globals.config.get('mqttConfig.out.tzFormat').toLowerCase() === 'local') {
                // Use local timezone
                nextRun = occurrence.toString();
            } else {
                nextRun = occurrence.toUTCString();
            }

            // eslint-disable-next-line no-param-reassign
            appConfig.nextRun = nextRun;
            mqttClient.publish(
                globals.config.get('mqttConfig.out.baseTopic'),
                JSON.stringify(appConfig)
            );
        });
    } else {
        app.session.close();
    }
}

function loadAppConfig(appConfig) {
    // Load app config doc, or throw exception on error
    try {
        const appConfigDoc = yaml.load(appConfig);
        globals.logger.debug(
            `Loading app config using following config:\n ${JSON.stringify(appConfigDoc, null, 2)}`
        );

        // Loop over all apps in app config file
        // eslint-disable-next-line no-restricted-syntax
        for (const doc of appConfigDoc.apps) {
            const sched = later.parse.text(doc.freq);

            if (
                globals.config.has('scheduler.startup.showPerAppSchedule.enable') &&
                globals.config.has('scheduler.startup.showPerAppSchedule.itemCount') &&
                globals.config.get('scheduler.startup.showPerAppSchedule.enable') === true
            ) {
                const showItemCount = globals.config.get(
                    'scheduler.startup.showPerAppSchedule.itemCount'
                );
                const s = later.schedule(sched);
                const occurrences = s.next(showItemCount);

                globals.logger.info(
                    '-------------------------------------------------------------------------'
                );
                globals.logger.info(`First runs for app ${doc.appId}, "${doc.appDescription}": `);
                // eslint-disable-next-line no-plusplus
                for (let i = 0; i < showItemCount; i++) {
                    if (
                        globals.config.has('scheduler.timeZone.logs') &&
                        globals.config.get('scheduler.timeZone.logs').toLowerCase() === 'local'
                    ) {
                        globals.logger.info(`${i + 1}: ${occurrences[i]}`);
                    } else {
                        const utcString = occurrences[i].toUTCString();
                        globals.logger.info(`${i + 1}: ${utcString}`);
                    }
                }
            }

            later.setInterval(() => {
                loadAppIntoCache(doc);
            }, sched);

            // Do an initial caching run for current app?
            if (doc.doInitialLoad === true) {
                setTimeout(() => {
                    globals.logger.info(
                        `Starting: initial warming of app ${doc.appId}, "${doc.appDescription}"`
                    );
                    loadAppIntoCache(doc);
                    globals.logger.info(
                        `Done: initial warming of app ${doc.appId}, "${doc.appDescription}"`
                    );
                }, 5000);
            }
        }
    } catch (e) {
        globals.logger.log('error', `Error while reading app config data: ${e}`);
    }
}

async function mainScript() {
    globals.logger.info('--------------------------------------');
    globals.logger.info('Starting Butler CW.');
    globals.logger.info(`Log level is: ${globals.getLoggingLevel()}`);
    globals.logger.info(`App version is: ${globals.appVersion}`);
    globals.logger.info('--------------------------------------');

    // Read QIX schema
    const enigmaPath = `enigma.js/schemas/${globals.config.get('qixVersion')}.json`;
    // eslint-disable-next-line global-require, import/no-dynamic-require
    schema = require(enigmaPath);

    // Read certificates
    rootCert = globals.config.has('clientCertCAPath')
        ? fs.readFileSync(globals.config.get('clientCertCAPath'))
        : null;
    client = globals.config.has('clientCertPath')
        ? fs.readFileSync(globals.config.get('clientCertPath'))
        : null;
    clientKey = globals.config.has('clientCertKeyPath')
        ? fs.readFileSync(globals.config.get('clientCertKeyPath'))
        : null;

    // Start Docker healthcheck REST server on port set in config file
    if (globals.config.get('dockerHealthCheck.enabled') === true) {
        try {
            globals.logger.verbose('MAIN: Starting Docker healthcheck server...');

            // Use http://localhost:12398/health as Docker healthcheck URL
            // Create restServer object
            // eslint-disable-next-line global-require
            dockerHealthCheckServer.register(require('fastify-healthcheck'));
            await dockerHealthCheckServer.listen(globals.config.get('dockerHealthCheck.port'));

            globals.logger.info(
                `MAIN: Started Docker healthcheck server on port ${globals.config.get(
                    'dockerHealthCheck.port'
                )}.`
            );
        } catch (err) {
            globals.logger.error(
                `MAIN: Error while starting Docker healthcheck server on port ${globals.config.get(
                    'dockerHealthCheck.port'
                )}.`
            );
            dockerHealthCheckServer.log.error(err);
            process.exit(1);
        }
    }

    // Set up heartbeats, if enabled in the config file
    if (globals.config.get('heartbeat.enabled') === true) {
        heartbeat.setupHeartbeatTimer(globals.config);
    }

    // Set up uptime logging
    if (globals.config.get('uptimeMonitor.enabled') === true) {
        serviceUptime.serviceUptimeStart(globals.config);
    }

    // Set up UTC/local time zone
    if (globals.config.has('scheduler.timeZone.scheduleDefine')) {
        const tz = globals.config.get('scheduler.timeZone.scheduleDefine');
        if (tz.toLowerCase() === 'local') {
            later.date.localTime();
        } else {
            later.date.UTC();
        }
    } else {
        later.date.UTC();
    }

    // Set up outgoing MQTT
    if (
        globals.config.has('mqttConfig.out.enable') &&
        globals.config.get('mqttConfig.out.enable') === true
    ) {
        mqttClient = mqtt.connect(globals.config.get('mqttConfig.broker.uri'));
    }

    // Load cache warming config
    try {
        if (globals.config.get('appConfig.configSource') === 'disk') {
            appConfigYaml = fs.readFileSync(globals.config.get('appConfig.diskConfigFile'), 'utf8');
            loadAppConfig(appConfigYaml);
        } else if (globals.config.get('appConfig.configSource') === 'github') {
            const github = new GitHubApi({
                // optional
                // debug: true,
                // protocol: 'https',
                // host: globals.config.get('appConfig.github.host'),
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
                username: globals.config.get('appConfig.github.username'),
                password: globals.config.get('appConfig.github.password'),
            });

            github.repos
                .getContent({
                    owner: globals.config.get('appConfig.github.owner'),
                    repo: globals.config.get('appConfig.github.repo'),
                    path: globals.config.get('appConfig.github.path'),
                })
                .then((res) => {
                    appConfigYaml = Buffer.from(res.data.content, 'base64').toString();
                    globals.logger.log('debug', 'apps config loaded from GitHub: ');
                    globals.logger.log('debug', appConfigYaml);

                    loadAppConfig(appConfigYaml);
                });
        }
    } catch (e) {
        globals.logger.log('error', `Error while reading app config data: ${e}`);
    }
}

mainScript();

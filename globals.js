const winston = require('winston');
require('winston-daily-rotate-file');
const upath = require('upath');
const { Command, Option } = require('commander');
const fs = require('fs-extra');

// Get app version from package.json file
const appVersion = require('./package.json').version;

function checkFileExistsSync(filepath) {
    let flag = true;
    try {
        fs.accessSync(filepath, fs.constants.F_OK);
    } catch (e) {
        flag = false;
    }
    return flag;
}

// Command line parameters
const program = new Command();
program
    .version(appVersion)
    .name('butler-cw')
    .description(
        'Butler CW makes sure that the most important apps are always loaded in your Qlik Sense Enterprise on Windows environment.\nCW = Cache Warming, i.e. the  process of proactively forcing Sense apps to be loaded into RAM memory.'
    )
    .option('-c, --config-file <file>', 'Path to config file')
    .addOption(
        new Option('-l, --log-level <level>', 'log level').choices([
            'error',
            'warn',
            'info',
            'verbose',
            'debug',
            'silly',
        ])
    )
    .option('-c, --app-config-file <file>', 'Path to config file with cache warming definitions');

// Parse command line params
program.parse(process.argv);
const options = program.opts();

// Is there a config file specified on the command line?
let configFileOption;
let configFileExpanded;
let configFilePath;
let configFileBasename;
let configFileExtension;
if (options.configFile && options.configFile.length > 0) {
    configFileOption = options.configFile;
    configFileExpanded = upath.resolve(options.configFile);
    configFilePath = upath.dirname(configFileExpanded);
    configFileExtension = upath.extname(configFileExpanded);
    configFileBasename = upath.basename(configFileExpanded, configFileExtension);

    console.log(`Config file option value: ${configFileExpanded}`);
    console.log(`Config file, full path & file: ${configFileExpanded}`);
    console.log(`Config file path: ${configFilePath}`);
    console.log(`Config file name: ${configFileBasename}`);
    console.log(`Config file extension: ${configFileExtension}`);

    if (configFileExtension.toLowerCase() !== '.yaml') {
        // eslint-disable-next-line no-console
        console.log('Error: Main config file extension must be yaml');
        process.exit(1);
    }

    if (checkFileExistsSync(configFileExpanded)) {
        process.env.NODE_CONFIG_DIR = configFilePath;
        process.env.NODE_ENV = configFileBasename;
    } else {
        // eslint-disable-next-line no-console
        console.log(`Error: Specified config file "${configFileExpanded}" does not exist`);
        process.exit(1);
    }
}

// Load main config file
// eslint-disable-next-line import/order
const config = require('config');

// Is there an app cache warming config file specified on the command line?
let appConfigFileOption;
let appConfigFileExpanded;
let appConfigFilePath;
let appConfigFileBasename;
let appConfigFileExtension;
if (options.appConfigFile && options.appConfigFile.length > 0) {
    appConfigFileOption = options.appConfigFile;
    appConfigFileExpanded = upath.resolve(options.appConfigFile);
    appConfigFilePath = upath.dirname(appConfigFileExpanded);
    appConfigFileExtension = upath.extname(appConfigFileExpanded);
    appConfigFileBasename = upath.basename(appConfigFileExpanded, appConfigFileExtension);

    console.log(`App config file option value: ${appConfigFileExpanded}`);
    console.log(`App config file, full path & file: ${appConfigFileExpanded}`);
    console.log(`App config file path: ${appConfigFilePath}`);
    console.log(`App config file name: ${appConfigFileBasename}`);
    console.log(`App config file extension: ${appConfigFileExtension}`);

    if (appConfigFileExtension.toLowerCase() !== '.yaml') {
        // eslint-disable-next-line no-console
        console.log('Error: Cache warming config file extension must be yaml');
        process.exit(1);
    }

    if (checkFileExistsSync(appConfigFileExpanded)) {
        config.appConfig.diskConfigFile = appConfigFileExpanded;
    } else {
        // eslint-disable-next-line no-console
        console.log(`Error: Specified app config file "${appConfigFileExpanded}" does not exist`);
        process.exit(1);
    }
}

// Are we running as standalone app or not?
const isPkg = typeof process.pkg !== 'undefined';
if (isPkg && configFileOption === undefined) {
    // Show help if running as standalone app and mandatory options (e.g. config file) are not specified
    program.help({ error: true });
}


// Is there a log level file specified on the command line?
if (options.logLevel && options.logLevel.length > 0) {
    config.logLevel = options.logLevel;
}

// Set up logger with timestamps and colors, and optional logging to disk file
const logTransports = [];

logTransports.push(
    new winston.transports.Console({
        name: 'console',
        level: config.get('logLevel'),
        format: winston.format.combine(
            winston.format.errors({ stack: true }),
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
        ),
    })
);

const execPath = isPkg ? upath.dirname(process.execPath) : __dirname;

if (config.get('fileLogging')) {
    logTransports.push(
        new winston.transports.DailyRotateFile({
            // dirname: path.join(__dirname, config.get('logDirectory')),
            dirname: upath.join(execPath, 'log'),
            filename: 'butler-cw.%DATE%.log',
            level: config.get('logLevel'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d',
        })
    );
}

const logger = winston.createLogger({
    transports: logTransports,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
});

// Function to get current logging level
const getLoggingLevel = () => logTransports.find((transport) => transport.name === 'console').level;

// Are we running as standalone app or not?
logger.verbose(`Running as standalone app: ${isPkg}`);

module.exports = {
    config,
    logger,
    getLoggingLevel,
    appVersion,
};

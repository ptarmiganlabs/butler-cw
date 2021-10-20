const config = require('config');
const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

// Get app version from package.json file
const appVersion = require('./package.json').version;

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
            winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
        ),
    })
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

module.exports = {
    config,
    logger,
    getLoggingLevel,
    appVersion,
};

const later = require('later');
const axios = require('axios');
const globals = require('./globals');

const callRemoteURL = (remoteURL) => {
    axios
        .get(remoteURL)
        // eslint-disable-next-line no-unused-vars
        .then((response) => {
            // handle success
            globals.logger.debug(`HEARTBEAT: Sent heartbeat to ${remoteURL}`);
        })
        .catch((error) => {
            // handle error
            globals.logger.error(`HEARTBEAT: Error sending heartbeat: ${error}`);
        });
};

function setupHeartbeatTimer(config) {
    try {
        globals.logger.debug(
            `HEARTBEAT: Setting up heartbeat to remote: ${config.get('heartbeat.remoteURL')}`
        );

        const sched = later.parse.text(config.get('heartbeat.frequency'));
        later.setInterval(() => {
            callRemoteURL(config.get('heartbeat.remoteURL'));
        }, sched);

        // Do an initial ping to the remote URL
        callRemoteURL(config.get('heartbeat.remoteURL'));
    } catch (err) {
        globals.logger.error(`HEARTBEAT: Error ${err}`);
    }
}

module.exports = {
    setupHeartbeatTimer,
};

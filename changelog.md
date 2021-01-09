# Change log

## 2.3.2

- Dependencies updated to stay sharp and secure.

## 2.3.1

1. Updated dependencies and libraries.

## 2.3.0

Heart beats, uptime logging & Arm support.

Starting with this release, Docker images for Arm64 and Arm7 will be built and published to Docker Hub automatically.
This release also brings configurable Docker health checking, as well as uptime messages that tell you how Butler CW itself is doing.

Change list:

1. Multi-architecture support in CI/CD. I.e. build Docker images for Arm CPUs.
2. Node.js has built-in promises these days, no need to use 3rd party libraries for this.
3. Make it possible to turn the Docker health check on/off, as well as configure its port.
4. Add uptime monitor that logs how long Butler CW has been running, as well as how much memory it uses. 

## 2.2.1

1. Better handling of Qlik Sense certificates, avoiding troubles in certain cases.

## 2.2.0

1. Added **hearbeats**. This makes it possible to monitor Butler CW from monitoring tools such as [healthchecks.io](healthchecks.io).
2. Documentation updates.

## 2.1.1

1. Minor: Fix incorrect network name in docker-compose file.

## 2.1

1. Updated dependencies to latest versions, bringing in bug and security fixes.
2. Added Docker healthcheck feature.
3. Made logging customisable in the config file (in the same way as other Butler tools).
4. General refactoring and cleanup of the entire code base.

## 2.0

1. Updated all dependencies to latest versions. This both addresses security issues and makes the tool compatible with Qlik Sense June 2018 and later (using Enigma.js > v2).
2. Switched from JSON to YAML config file. Old JSON config files will still work, but everyone is encouraged to convert the config file to YAML. Easier to read, write and maintain.
3. Added uptime info (hours, minutes, seconds since the service was started) in the debug logs.
4. Major refactoring of all source code, including migrating (most of the code) to use async/await instead of promises.
5. Fixed bug where apps that were opened/cached very frequently (several times per minute) would not be properly handled. In some cases, some chart objects would not be opened.
6. Added log file on disk for debug level messages.
7. Updated documentation.

## 1

First version. Works with Qlik Sense Enterprise pre June 2018.

---

For information please visit the [releases page](https://github.com/ptarmiganlabs/butler-cw/releases).
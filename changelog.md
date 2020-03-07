# Change log

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
# Changelog

### [4.0.3](https://github.com/ptarmiganlabs/butler-cw/compare/butler-cw-v4.0.2...butler-cw-v4.0.3) (2022-01-05)


### Bug Fixes

* **deps:** update dependency eslint-config-airbnb-base to v15 ([35b489d](https://github.com/ptarmiganlabs/butler-cw/commit/35b489d1ca51aaa27241541e8139ff0f4858598e))
* Disable MQTT and uptime monitor in template config file ([32a80c6](https://github.com/ptarmiganlabs/butler-cw/commit/32a80c6794f70c5a8cdc7cd83fffb6c443c566c0)), closes [#138](https://github.com/ptarmiganlabs/butler-cw/issues/138)
* Improved config robustness ([601c5d6](https://github.com/ptarmiganlabs/butler-cw/commit/601c5d66d3abe939009706669a0badf70cc03b58))


### Miscellaneous

* **deps:** update dependency prettier to v2.5.1 ([e9f9e5d](https://github.com/ptarmiganlabs/butler-cw/commit/e9f9e5deb7e227e8f37341d98082e2171213bdf0))
* **deps:** update googlecloudplatform/release-please-action action to v3 ([079b70e](https://github.com/ptarmiganlabs/butler-cw/commit/079b70ebea0426c662f405ba29fe371d8b0c8e00))
* Update dependencies ([e51b470](https://github.com/ptarmiganlabs/butler-cw/commit/e51b470584ef44779df7d3464d911e225bacca23))


### Documentation

* Update sample config file in README ([28780c4](https://github.com/ptarmiganlabs/butler-cw/commit/28780c487dd2c8eccf8e809e6d5f55eea99590bc))

### [4.0.2](https://www.github.com/ptarmiganlabs/butler-cw/compare/butler-cw-v4.0.1...butler-cw-v4.0.2) (2021-12-01)


### Bug Fixes

* Slim down release ZIP artefacts ([742c180](https://www.github.com/ptarmiganlabs/butler-cw/commit/742c1805e4d2eb15293a7ef9ffc8de24af6d1d70))


### Miscellaneous

* **deps:** Update dependencies ([5b75ad2](https://www.github.com/ptarmiganlabs/butler-cw/commit/5b75ad2f9732e64ad66655fb8a9450dd9b5f3d38))

### [4.0.1](https://www.github.com/ptarmiganlabs/butler-cw/compare/butler-cw-v4.0.0...butler-cw-v4.0.1) (2021-10-26)


### Bug Fixes

* **deps:** update dependency axios to ^0.24.0 ([9a9659c](https://www.github.com/ptarmiganlabs/butler-cw/commit/9a9659c726e593ad43d93e0a80a67ecea31b9dd3))

## [4.0.0](https://www.github.com/ptarmiganlabs/butler-cw/compare/butler-cw-v3.2.0...butler-cw-v4.0.0) (2021-10-23)


### ⚠ BREAKING CHANGES

* Show time of next cache run
* Add outgoing MQTT support

### Features

* Add outgoing MQTT support ([0a190cb](https://www.github.com/ptarmiganlabs/butler-cw/commit/0a190cbfbe0a539c4f5c619decb2360fbadb3ccc)), closes [#114](https://www.github.com/ptarmiganlabs/butler-cw/issues/114)
* Add UTC/localtime support ([4b2890c](https://www.github.com/ptarmiganlabs/butler-cw/commit/4b2890c4cd6e89e92700f134b776044a3181f9a6)), closes [#115](https://www.github.com/ptarmiganlabs/butler-cw/issues/115)
* Show time of next cache run ([95942ef](https://www.github.com/ptarmiganlabs/butler-cw/commit/95942ef0aefdd44cc97f989c191151e871cf3c91)), closes [#113](https://www.github.com/ptarmiganlabs/butler-cw/issues/113)

## [3.2.0](https://www.github.com/ptarmiganlabs/butler-cw/compare/butler-cw-v3.1.1...butler-cw-v3.2.0) (2021-10-21)


### Features

* Show first few runs on startup ([29a1b1c](https://www.github.com/ptarmiganlabs/butler-cw/commit/29a1b1cca0951897a90a78796fbee6ba5f44f96f)), closes [#117](https://www.github.com/ptarmiganlabs/butler-cw/issues/117)


### Refactoring

* Add doInitialLoad flag ([#111](https://www.github.com/ptarmiganlabs/butler-cw/issues/111)) ([1bd954d](https://www.github.com/ptarmiganlabs/butler-cw/commit/1bd954dd132a3e2531baf42eaf23e3a5621ebe6c))

### [3.1.1](https://www.github.com/ptarmiganlabs/butler-cw/compare/butler-cw-v3.1.0...butler-cw-v3.1.1) (2021-10-20)


### Bug Fixes

* Respect apps to load config settting ([53545e6](https://www.github.com/ptarmiganlabs/butler-cw/commit/53545e6ee1d53c44cf12d9291315b8ff23bce055))


### Documentation

* Update docs wrt 3.1 ([6b2be29](https://www.github.com/ptarmiganlabs/butler-cw/commit/6b2be29bfafc7a0d173f3fc8b7f290ebaf2c8266))

## [3.1.0](https://www.github.com/ptarmiganlabs/butler-cw/compare/butler-cw-v3.0.1...butler-cw-v3.1.0) (2021-10-20)


### Features

* Refactor Docker healtcheck ([4ed8a23](https://www.github.com/ptarmiganlabs/butler-cw/commit/4ed8a23acf3bdceb01e10919b6540e2d7db9a374))


### Refactoring

* Align code formatting with Butler tools ([ec4548a](https://www.github.com/ptarmiganlabs/butler-cw/commit/ec4548a455b19dad21e301bb45ea37c7c24ad976))

### [3.0.1](https://www.github.com/ptarmiganlabs/butler-cw/compare/butler-cw-v3.0.0...butler-cw-v3.0.1) (2021-10-20)


### Miscellaneous

* **deps:** Update dependencies ([d869795](https://www.github.com/ptarmiganlabs/butler-cw/commit/d86979541e98ecdf8cb63fe12aa035ec2d05913c))

## 3.0.0 (2021-10-20)


### ⚠ BREAKING CHANGES

* Align release process to Butler tools

### Miscellaneous

* **deps:** update googlecloudplatform/release-please-action action to v2.33.0 ([b547025](https://www.github.com/ptarmiganlabs/butler-cw/commit/b54702505e86b5554e555ad11ca0626acb5eb528))
* **deps:** update ptarmiganlabs/butler-cw docker tag to v2.3.12 ([d6a7452](https://www.github.com/ptarmiganlabs/butler-cw/commit/d6a745272c746379ac9714b8b5756d39e7319b93))
* **deps:** update ptarmiganlabs/butler-cw docker tag to v2.3.12 ([50d6139](https://www.github.com/ptarmiganlabs/butler-cw/commit/50d61395a5da1f240bd583d8aac97f8f51497eda))


### Refactoring

* Align release process to Butler tools ([a95a537](https://www.github.com/ptarmiganlabs/butler-cw/commit/a95a537783276cb64e7782c399167b16b8dc764c))

### [2.3.12](https://www.github.com/ptarmiganlabs/butler-cw/compare/v2.3.11...v2.3.12) (2021-08-31)


### Bug Fixes

* Fix multi-arch Docker image creation ([#42](https://www.github.com/ptarmiganlabs/butler-cw/issues/42)) ([4182d89](https://www.github.com/ptarmiganlabs/butler-cw/commit/4182d8900058e2b78f100ca074c4c6c9c6f4c152))

### [2.3.11](https://www.github.com/ptarmiganlabs/butler-cw/compare/v2.3.10...v2.3.11) (2021-08-31)


### Bug Fixes

* Cleanup of Docker image building ([8f36616](https://www.github.com/ptarmiganlabs/butler-cw/commit/8f36616ecd7c013cb72f6216c26493272d59df14))

### [2.3.10](https://www.github.com/ptarmiganlabs/butler-cw/compare/v2.3.9...v2.3.10) (2021-08-31)


### Bug Fixes

* debug img builds ([8f413b5](https://www.github.com/ptarmiganlabs/butler-cw/commit/8f413b5919fa2c9763ac99d623a7c0135314a5f0))
* debug img builds ([#73](https://www.github.com/ptarmiganlabs/butler-cw/issues/73)) ([fa172ce](https://www.github.com/ptarmiganlabs/butler-cw/commit/fa172ceb09816d8a66cc89ff9b37f12bc03536e1))
* img builds ([9b7d952](https://www.github.com/ptarmiganlabs/butler-cw/commit/9b7d952dcaededf315d11c36013225cb4dabf149))

### [2.3.9](https://www.github.com/ptarmiganlabs/butler-cw/compare/v2.3.8...v2.3.9) (2021-08-31)


### Bug Fixes

* img build debug ([77fd71c](https://www.github.com/ptarmiganlabs/butler-cw/commit/77fd71cdd9e6686e7760b615f41c6aa93bc9ccd7))

### [2.3.8](https://www.github.com/ptarmiganlabs/butler-cw/compare/v2.3.7...v2.3.8) (2021-08-31)


### Bug Fixes

* Debug Docker img builds ([9c6be1a](https://www.github.com/ptarmiganlabs/butler-cw/commit/9c6be1ae06c04ce9d8c2a72296297c23ffd13dfc))

### [2.3.7](https://www.github.com/ptarmiganlabs/butler-cw/compare/v2.3.6...v2.3.7) (2021-08-31)


### Bug Fixes

* Docker img builds ([436d184](https://www.github.com/ptarmiganlabs/butler-cw/commit/436d184fc61100060b24e40d1b2aaf74e2587a7d))

### [2.3.6](https://www.github.com/ptarmiganlabs/butler-cw/compare/v2.3.5...v2.3.6) (2021-08-31)


### Bug Fixes

* Debug Docker img builds ([3734f83](https://www.github.com/ptarmiganlabs/butler-cw/commit/3734f839fa998e51f2314c9610ea45c75817217f))
* Docker img builds ([189a10b](https://www.github.com/ptarmiganlabs/butler-cw/commit/189a10bffc371ef69afa7676f56d7e5b9f87f596))

### [2.3.5](https://www.github.com/ptarmiganlabs/butler-cw/compare/v2.3.4...v2.3.5) (2021-08-31)


### Bug Fixes

* Docker image debugging ([3a0a1b6](https://www.github.com/ptarmiganlabs/butler-cw/commit/3a0a1b61f3b8c447bc9a318b9ebcf0b5d283ae58))

### [2.3.4](https://www.github.com/ptarmiganlabs/butler-cw/compare/v2.3.3...v2.3.4) (2021-08-31)


### Bug Fixes

* Move Docker images to use Node.js 14 LTS ([c6d3b72](https://www.github.com/ptarmiganlabs/butler-cw/commit/c6d3b7248da0c77ab9bb4082dccfa8eec4818dcf))


### Miscellaneous Chores

* release 2.3.4 ([3ebde4c](https://www.github.com/ptarmiganlabs/butler-cw/commit/3ebde4caed55ee92eda388649b968528a7cb8826))

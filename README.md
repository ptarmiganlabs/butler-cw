# A cache warming tool for Qlik Sense

[![Build Docker image](https://github.com/ptarmiganlabs/butler-cw/actions/workflows/docker-image-build.yml/badge.svg)](https://github.com/ptarmiganlabs/butler-cw/actions/workflows/docker-image-build.yml)
[![Maintainability](https://api.codeclimate.com/v1/badges/285300f789099a204af0/maintainability)](https://codeclimate.com/github/mountaindude/butler-cw/maintainability)

![Butler CW](img/butler_cw.png)

CW = Cache Warming, i.e. the process of proactively forcing Sense apps to be loaded into RAM, so they are readily available when users open them.

## Background

Many years ago Qlik Sense Enterprise (the Windows Server version, which was the only one available at the time) moved to something called "[shared persistence](http://help.qlik.com/en-US/sense/3.2/Subsystems/Installation/Content/InstallationLicensing/Install-Shared.htm)". It simply means that the Sense apps are stored on a central file server, rather than on each individual server in the Sense environment.  
Shared persistence is today the only supported storage model for Qlik Sense Enterprise on Windows (QSEoW).

The upside of shared persistence is that there is a single version of each app - the one stored on the central file server.

The downside is that when a user opens a large Sense app, it takes significant time to load the app from the file server into Qlik's associative engine (a.k.a. the QIX engine) of the server that the user is connected to.

True, the load time will depend on things like how fast disks are used on the file server, network speed etc - but even with best possible disks and servers that for example Amazon EC2 or Google Cloud Platform offers, large apps might take several minutes to load into the engine. This means the user opening the app in question would have to wait that time before starting to use the app. Not a good user experience.

## Solution

Butler CW consists of four main parts:

* Node.js app that does the actual cache warming.
* Config file (YAML) used by the Node.js app to know where to find server certificates etc.
* A separate config file (YAML) for specifying with what frequency what apps should be loaded into which servers.
* Docker image that wrap the previous three parts into a single image, which can be executed in any Docker environment. Functionally there is no difference in using native Node.js or Docker - just that the latter is usually a lot more convenient.

## Features

* Control when and on what Sense server specific apps should be loaded/cache warmed.
* Very flexible, human readable cache warming schedule definition for each app. Choose between using CET or local time zones.
* Control per app if all sheets in the app should be opened. If enabled, this will effectively pre-calculate all charts in all sheets, for the default selection state in the app. This can dramatically shorten load times when an app is first accessed by end users.
* Apps can be configured to have an initial cache warming run when Butler CW is first started.
* Heartbeats sent to infrastructure monitoring tools. Useful if you want to monitor and ensure Butler CW is alive and well.
* Uptime metrics (how long Butler CW has been running, how much memory it's using etc) written to log files.
* Send data about all cache warming runs, for all apps, to MQTT for later use by subscribers to the MQTT topics used.
* Store the app schedule file in GitHub rather than on disk.
* Logs written to disk and console, with configurable log levels. Choose between using CET or local time zones in log files.
* ... and more. The main config file is well documented and serves as the ultimate list of what's available in terms of features.

## Configuration files

There are two config files:

### apps.yaml

This file is used to specify what apps should be pre-loaded into which servers. Most likely there will be several people (Sense developers and admins) that need to edit this file.  
For that reason this file can be stored either on local disk, or as a better solution, on GitHub or some other revision control system.

If stored on GitHub (or other similar system), Butler CW will read the config file from GitHub, and you will also get all the traceability and peer review capabilities offerd by GitHub (or similar system).

The workflow looks like this:

1. Sense developers that want their apps pre-loaded onto Sense servers fork the GitHub repository where the YAML config file lives.
2. The developer make some additions to the YAML config file and send a pull request to the upstream repository (which is managed by the Sense admins).
3. When the changes are accepted in the upstream/main Git repository, Butler CW will at next restart use the new config file.

There are instructions in [the template file](https://github.com/ptarmiganlabs/butler-cw/blob/master/config/apps_config.yaml) included in the GitHub repo that explains how this file works.

### production.yaml

This file contains sensitive information about where to find the Sense server certificates used when connecting to the Sense servers, as well as other parameters used to run the actual cache warming service. This file is stored on local disk.

## MQTT support

[MQTT](https://mqtt.org) is a lightweight, robust, publish-subscribe (pub-sub) protocol used in the IoT sector and elsewhere.
It's very easy to use and makes it trivial to send data from one source system to any number of destination systems ("subscribers") that are interested in this particular data.

Butler CW can be configured to send a MQTT message every time an app is cache warmed.  
The configuration is done in the `mqttConfig` section of the main config file:

```YAML
# MQTT config parameters
mqttConfig:
  out: 
    enable: true              # Should info about cache run/warming events be sent as MQTT messages?
    baseTopic: butler-cw/     # Topic to send cache run events to. Should end with /
    tzFormat: UTC             # LOCAL or UTC. Default is UTC
  broker:                     # MQTT server/broker config
    uri: mqtt://<MQTT server ip/FQDN>:<port>      ## Port is usually 1883
```

## Installation and setup

### Running as a native Node.js app

Basically the same as for any app in the Butler family:

1. Make sure you have a recent version of [Node.js](https://nodejs.org) installed. The latest LTS version is a good choice.
2. Grab the latest release from the [release page](https://github.com/ptarmiganlabs/butler-cw/releases). Extract it to a suitable place on your Windows/Linux/Mac computer. A place like `d:\tools\butler-cw` could make sense on a Windows Server with a system `c:` drive and a `d:` for non-system applications.
3. From within the directory where you placed the Butler CW files, run (this will download and install all dependencies that Butler CW uses)

	```
	npm i
	```
    
4. Once the various dependencies have downloaded, copy the `./config/default_config.yaml` file to `./config/production.yaml`
5. Edit `./config/production.yaml` as needed, using paths etc for your local system.
6. Edit `./config/apps_config.yaml`, specifying when Sense apps should be loaded into servers. The frequency field in this config file is quite flexible, you can use any format listed [here](https://bunkat.github.io/laterparsers.htm).  
This file can be named anything (e.g. abc.yaml), as long as it's name is also specified in the production.yaml file.

The `production.yaml` file can also be named anything, as long as it matches the value of the `NODE_ENV` environment variable.  
For example, if the config file is called `production.yaml`, the `NODE_ENV` environment variable should be set to 'production':

Windows: `set NODE_ENV=production`  
Linux: `export NODE_ENV=production`

The "appStepThroughSheets" field in `./config/apps.yaml` controls whether Butler CW should iterate through all sheets and chart objects in the app. If enabled, and there are lots of sheets and charts, **a lot** of RAM might be used when loading the app into Sense's engine. The user experience will on the other hand be great - sheets and the charts on them will load instantly - even those charts that previosuly took long time to render due to complex calculations and/or large data volumes. It is impossible to give firm guidance on what levels of caching and stepping through sheet that is suitable - you have to start on a low level and work your way up, until you find a solution that works in your Qlik Sense environment.

Start the service by running "node index.js". Butler CW has been tested on both macOS, Windows Server 2012 R2, Windows Server 2016, Windows Server 2019, Debian and Ubuntu.

### Running in a Docker container

This is the preferred way of running Butler CW:

* No need to install Node.js on your server(s). Less security, performance and maintenance concerns.
* Make use of your existing Docker runtime environments, or use those offered by Amazon, Google, Microsoft etc.
* Benefit from the extremely comprehensive tools ecosystem (monitoring, deployment etc) that is available for Docker.
* Updating Butler CW to the latest version is as easy as stopping the container, then doing a "docker pull ptarmiganlabs/butler:latest", and finally starting the container again.

Installing and getting started with Butler CW in Docker can look something like this when working on MacOS. Windows and Linux of course looks slightly different:

Create a directory for Butler CW. Config files and logs will be stored here.

```bash
proton:code goran$ mkdir -p butler-cw-docker/config/certificate
proton:code goran$ mkdir -p butler-cw-docker/log
proton:code goran$ cd butler-cw-docker
proton:butler-cw-docker goran$
```

* Copy the two YAML config files from the GitHub repository, rename and edit them as described above and place them in the ./config directory.
* Copy `docker-compose.yml` from the GitHub repository to the main directory.
* Export certifiates from the QMC in Qlik Sense Enterprise, place them in the config/certificate directory.

Let's do this one step at a time.  
What files are there?

```bash
proton:butler-cw-docker goran$ ls -la
total 8
drwxr-xr-x   5 goran  staff   160 Sep 27 22:21 .
drwxr-xr-x  47 goran  staff  1504 Sep 27 10:41 ..
drwxr-xr-x   5 goran  staff   160 Sep 27 10:43 config
-rw-r--r--   1 goran  staff   383 Sep 27 22:21 docker-compose.yml
drwxr-xr-x   2 goran  staff    64 Sep 27 22:21 log
proton:butler-cw-docker goran$
proton:butler-cw-docker goran$ ls -la config/
total 16
drwxr-xr-x  5 goran  staff   160 Sep 27 10:43 .
drwxr-xr-x  5 goran  staff   160 Sep 27 22:21 ..
-rw-r--r--  1 goran  staff   855 Sep 27 22:22 apps.yaml
drwxr-xr-x  5 goran  staff   160 Sep 27 10:43 certificate
-rw-r--r--  1 goran  staff  1140 Sep 27 22:22 production.yaml
proton:butler-cw-docker goran$
proton:butler-cw-docker goran$ ls -la config/certificate/
total 24
drwxr-xr-x  5 goran  staff   160 Sep 27 10:43 .
drwxr-xr-x  5 goran  staff   160 Sep 27 10:43 ..
-rw-r--r--@ 1 goran  staff  1166 Sep 27 10:43 client.pem
-rw-r--r--@ 1 goran  staff  1702 Sep 27 10:43 client_key.pem
-rw-r--r--@ 1 goran  staff  1192 Sep 27 10:43 root.pem
```

What do the config files look like?

```bash
proton:butler-cw-docker goran$ cat config/production.yaml
# Rename this file to production.yaml, and fill in data as needed below.

# Logging configuration
logLevel: verbose         # Log level. Possible log levels are silly, debug, verbose, info, warn, error
fileLogging: true         # true/false to enable/disable logging to disk file

# Configuration of Butler CW's scheduler
scheduler:
  startup: 
    showPerAppSchedule: 
      enable: true        # Should the first itemCount scheduled runs be shown for each app, on startup?
      itemCount: 10       # Number of coming runs to show for each app
  timeZone:                 # Valid values are UTC and LOCAL. Default value is UTC
    scheduleDefine: UTC     # How should times in the apps config file be interpreted? 
    logs: UTC              # What time format should be used in log files?

# Heartbeats can be used to send "I'm alive" messages to some other tool, e.g. an infrastructure monitoring tool
# The concept is simple: The remoteURL will be called at the specified frequency. The receiving tool will then know
# that Butler CW is alive.
heartbeat:
  enabled: true
  remoteURL: http://healthcheck.ptarmiganlabs.net/ping/138514b0-882a-4a44-8548-96f7d16c9242
  frequency: every 30 seconds         # https://bunkat.github.io/later/parsers.html

# Docker health checks are used when running Butler CW as a Docker container.
# The Docker engine will call the container's health check REST endpoint with a set interval to determine
# whether the container is alive/well or not.
# If you are not running Butler CW in Docker you can safely disable this feature.
dockerHealthCheck:
  enabled: true    # Control whether a REST endpoint will be set up to serve Docker health check messages
  port: 12398      # Port the Docker health check service runs on (if enabled)

# Uptime monitor
# When enabled, Butler CW will write info on uptime and used memory to log files
uptimeMonitor:
  enabled: true                   # Should uptime messages be written to the console and log files?
  frequency: every 60 seconds     # https://bunkat.github.io/later/parsers.html
  logLevel: verbose               # Starting at what log level should uptime messages be shown?

# Paths to client certificates to use when connecting to Sense server. Can be pem or pvk/cer
# remove or comment out if running on desktop
clientCertPath: /nodeapp/config/certificate/client.pem
clientCertKeyPath: /nodeapp/config/certificate/client_key.pem
clientCertCAPath: /nodeapp/config/certificate/root.pem

# MQTT config parameters
mqttConfig:
  out: 
    enable: true              # Should info about cache run/warming events be sent as MQTT messages?
    baseTopic: butler-cw/     # Topic to send cache run events to. Should end with /
    tzFormat: UTC           # LOCAL or UTC. Default is UTC
  # Items below are mandatory if mqttConfig.enable=true
  broker:
    uri: mqtt://1.2.3.4:1883     ## Port is usually 1883

# QIX version to use
qixVersion: 12.170.2

# Config on what apps should be cached
appConfig:
  # Valid options are disk, github
  configSource: disk

  # Leave strings empty if disk config not used
  diskConfigFile: ./config/apps.yaml

  # Leave strings empty if github not used
  github:
    host: api.github.com
    username: <username>
    password: pwd or access token
    owner: <repo owner>
    repo: <repo name, e.g. qliksense-cache-warming>
    path: config/apps.yaml

# Is connection to Sense engine secure (https)?
isSecure: true

proton:butler-cw-docker goran$
proton:butler-cw-docker goran$ cat config/apps.yaml
# Rename this file to apps.yaml, then edit it as needed.

# This file is used to specifiy what Qlik Sense apps should be loaded by the cache warmer, when/how often they should be loaded, 
# what filters should be applied when apps are opened etc 
#
# Frequency attribute must follow rules described here: https://breejs.github.io/later/parsers.html#text
#
# NOTE!
# 1. Second level scheduling does not work as expected. 
#    For example, 'every 55 seconds' will trigger on each whole minute, plus 5 seconds before each whole minute.
#    Use minutes as most detailed level of scheduling. 
#    More info at https://github.com/ptarmiganlabs/butler-cw/issues/116
#
#
# Fields for each app:
# server: IP or FQDN of the Sense server where the app should be loaded
# appId: Id of app to load
# appDescription: Free text description of the app. Can be anything - no check is done Sense APIs using this text
# appStepThroughSheets: Set to true to have Butler CW step through all sheets of the app, triggering all charts etc to calculate in all sheets
# doInitialLoad: Set to true to do an initial load of this app when Butler CW is started.
# freq: Text value representation of how often the app should be loaded

apps:
  - server: sense1.mydomain.com
    appId: c36bfbdb-0c4b-4d57-9939-b851d2af1cb5
    appDescription: License monitor
    appStepThroughSheets: true
    doInitialLoad: true
    freq: every 5 mins every weekend
  - server: sense1.mydomain.com
    appId: dead6f4a-da0b-4b9c-82a2-3f94fdc72599
    appDescription: Meetup.com
    appStepThroughSheets: true
    doInitialLoad: false
    freq: at 5:00 pm
  - server: sense2.mydomain.com
    appId: 492a1bca-1c41-4a01-9104-543a2334c465
    appDescription: 2018 sales targets
    appStepThroughSheets: true
    doInitialLoad: false
    freq: every 2 hours
proton:butler-cw-docker goran$
```

What does the docker-compose.yml file look like?

```bash
proton:butler-cw-docker goran$ cat docker-compose.yml
# docker-compose.yml
version: '3.3'
services:
  butler-cw:
    image: ptarmiganlabs/butler-cw:latest
    restart: always
    container_name: butler-cw
    volumes:
      # Make config file accessible outside of container
      - "./config:/nodeapp/config"
      - "./log:/nodeapp/log"
    environment:
      - "NODE_ENV=production"
    logging:
      driver: json-file
      options:
        max-file: "5"
        max-size: "5m"
    networks:
      - butler-cw

networks:
  butler-cw:
    driver: bridge

proton:butler-cw-docker goran$
```

Ok, all good. Let's start Butler CW using docker-compose:

```bash
proton:butler-cw-docker goran$ docker-compose up
Creating network "butler-cw-docker_butler-cw" with driver "bridge"
Pulling butler-cw (ptarmiganlabs/butler-cw:latest)...
latest: Pulling from ptarmiganlabs/butler-cw
7d63c13d9b9b: Already exists
bb262aff53d8: Already exists
24467fa1084c: Already exists
d318401bbcfd: Already exists
fef5c41ac380: Already exists
355f82e6ba49: Pull complete
58031546d982: Pull complete
49882da52baa: Pull complete
990f8e00f68e: Pull complete
b33e3e1b2464: Pull complete
Digest: sha256:064508343e754fd2a37e0222e37d016309ba4a96c73c519cac11db5f1bb784ee
Status: Downloaded newer image for ptarmiganlabs/butler-cw:latest
Creating butler-cw ... done
Attaching to butler-cw
butler-cw    | 2021-10-20T12:23:15.419Z info: --------------------------------------
butler-cw    | 2021-10-20T12:23:15.421Z info: Starting Butler CW.
butler-cw    | 2021-10-20T12:23:15.422Z info: Log level is: verbose
butler-cw    | 2021-10-20T12:23:15.422Z info: App version is: 3.1.0
butler-cw    | 2021-10-20T12:23:15.423Z info: --------------------------------------
butler-cw    | 2021-10-20T12:23:15.430Z verbose: MAIN: Starting Docker healthcheck server...
butler-cw    | 2021-10-20T12:23:15.449Z info: MAIN: Started Docker healthcheck server on port 12398.
butler-cw    | 2021-10-20T12:23:20.491Z verbose: Starting loading of appid e28f9c40-6138-42f4-81c3-1d61860baa27
butler-cw    | 2021-10-20T12:23:20.502Z verbose: Starting loading of appid c840670c-7178-4a5e-8409-ba2da69127e2
butler-cw    | 2021-10-20T12:23:20.750Z info: App loaded: e28f9c40-6138-42f4-81c3-1d61860baa27
butler-cw    | 2021-10-20T12:23:20.766Z info: App e28f9c40-6138-42f4-81c3-1d61860baa27: Cached 0 visualizations on 0 sheets.
butler-cw    | 2021-10-20T12:23:20.792Z info: App loaded: c840670c-7178-4a5e-8409-ba2da69127e2
butler-cw    | 2021-10-20T12:23:21.424Z info: App c840670c-7178-4a5e-8409-ba2da69127e2: Cached 13 visualizations on 2 sheets.
butler-cw    | 2021-10-20T12:23:30.486Z verbose: --------------------------------
butler-cw    | 2021-10-20T12:23:30.488Z verbose: Iteration # 1, Uptime: 15 seconds, Heap used 12.88 MB of total heap 15.76 MB. Memory allocated to process: 63.12 MB.
butler-cw    | 2021-10-20T12:23:30.490Z verbose: Starting loading of appid e28f9c40-6138-42f4-81c3-1d61860baa27
butler-cw    | 2021-10-20T12:23:30.637Z info: App loaded: e28f9c40-6138-42f4-81c3-1d61860baa27
butler-cw    | 2021-10-20T12:23:30.649Z info: App e28f9c40-6138-42f4-81c3-1d61860baa27: Cached 0 visualizations on 0 sheets.
butler-cw    | 2021-10-20T12:23:45.468Z verbose: --------------------------------
butler-cw    | 2021-10-20T12:23:45.470Z verbose: Iteration # 2, Uptime: 29 seconds, Heap used 13.45 MB of total heap 16.01 MB. Memory allocated to process: 63.77 MB.
...
...
```

Warning: Setting the log level to debug in the config file will create **lots** of log output.

Finally, let's take a look at what Docker tells us about the currently running containers:

```
➜  ~ docker ps
CONTAINER ID   IMAGE                            COMMAND                  CREATED         STATUS                    PORTS     NAMES
565152b1be90   ptarmiganlabs/butler-cw:latest   "docker-entrypoint.s…"   2 minutes ago   Up 20 seconds (healthy)             butler-cw
➜  ~
```

Great, Butler CW is running and reporting a healthy status. All good!

### Storing configuration in Git

While a good idea, this is a slightly complex topic.

Different revision control tools and services (Github, BitBucket etc) work in slightly different ways when it comes to allowing access to files.

In public Github (GH), it is for example possible to read files in public repositories without being logged into Github.

In Github Enterprise (GHE) on the other hand, each company can configure whether their own employees should be able to read files from GHE repositories without being logged into GHE, or whether such access requires the user to be logged into GHE.

Bottom line is that Butler CW in current version logs into GH or GHE, and then read the `apps.yaml` file. The rationale is that most companies will not place their config files on public GH, but rather in GHE or other privat revision control system that require login.

It is worth noting that Butler CW can quite easily be extended to support other revision control tools/solutions.

## Remember!

You cannot pre-load all apps. Focus on a few of the most used apps, and/or some of the biggest ones, where the impact of cache warming will be the greatest.  
Also, remember to do an occasional review what apps are being used, and if needed adjust the cach warming strategy. No point in forcing apps that only a few people use into RAM.

## Strange stuff, caveats and things not quite working (yet)

The projects [issue list](https://github.com/ptarmiganlabs/butler-cw/issues) is where bugs and feature requests should go, but there can also be things that aren't really bugs, but still don't work quite as you might expect.. Maybe they will go onto the bug list at some point - TBD.

* If the config setting `scheduler.showNextEvent.enable` is enabled, Butler will right after doing a cache run show when the *next* cache run will take place.  
  This can be nice if you want to ensure that the schedule you created works as expected.  
  **The caveat is**: For the *first* cache run it sometimes displays an incorrect time for the *second* schedule run.
  Maybe it should be classified as a bug.. but it looks like it's tricky to fix, and the impact is really quite minor as it only affects what's shown in the logs right after Butler CW is started.

## Links & references

GitHub repository: [https://github.com/ptarmiganlabs/butler-cw](https://github.com/ptarmiganlabs/butler-cw)  
Docker image on Docker Hub: [https://hub.docker.com/u/ptarmiganlabs](https://hub.docker.com/u/ptarmiganlabs)

More info about the Butler family of Qlik Sense utilities can be found at the [Ptarmigan Labs](https://ptarmiganlabs.com/) site, on [Medium](https://medium.com/@mountaindude), over at [Qlik Branch](http://branch.qlik.com/#!/user/56728f52d1e497241ae69a86) or in the [GitHub repositories](https://github.com/ptarmiganlabs).

### Inspiration

Inspiration to this project largely came from Joe Bickley's [Cache Initializer](https://github.com/JoeBickley/CacheInitializer) project.  
At the core Joe's tool does the same as Butler CW, but for individual apps.
  
I wanted a stand-alone tool that by itself handles multiple apps on multiple servers. Also, as the rest of the Butler suite is written in Node.js, I wanted the cache warmer to use the same underlying tech as the rest of the Butler family.

Joe's tool does one thing Butler CW does not do: Allow filters to be applied when opening the app. This is a useful feature and might be included in future versions of Butler CW.

# A cache warming tool for Qlik Sense

[![Build Status](https://cloud.drone.io/api/badges/ptarmiganlabs/butler-cw/status.svg)](https://cloud.drone.io/ptarmiganlabs/butler-cw)
[![Maintainability](https://api.codeclimate.com/v1/badges/285300f789099a204af0/maintainability)](https://codeclimate.com/github/mountaindude/butler-cw/maintainability)

![Butler CW](img/butler_cw.png)

CW = Cache Warming, i.e. the process of proactively forcing Sense apps to be loaded into RAM, so they are readily available when users open them.

## Background

A few years ago Qlik Sense Enterprise (the Windows Server version, which was the only one available at the time) moved to something called "[shared persistence](http://help.qlik.com/en-US/sense/3.2/Subsystems/Installation/Content/InstallationLicensing/Install-Shared.htm)". It simply means that the Sense apps are stored on a central file server, rather than on each individual server in the Sense environment.  
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

### Configuration files

There are two config files:

#### apps.yaml

This file is used to specify what apps should be pre-loaded into which servers. Most likely there will be several people (Sense developers and admins) that need to edit this file.  
For that reason this file can be stored either on local disk, or as a better solution, on GitHub or some other revision control system.

If stored on GitHub (or other similar system), Butler CW will read the config file from GitHub, and you will also get all the traceability and peer review capabilities offerd by GitHub (or similar system).

The workflow looks like this:

1. Sense developers that want their apps pre-loaded onto Sense servers fork the GitHub repository where the YAML config file lives.
2. The developer make some additions to the YAML config file and send a pull request to the upstream repository (which is managed by the Sense admins).
3. When the changes are accepted in the upstream/main Git repository, Butler CW will at next restart use the new config file.

#### production.yaml

This file contains sensitive information about where to find the Sense server certificates used when connecting to the Sense servers, as well as other parameters used to run the actual cache warming service. This file is stored on local disk.

## Installation and setup

### Running as a native Node.js app

Basically the same as for any app in the Butler family:

1. Make sure you have a recent version of [Node.js](https://nodejs.org) installed. Node 12.16.0 was used during development of the most recent Butler CW version.
2. [Clone the GitHub repository](https://github.com/ptarmiganlabs/butler-cw.git) to local disk, or download and extract the [ZIP:ed repo](https://github.com/ptarmiganlabs/butler-cw/archive/master.zip) from GitHub.
3. From within the directory where you placed the Butler CW files, run

	```
	npm i
	```
    
4. Once the various dependencies have downloaded, copy the `./config/default_config.yaml` file to `./config/production.yaml`
5. Edit `./config/production.yaml` as needed, using paths etc for your local system.
6. Edit `./config/apps_config.yaml`, specifying when Sense apps should be loaded into servers. The frequency field in this config file is quite flexible, you can use any format listed [here](https://bunkat.github.io/laterparsers.htm).  
This file can be named anything (e.g. abc.yaml), as long as it's name is also specified in the production.yaml file.

The `production.yaml` file can also be named anything, as long as it matches the value of the NODE_ENV environment variable.  
For example, if the config file is called `production.yaml`, the NODE_ENV environment variable should be set to 'production':

Windows: `set NODE_ENV=production`  
Linux: `export NODE_ENV=production`

The "appStepThroughSheets" field in `./config/apps.yaml` states whether Butler CW should iterate through all sheets and chart objects in the app. If enabled, and there are lots of sheets and charts, **a lot** of RAM might be used when loading the app into Sense's engine. The user experience will on the other hand be great - sheets and the charts on them will load instantly - even those charts that previosuly took long time to render due to complex calculations and/or large data volumes. It is impossible to give firm guidance on what levels of caching and stepping through sheet that is suitable - you have to start on a low level and work your way up, until you find a solution that works in your Qlik Sense environment.

Start the service by running "node index.js". Butler CW has been tested on both macOS, Windows Server 2012 R2, Windows Server 2016, Windows Server 2019, Debian and Ubuntu.

### Running in a Docker container

This is the preferred way of running Butler CW:

* No need to install Node.js on your server(s). Less security, performance and maintenance concerns.
* Make use of your existing Docker runtime environments, or use those offered by Amazon, Google, Microsoft etc.
* Benefit from the extremely comprehensive tools ecosystem (monitoring, deployment etc) that is available for Docker.
* Updating Butler CW to the latest version is as easy as stopping the container, then doing a "docker pull ptarmiganlabs/butler:latest", and finally starting the container again.

Installing and getting started with Butler CW in Docker can look something like this:

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
logLevel: info                    # Log level. Possible log levels are silly, debug, verbose, info, warn, error
fileLogging: false                # true/false to enable/disable logging to disk file

# Heartbeats can be used to send "I'm alive" messages to any other tool, e.g. an infrastructure monitoring tool
heartbeat:
  enabled: false
  remoteURL: http://my.monitoring.server/some/path/
  frequency: every 1 hour         # https://bunkat.github.io/later/parsers.html

# Paths to client certificates to use when connecting to Sense server. Can be pem or pvk/cer
# remove or comment out if running on desktop
# If running in a Docker container, the cert paths MUST be the following
clientCertPath: /nodeapp/config/certificate/client.pem
clientCertKeyPath: /nodeapp/config/certificate/client_key.pem
clientCertCAPath: /nodeapp/config/certificate/root.pem

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
# Frequency attribute must follow rules described here: https://bunkat.github.io/later/parsers.html

apps:
  - server: sense1.mydomain.com
    appId: c36bfbdb-0c4b-4d57-9939-b851d2af1cb5
    appDescription: License monitor
    appStepThroughSheets: true
    freq: every 60 minutes
  - server: sense1.mydomain.com
    appId: dead6f4a-da0b-4b9c-82a2-3f94fdc72599
    appDescription: Meetup.com
    appStepThroughSheets: true
    freq: every 10 minutes
  - server: sense2.mydomain.com
    appId: 492a1bca-1c41-4a01-9104-543a2334c465
    appDescription: 2018 sales targets
    appStepThroughSheets: true
    freq: every 30 minutes
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
      - "/path/to/qliksense/exported/certificates:/nodeapp/config/certificate"
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
Pulling butler-cw (ptarmiganlabs/butler-cw:latest)...
latest: Pulling from ptarmiganlabs/butler-cw
f189db1b88b3: Already exists
3d06cf2f1b5e: Already exists
687ebdda822c: Already exists
99119ca3f34e: Already exists
e771d6006054: Already exists
b0cc28d0be2c: Already exists
7225c154ac40: Already exists
7659da3c5093: Already exists
32189a059676: Pull complete
ccdaa7888b03: Pull complete
2de6787155c6: Pull complete
330f86b51d3a: Pull complete
2f36698de594: Pull complete
Digest: sha256:0bd2c2cdcd2971b11c6a52073d59cc748c6cfa7915bf7915deca3b5ed7d0d9a3
Status: Downloaded newer image for ptarmiganlabs/butler-cw:latest
Creating butler-cw ... done
Attaching to butler-cw
butler-cw    | 2018-09-27T20:29:53.182Z info: Starting Qlik Sense cache warmer.
butler-cw    | 2018-09-27T20:29:53.215Z debug: Loading app config using following config:
butler-cw    |  {
butler-cw    |   "apps": [
butler-cw    |     {
butler-cw    |       "server": "192.168.1.80",
butler-cw    |       "appId": "c36bfbdb-0c4b-4d57-9939-b851d2af1cb5",
butler-cw    |       "appDescription": "License monitor",
butler-cw    |       "appStepThroughSheets": true,
butler-cw    |       "freq": "every 60 minutes"
butler-cw    |     },
butler-cw    |     {
butler-cw    |       "server": "192.168.1.80",
butler-cw    |       "appId": "dead6f4a-da0b-4b9c-82a2-3f94fdc72599",
butler-cw    |       "appDescription": "Meetup.com",
butler-cw    |       "appStepThroughSheets": true,
butler-cw    |       "freq": "every 10 minutes"
butler-cw    |     },
butler-cw    |     {
butler-cw    |       "server": "192.168.1.80",
butler-cw    |       "appId": "492a1bca-1c41-4a01-9104-543a2334c465",
butler-cw    |       "appDescription": "2018 sales targets",
butler-cw    |       "appStepThroughSheets": true,
butler-cw    |       "freq": "every 30 minutes"
butler-cw    |     }
butler-cw    |   ]
butler-cw    | }
butler-cw    | 2018-09-27T20:29:55.177Z debug: --------------------------------
butler-cw    | 2018-09-27T20:29:55.178Z debug: Iteration # 1, Uptime: 1.976 seconds
butler-cw    | 2018-09-27T20:29:55.179Z debug: Iteration # 1, Uptime: 00:00:01.976
butler-cw    | 2018-09-27T20:29:55.179Z debug: --------------------------------
butler-cw    | 2018-09-27T20:29:55.189Z verbose: Starting loading of appid c36bfbdb-0c4b-4d57-9939-b851d2af1cb5
butler-cw    | 2018-09-27T20:29:55.190Z debug: DEBUG SenseUtilities: wss://192.168.1.80:4747/app/c36bfbdb-0c4b-4d57-9939-b851d2af1cb5
butler-cw    | 2018-09-27T20:29:55.256Z verbose: Starting loading of appid dead6f4a-da0b-4b9c-82a2-3f94fdc72599
butler-cw    | 2018-09-27T20:29:55.261Z debug: DEBUG SenseUtilities: wss://192.168.1.80:4747/app/dead6f4a-da0b-4b9c-82a2-3f94fdc72599
butler-cw    | 2018-09-27T20:29:55.268Z verbose: Starting loading of appid 492a1bca-1c41-4a01-9104-543a2334c465
butler-cw    | 2018-09-27T20:29:55.269Z debug: DEBUG SenseUtilities: wss://192.168.1.80:4747/app/492a1bca-1c41-4a01-9104-543a2334c465
butler-cw    | 2018-09-27T20:29:55.354Z debug: Connecting to QIX engine on 192.168.1.80
butler-cw    | 2018-09-27T20:29:55.563Z debug: Connecting to QIX engine on 192.168.1.80
butler-cw    | 2018-09-27T20:29:55.575Z debug: Connecting to QIX engine on 192.168.1.80
butler-cw    | 2018-09-27T20:29:55.759Z info: App loaded: dead6f4a-da0b-4b9c-82a2-3f94fdc72599
butler-cw    | 2018-09-27T20:29:55.770Z info: App loaded: 492a1bca-1c41-4a01-9104-543a2334c465
butler-cw    | 2018-09-27T20:29:55.802Z debug: dead6f4a-da0b-4b9c-82a2-3f94fdc72599: Clear selections
butler-cw    | 2018-09-27T20:29:55.803Z debug: dead6f4a-da0b-4b9c-82a2-3f94fdc72599: Get list of all sheets
butler-cw    | 2018-09-27T20:29:55.821Z debug: 492a1bca-1c41-4a01-9104-543a2334c465: Clear selections
butler-cw    | 2018-09-27T20:29:55.830Z debug: 492a1bca-1c41-4a01-9104-543a2334c465: Get list of all sheets
butler-cw    | 2018-09-27T20:29:55.924Z info: App loaded: c36bfbdb-0c4b-4d57-9939-b851d2af1cb5
butler-cw    | 2018-09-27T20:29:55.989Z debug: 492a1bca-1c41-4a01-9104-543a2334c465: Retrieved list of sheets
butler-cw    | 2018-09-27T20:29:55.993Z debug: dead6f4a-da0b-4b9c-82a2-3f94fdc72599: Retrieved list of sheets
butler-cw    | 2018-09-27T20:29:56.003Z info: App 492a1bca-1c41-4a01-9104-543a2334c465: Cached 0 visualizations on 1 sheets.
butler-cw    | 2018-09-27T20:29:56.006Z verbose: Heap used: 13,314,448
butler-cw    | 2018-09-27T20:29:56.015Z debug: c36bfbdb-0c4b-4d57-9939-b851d2af1cb5: Clear selections
butler-cw    | 2018-09-27T20:29:56.019Z debug: c36bfbdb-0c4b-4d57-9939-b851d2af1cb5: Get list of all sheets
butler-cw    | 2018-09-27T20:29:56.113Z debug: Chart cached (app=dead6f4a-da0b-4b9c-82a2-3f94fdc72599, object type=kpi, object ID=KTsd, object=
butler-cw    | 2018-09-27T20:29:56.170Z debug: Chart cached (app=dead6f4a-da0b-4b9c-82a2-3f94fdc72599, object type=linechart, object ID=BZtHyx, object=Average venue rating per state
butler-cw    | 2018-09-27T20:29:56.171Z debug: Chart cached (app=dead6f4a-da0b-4b9c-82a2-3f94fdc72599, object type=filterpane, object ID=Ffzjwb, object=
butler-cw    | 2018-09-27T20:29:56.172Z debug: Chart cached (app=dead6f4a-da0b-4b9c-82a2-3f94fdc72599, object type=filterpane, object ID=YJEpPT, object=
butler-cw    | 2018-09-27T20:29:56.174Z debug: Chart cached (app=dead6f4a-da0b-4b9c-82a2-3f94fdc72599, object type=map, object ID=APdJrgp, object=
butler-cw    | 2018-09-27T20:29:56.184Z debug: Chart cached (app=dead6f4a-da0b-4b9c-82a2-3f94fdc72599, object type=linechart, object ID=mTGdy, object=Average venue rating per state (events with at least 25 ratings)
butler-cw    | 2018-09-27T20:29:56.213Z debug: Chart cached (app=dead6f4a-da0b-4b9c-82a2-3f94fdc72599, object type=barchart, object ID=bqLyd, object=RSVP Yes
butler-cw    | 2018-09-27T20:29:56.225Z debug: c36bfbdb-0c4b-4d57-9939-b851d2af1cb5: Retrieved list of sheets
...
...
```

Setting the log level to info in the config file will reduce log output *a lot*.

### Storing configuration in Git

While a good idea, this is a slightly complex topic.

Different revision control tools and services (Github, BitBucket etc) work in slightly different ways when it comes to allowing access to files.

In public Github (GH), it is for example possible to read files in public repositories within being logged into Github.

In Github Enterprise (GHE) on the other hand, each company can configure whether their own employees should be able to read files from GHE repositories without being logged into GHE, or whether such access requires the user to be logged into GHE.

Bottom line is that Butler CW in current version logs into GH or GHE, and then read the `apps.yaml` file. The rationale is that most companies will not place their config files on public GH, but rather in GHE or other privat revision control system that require login.

It is worth noting that Butler CW can quite easily be extended to support other revision control tools/solutions.

## Remember!

You cannot pre-load all apps. Focus on a few of the most used apps, and/or some of the biggest ones, where the impact of cache warming will be the greatest.  
Also, remember to do an occasional review what apps are being used, and if needed adjust the cach warming strategy. No point in forcing apps that only a few people use into RAM.

## Links & references

GitHub repository: [https://github.com/ptarmiganlabs/butler-cw](https://github.com/ptarmiganlabs/butler-cw)  
Docker image on Docker Hub: [https://hub.docker.com/u/ptarmiganlabs](https://hub.docker.com/u/ptarmiganlabs)

More info about the Butler family of Qlik Sense utilities can be found at the [Ptarmigan Labs](https://ptarmiganlabs.com/) site, on [Medium](https://medium.com/@mountaindude), over at [Qlik Branch](http://branch.qlik.com/#!/user/56728f52d1e497241ae69a86) or in the [GitHub repositories](https://github.com/ptarmiganlabs).

### Inspiration

Inspiration to this project largely came from Joe Bickley's [Cache Initializer](https://github.com/JoeBickley/CacheInitializer) project.  
At the core Joe's tool does the same as Butler CW, but for individual apps.
  
I wanted a stand-alone tool that by itself handles multiple apps on multiple servers. Also, as the rest of the Butler suite is written in Node.js, I wanted the cache warmer to use the same underlying tech as the rest of the Butler family.

Joe's tool does one thing Butler CW does not do: Allow filters to be applied when opening the app. This is a useful feature and might be included in future versions of Butler CW.

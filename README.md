![Butler CW](img/butler_cw.png)


A cache warming tool for Qlik Sense. 

CW = Cache Warming, i.e. the process of proactively forcing Sense apps to be loaded into RAM, so they are readily available when users open them.

## Background
In recent versions Qlik Sense Enterprise has moved to something called "[shared persistence](http://help.qlik.com/en-US/sense/3.2/Subsystems/Installation/Content/InstallationLicensing/Install-Shared.htm)". It simply means that the Sense apps are stored on a central file server, rather than on each individual server in the Sense environment.  

The upside of this is that there is a single version of each app - the one stored on the file server.   

The downside is that when a user opens a large Sense app, it takes significant time to load large apps from the file server into the QIX engine of the server that the user is connected to.

True, the load time will depend on things like how fast disks are used on the file server, network speed etc - but even with best possible disks and servers that for example Amazon EC2 offers, large apps might take several minutes to load into the QIX engine. This means the user opening the app in question would have to wait that time before starting to use the app. Not a good user experience.  

## Solution

Butler CW consists of three main parts:

* a Node.js app that does the actual cache warming
* a config file (JSON) used by the Node.js app to know where to find server certificates etc
* a separate config file (YAML) for specifying with what frequency what apps should be loaded into which servers.

Why one JSON and one YAML config file? Why not a single config file?  
Good questions.  

Starting with the YAML config file used to specify what apps should be pre-loaded into which servers, that file will probably be edited by several Sense developers/admins. For that reason this file can be stored either on local disk, or as a better solution, on GitHub.
If stored on GitHub, Butler CW will read the config file from GitHub, and you will also get all the traceability and peer review capabilities offerd by GitHub.  
In other words: Sense developers that want their apps pre-loaded in to Sense servers will fork the GitHub repository where the YAML config file lives, make some additions and send a pull request to the upstream repository (which is managed by the Sense admins). 

The JSON config file on the other hand contains sensitive information about where to find the Sense server certificates used when connecting to the Sense servers, and other parameters used to run the actual cache warming service. This file is stored on local disk right next to the Node.js code for the cache warmer itself. 

Finally, using both JSON and YAML. Why not just YAML or ony JSON?  
I was a bit lazy, to be honest. The rest of the Butler tools use JSON config files, so it made sense to use the same general structure in Butler CW's config file.  
On the other hand, YAML is more human readable and thus easier to update for Sense developers.  
The compromise was thus to use different formats for the two config files.

## Installation and setup

Basically the same as for any app in the Butler family:

1. Make sure you have a recent version of [Node.js](https://nodejs.org) installed. Node 6.10.0 was used during development of Butler CW.
2. [Clone the GitHub repository](https://github.com/mountaindude/butler-cw.git) to local disk, or download and extract the [ZIP:ed repo](https://github.com/mountaindude/butler-cw/archive/master.zip) from GitHub.
3. From within the directory where you placed the Butler CW files, run 

    `npm i` 
    
4. Once the various dependencies have downloaded, copy the ./config/default_config.json file to ./config/default.json
5. Edit default.json as needed, using paths etc for your local system
6. Edit ./apps_config.yaml, specifying when Sense apps should be loaded into servers. The frequency field in this config file is quite flexible, you can use any format listed [here](https://bunkat.github.io/laterparsers.htm).  

The "appStepThroughSheets" field (in the YAML file) states whether Butler CW should iterate through all sheets and chart objects in the app. If enabled, and there are lots of sheets and charts, **a lot** of RAM might be used when loading the app into QIX engine. The user experience will on the other hand be great - sheets and the charts on them will load instantly - even those charts that previosuly took long time to render due to complex calculations and/or large data volumes.

Start the service by running "node index.js". Butler CW has been tested on both macOS and Windows Server 2012 R2.

## Remember!
You cannot pre-load all apps. Focus on a few of the most used apps, and/or some of the biggest ones, where the impact of cache warming will be the greatest.  
Also, remember to do an occasional review what apps are being used, and if needed adjust the cach warming strategy. No point in forcing apps that only a few people use into RAM.


## Links & references
Inspiration to this project largely came from Joe Bickley's [Cache Initializer](https://github.com/JoeBickley/CacheInitializer) project.   
At the core Joe's tool does the same as Butler CW, but for individual apps.   
I wanted a stand-alone tool that by itself handles multiple apps on multiple servers. Also, as the rest of the Butler suite is written in Node.js, I wanted the cache warmer to use the same underlying tech as the rest of the Butler family.

Joe's tool does one thing Butler CW does not do: Allow filters to be applied when opening the app. This is a useful feature and might be included in future versions.

More info about the Butler family of Qlik Sense utilities can be found at the [Ptarmigan Labs](https://ptarmiganlabs.com/) site, on [Medium](https://medium.com/@mountaindude), over at [Qlik Branch](http://branch.qlik.com/#!/user/56728f52d1e497241ae69a86) or in my [GitHub repositories](https://github.com/mountaindude). 


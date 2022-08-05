# rrweb-replayer-selenium
## Working Environment
- Ubuntu 20.04 LTS
- Python 3.8.10
- node v14.19.1
- Chrome Version 102.0.5005.61 (Official Build) (64-bit)
## Project Structure
- code-injector-script
  - Javascript code that is used with code-injector to insert rrweb-recorder code in the webpage
- rrweb-recorder-nodejs
  - A dedicated server that is used to receive recording data sent back from code injector script
- rrweb-replayer-nodejs
  - Host a webpage that will rebuild and replay snapshot result
- rrweb-replayer-selenium
  - Automated replayer written using selenium python
- rrweb-scripts
  - Customized rrweb scripts that will be served from jsdelivr
- vnc
  - bash scripts that is used for starting/initializing vncserver
- vncserver-starter
  - web server that creates a vncserver on our remote desktop
## Guide
### rrweb-recorder-nodejs & code-injector-script
To record user interaction for a webpage:
- First, you need to first install [code-injector plugin](https://chrome.google.com/webstore/detail/code-injector/edkcmfocepnifkbnbkmlcmegedeikdeb) in the browser
- Add the webpage you would like to record in the host field in code injector and insert [webpage-recorder.js](https://github.com/StanleyZ0528/rrweb-replayer-selenium/blob/master/code-injector-script/webpage_recorder.js) into the webpage
  - Note that if you are running rrweb-record server in the same machine you need to disable web-security feature of the browser
- Start the server by running [index.js](https://github.com/StanleyZ0528/rrweb-replayer-selenium/blob/master/rrweb-recorder-nodejs/index.js) under rrweb-recorder-nodejs using command: `node index.js`
  - Turn the server on by going to the webpage you want to record toggle the session using shortcut `shift+alt+s`
  - After finishing all the recording you hope to do press `shift+alt+s` again to end the session, and the recording result will be sent back to the server
- Currently recorded result will be saved under rrweb-recorder-nodejs/results
### rrweb-replayer-selenium & rrweb-replayer-nodejs
To replay the recorded results:
- Copy over the result folder of the user session you want to replay under rrweb-pcorder-nodejs/results to rrweb-replayer-nodejs/results
- Set the user session number at the bottom of the code and run [replayer-selenium.py](https://github.com/StanleyZ0528/rrweb-replayer-selenium/blob/master/rrweb-replayer-selenium/replayer-selenium.py) to view replay result, inside this python file it will use a subprocess to call index.js under rrweb-replayer-nodejs for rebuilding the snapshot and replaying the recorded results
### vncserver-starter
To start vncserver-starter webserver:
- To start the web server just run `node index.js` under vncserver-starter folder.
- When requesting this webserver with fields webpage/\<website\>, it will start a vncserver on an available port on our remote machine. Vncserver on startup will open the webpage that is specified in the page. For example, <remote machine ip>:8010/webpage/youtube will open https://www.youtube.com/ by default. List of supported websites to be updated.
- On the web page, you can find a button to go the vnc viewer. By clicking on it, it will redirect you to novnc app that serves the vnc session that just started
### vnc
- Copy the files under this folder to vnc config folder `~/.vnc/`, these scripts will be called automatically by vncserver-starter web server
- Script run.sh is used to start vncserver on a giving port with various of parameters. Script xstartup_\<website\> is called by default on vncserver startup, inside the script it will calls \<website\>_startup script that finds an available port to start a proxy server and opens chrome with page that is specified by different \<website\> fields.

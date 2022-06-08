# rrweb-replayer-selenium
## Language Version
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
## Guide
To record user interaction for a webpage:
- First, you need to first install [code-injector plugin](https://chrome.google.com/webstore/detail/code-injector/edkcmfocepnifkbnbkmlcmegedeikdeb) in the browser
- Add the webpage you would like to record in the host field in code injector and insert [webpage-recorder.js](https://github.com/StanleyZ0528/rrweb-replayer-selenium/blob/master/code-injector-script/webpage_recorder.js) into the webpage
  - Note that if you are running rrweb-record server in the same machine you need to disable web-security feature of the browser
- Start the server by running [index.js](https://github.com/StanleyZ0528/rrweb-replayer-selenium/blob/master/rrweb-recorder-nodejs/index.js) under rrweb-recorder-nodejs using command: `node index.js`
  - Turn the server on by going to the webpage you want to record toggle the session using shortcut `shift+alt+s`
  - After finishing all the recording you hope to do press `shift+alt+s` again to end the session, and the recording result will be sent back to the server
- Currently recorded result will be saved under rrweb-recorder-nodejs/results

To replay the recorded results:
- Copy over the result folder of the user session you want to replay under rrweb-pcorder-nodejs/results to rrweb-replayer-nodejs/results
- Set the user session number at the bottom of the code and run [replayer-selenium.py](https://github.com/StanleyZ0528/rrweb-replayer-selenium/blob/master/rrweb-replayer-selenium/replayer-selenium.py) to view replay result, inside this python file it will use a subprocess to call index.js under rrweb-replayer-nodejs for rebuilding the snapshot

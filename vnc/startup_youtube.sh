#!/bin/bash
for PORT in {7081..7090}
do
        ss -lpn | grep -q ":$PORT " || break
done
echo $PORT
let DIRNUMBER=$PORT-7080
let RECORDERPORT=8000+$DIRNUMBER
let USERSESSION=$((`cat ~/rrweb-replayer-selenium/rrweb-recorder-nodejs/results/count.txt`+1))
~/Desktop/Projects/rrweb-replayer-selenium/rrweb-recorder-nodejs/proxy/bin/mitmdump -s ~/Desktop/Projects/rrweb-replayer-selenium/rrweb-recorder-nodejs/proxy/mitmproxy/examples/contrib/har_dump.py --set hardump=~/Desktop/Projects/rrweb-replayer-selenium/rrweb-recorder-nodejs/proxy/recordings/har$USERSESSION.out --listen-port=$PORT & > /dev/null
node ~/Desktop/Projects/rrweb-replayer-selenium/rrweb-recorder-nodejs/index.js $RECORDPORT
google-chrome 'https://www.youtube.com/' --start-fullscreen --proxy-server="127.0.0.1:$PORT" --disable-site-isolation --disable-web-security --new-window --user-data-dir="~/Desktop/Projects/rrweb-replayer-selenium/data$DIRNUMBER/"

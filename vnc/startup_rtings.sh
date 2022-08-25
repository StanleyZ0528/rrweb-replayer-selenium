#!/bin/bash
for PORT in {7081..7090}
do
        ss -lpn | grep -q ":$PORT " || break
done
echo $PORT
let DIRNUMBER=$PORT-7080
let RECORDERPORT=8000+$DIRNUMBER
node /home/vmuser/rrweb-replayer-selenium/rrweb-recorder-nodejs/index.js $RECORDERPORT &
sleep 1
let USERSESSION=$((`cat /home/vmuser/rrweb-replayer-selenium/rrweb-recorder-nodejs/results/count.txt`))
/home/vmuser/rrweb-replayer-selenium/rrweb-recorder-nodejs/proxy/bin/mitmdump -s /home/vmuser/rrweb-replayer-selenium/rrweb-recorder-nodejs/proxy/mitmproxy/examples/contrib/har_dump.py --set hardump=/home/vmuser/rrweb-replayer-selenium/rrweb-recorder-nodejs/proxy/recordings/har$USERSESSION.out --listen-port=$PORT & > /dev/null
google-chrome 'https://www.rtings.com/' --noerrors --disable-session-crashed-bubble --disable-infobars --kiosk --simulate-outdated-no-au='Tue, 31 Dec 2099 23:59:59 GMT' --kiosk --test-type --no-default-browser-check --start-fullscreen --proxy-server="127.0.0.1:$PORT" --disable-site-isolation --disable-web-security --new-window --user-data-dir="/home/vmuser/rrweb-replayer-selenium/data$DIRNUMBER/"

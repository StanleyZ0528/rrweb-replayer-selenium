#!/bin/bash
for PORT in {7081..7090}
do
        ss -lpn | grep -q ":$PORT " || break
done
echo $PORT
let DIRNUMBER=$PORT-7080
/home/vmuser/rrweb-replayer-selenium/rrweb-recorder-nodejs/proxy/bin/mitmdump -s /home/vmuser/rrweb-replayer-selenium/rrweb-recorder-nodejs/proxy/mitmproxy/examples/contrib/har_dump.py --set hardump=/home/vmuser/rrweb-replayer-selenium/rrweb-recorder-nodejs/proxy/recordings/har$PORT.out --listen-port=$PORT & > /dev/null
google-chrome 'https://www.youtube.com/' --start-fullscreen --proxy-server="127.0.0.1:$PORT" --disable-site-isolation --disable-web-security --new-window --user-data-dir="/home/vmuser/rrweb-replayer-selenium/data$DIRNUMBER/"

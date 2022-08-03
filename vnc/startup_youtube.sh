#!/bin/bash
while :
do
        PORT="`shuf -i 49152-65535 -n 1`"
        ss -lpn | grep -q ":$PORT " || break
done
./bin/mitmdump -s ./mitmproxy/examples/contrib/har_dump.py --set hardump=./recordings/har.out --listen-port=$PORT > /dev/null
google-chrome 'https://www.youtube.com/' --start-fullscreen --proxy-server=`127.0.0.1:$PORT` --disable-site-isolation --disable-web-security --new-window --user-data-dir='/home/vmuser/rrweb-replayer-selenium/data/'

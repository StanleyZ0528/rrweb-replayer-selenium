#!/bin/sh

# ./mitmdump -s ./server.py --set save_stream_file=/home/vmuser/Documents/mitm/save --listen-port=1234 --flow-detail 3
# ./bin/mitmdump -s ./mitmproxy/examples/contrib/jsondump.py --set dump_destination=./recordings/test.out --listen-port=1234 > /dev/null
./bin/mitmdump -s ./mitmproxy/examples/contrib/har_dump.py --set hardump=./recordings/har.out --listen-port=1234 > /dev/null
# ./bin/mitmdump -s ./proxy.py --set out_path=./recordings/har.out --listen-port=1234 

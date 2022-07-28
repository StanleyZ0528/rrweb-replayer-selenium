#!/bin/bash
rm -r -f results/*
./proxy/start_proxy_server.sh
./proxy/start_chrome.sh
node index.js

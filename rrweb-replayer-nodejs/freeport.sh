#! /bin/sh
sudo fuser -k 5000/tcp
pkill chrome
pkill chromium
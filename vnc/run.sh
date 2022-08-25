#!/bin/sh
# Script that will be called on VNCServer starter
vncserver :$1 -geometry 1024x768 -xstartup $2 -MaxConnectionTime=180 -MaxIdleTime=180 -autokill

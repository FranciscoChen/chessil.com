#!/bin/sh

# Restart
cd /home/ubuntu
nohup node queue.js >/dev/null 2>&1 &
sleep 1
nohup node sf.js >/dev/null 2>&1 &

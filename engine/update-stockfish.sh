#!/bin/sh

# go to the src directory for Stockfish on my hard drive (edit accordingly)
cd /home/ubuntu/Stockfish

echo "Adding official Stockfish's public GitHub repository URL as a remote in my local git repository..."
git remote add     official https://github.com/official-stockfish/Stockfish.git
git remote set-url official https://github.com/official-stockfish/Stockfish.git
echo "Downloading official Stockfish's branches and commits..."
git checkout master
echo "Updating my local master branch with the new commits from official Stockfish's master..."
git reset --hard
if [ $(git pull|grep "up to date"|wc -l) -eq 1 ] 
then
echo "No need to do anything."
else
echo "Compiling new master..."
cd /home/ubuntu/Stockfish/src
make clean
make build

# Remove old nn files
ls -t /home/ubuntu/Stockfish/src/nn-*.nnue | tail -n +2 | xargs rm -f

# Find the processes which are using stockfish and kill those processes
kill -9 $(ps -aef|grep 'node sf.js'|grep -Eo 'ubuntu +[0-9]+'|grep -Eo '[0-9]+'|awk '{print $1}')
sleep 1

# Move and overwrite stockfish
mv -f stockfish /home/ubuntu
# Restart the processes
cd /home/ubuntu
nohup node sf.js >/dev/null 2>&1 &
fi
echo "Done."

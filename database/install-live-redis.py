#!/usr/bin/env python3
"""Run as root on the DB host. Read bootstrap credentials from stdin, never argv."""
import json,sys,subprocess,pathlib,os,ipaddress,pwd,grp
settings=json.load(sys.stdin)
password=settings['password']
if len(password)<40 or not password.isalnum():raise SystemExit('Invalid bootstrap secret')
host=str(ipaddress.IPv4Address(settings['host']))
allowed=[str(ipaddress.IPv4Address(ip)) for ip in settings['allowedSources']]
root=pathlib.Path('/etc/chessil/lobby-redis');root.mkdir(parents=True,exist_ok=True)
def run(args):subprocess.run(args,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
if not (root/'ca.crt').exists():
 run(['openssl','req','-x509','-newkey','rsa:3072','-nodes','-days','1825','-keyout',str(root/'ca.key'),'-out',str(root/'ca.crt'),'-subj','/CN=Chessil Lobby Redis CA','-addext','basicConstraints=critical,CA:TRUE'])
 run(['openssl','req','-newkey','rsa:2048','-nodes','-keyout',str(root/'server.key'),'-out',str(root/'server.csr'),'-subj','/CN=lobby-redis.chessil.internal'])
 (root/'server.ext').write_text('subjectAltName=DNS:lobby-redis.chessil.internal,IP:'+host+'\nextendedKeyUsage=serverAuth\nbasicConstraints=critical,CA:FALSE\n')
 run(['openssl','x509','-req','-in',str(root/'server.csr'),'-CA',str(root/'ca.crt'),'-CAkey',str(root/'ca.key'),'-CAcreateserial','-out',str(root/'server.crt'),'-days','825','-extfile',str(root/'server.ext')])
commands='ping info get set del exists expire pexpire ttl pttl mget sadd smembers srem zadd zrem zrange zrangebyscore zremrangebyscore zscore eval evalsha script|load publish subscribe unsubscribe multi exec discard time'
(root/'users.acl').write_text('user default off\nuser lobby on >'+password+' ~lobby:* &lobby:* '+' '.join('+'+c for c in commands.split())+'\n')
(root/'redis.conf').write_text(f'''bind 127.0.0.1 {host}
port 0
tls-port 6380
tls-cert-file {root}/server.crt
tls-key-file {root}/server.key
tls-ca-cert-file {root}/ca.crt
tls-auth-clients no
aclfile {root}/users.acl
protected-mode yes
save ""
appendonly no
maxmemory 256mb
maxmemory-policy noeviction
tcp-keepalive 60
daemonize no
logfile ""
''')
firewall=pathlib.Path('/usr/local/sbin/chessil-lobby-redis-firewall')
firewall.write_text('#!/bin/sh\nset -eu\niptables -N CHESSIL_LOBBY 2>/dev/null || true\niptables -F CHESSIL_LOBBY\n'+''.join('iptables -A CHESSIL_LOBBY -s '+ip+' -j ACCEPT\n' for ip in ['127.0.0.1']+allowed)+'iptables -A CHESSIL_LOBBY -j DROP\niptables -C INPUT -p tcp --dport 6380 -j CHESSIL_LOBBY 2>/dev/null || iptables -I INPUT 1 -p tcp --dport 6380 -j CHESSIL_LOBBY\n')
firewall.chmod(0o750)
uid=pwd.getpwnam('redis').pw_uid;gid=grp.getgrnam('redis').gr_gid
os.chown(root,0,gid);root.chmod(0o750)
for item in root.iterdir():
 os.chown(item,0,gid);item.chmod(0o640 if item.name not in ['ca.key'] else 0o600)
unit=pathlib.Path('/etc/systemd/system/chessil-lobby-redis.service')
unit.write_text(f'''[Unit]
Description=Chessil shared live lobby Redis
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=redis
Group=redis
ExecStartPre=+{firewall}
ExecStart=/usr/bin/redis-server {root}/redis.conf
Restart=always
RestartSec=2
TimeoutStopSec=15
[Install]
WantedBy=multi-user.target
''')
run(['systemctl','daemon-reload']);run(['systemctl','enable','--now','chessil-lobby-redis']);run(['systemctl','restart','chessil-lobby-redis'])
print(json.dumps({'ca':(root/'ca.crt').read_text(),'installed':True}))

#!/usr/bin/env python3
"""Check additive expansion without keeping the complete books in memory."""
import argparse
import itertools
import json
from pathlib import Path
import struct


def blocks(filename):
    with filename.open('rb') as stream:
        records=iter(lambda:stream.read(16),b'')
        for key,group in itertools.groupby(records,key=lambda raw:struct.unpack('>Q',raw[:8])[0]):
            yield key,b''.join(group)


def verify(before,after,max_bytes):
    if after.stat().st_size>max_bytes:
        raise ValueError('Expanded book exceeds size limit')
    current=iter(blocks(after))
    candidate=next(current,None)
    positions=entries=0
    for key,raw in blocks(before):
        while candidate and candidate[0]<key:
            candidate=next(current,None)
        if not candidate or candidate[0]!=key or candidate[1]!=raw:
            raise ValueError('Existing position or move weights changed: '+hex(key))
        positions+=1
        entries+=len(raw)//16
    return {'existing_positions_preserved':positions,'existing_entries_preserved':entries,'old_bytes':before.stat().st_size,'new_bytes':after.stat().st_size,'max_bytes':max_bytes}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--before',type=Path,required=True)
    parser.add_argument('--after',type=Path,required=True)
    parser.add_argument('--max-bytes',type=int,required=True)
    args=parser.parse_args()
    result=verify(args.before,args.after,args.max_bytes)
    report_path=args.after.with_suffix('.json')
    report=json.loads(report_path.read_text())
    report['policy_expansion']['preservation_verification']=result
    report_path.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(result),flush=True)


if __name__=='__main__':main()

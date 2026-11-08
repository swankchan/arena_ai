#!/usr/bin/env python3
"""Experimental joint, grade-smoothed vertical profile; not surveyed or runtime track.
Requires numpy, scipy and osqp. Run from repository root. Results are diagnostic.
"""
import json, math, subprocess
import numpy as np
import scipy.sparse as sp
import osqp

data=json.loads(subprocess.check_output(['node','tools/cities/hongkong/peak-tram-sample-profile.mjs']))
keys=list(data['samples']); index={key:i for i,key in enumerate(keys)}; n=len(keys)
rows=[]; lo=[]; hi=[]
def constrain(row,low,high):
 rows.append(row);lo.append(low);hi.append(high)
for key,p in data['samples'].items():
 constrain({index[key]:1},p.get('min',-np.inf),p.get('max',np.inf))
curvature=[]
for branch in ['A','B']:
 route=data['routes'][branch]
 for a,b in zip(route,route[1:]):
  d=b['s']-a['s'];constrain({index[a['key']]:-1/d,index[b['key']]:1/d},0,data['maxGrade'])
 for a,b,c in zip(route,route[1:],route[2:]):
  d=b['s']-a['s'];e=c['s']-b['s']
  row={index[a['key']]:1/d,index[b['key']]:-1/d-1/e,index[c['key']]:1/e}
  # Bound change of grade per metre of horizontal travel: approximate vertical
  # curvature cap, not a certified operating standard.
  limit=.012*(d+e)/2
  constrain(row,-limit,limit);curvature.append(row)
def matrix(rs):
 rr=[];cc=[];vv=[]
 for r,row in enumerate(rs):
  for c,v in row.items():rr.append(r);cc.append(c);vv.append(v)
 return sp.csc_matrix((vv,(rr,cc)),shape=(len(rs),n))
D=matrix(curvature);target=np.array([data['samples'][k]['ground'] for k in keys]);
# Smoothness penalty plus fit to terrain, subject to sample bounds and slopes.
P=sp.eye(n,format='csc')+10000*(D.T@D);q=-target
solver=osqp.OSQP();solver.setup(P=P,q=q,A=matrix(rows),l=np.array(lo),u=np.array(hi),verbose=False,eps_abs=1e-5,eps_rel=1e-6,max_iter=100000,polishing=True)
result=solver.solve();status=result.info.status
if result.x is None or not status.startswith('solved'):
 print(json.dumps({'status':status,'samples':n,'curvaturePerMetre':.012}));raise SystemExit(1)
h=result.x
output={'status':status,'samples':n,'curvaturePerMetre':.012,'maxGrade':data['maxGrade'],'clearance':data['clearance'],'unknown':[],'routes':{}}
for branch in ['A','B']:
 route=data['routes'][branch];out=[]
 for v in route:
  p=data['samples'][v['key']];out.append({'id':v['key'],'s':v['s'],'x':p['x'],'z':p['z'],'y':float(h[index[v['key']]]),'ground':p['ground']})
  if p.get('unknown'):output['unknown'].append({'branch':branch,'s':v['s'],'name':p['roadName'],'roadId':p['roadId']})
 output['routes'][branch]=out
print(json.dumps(output,separators=(',',':')))

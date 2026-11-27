#!/usr/bin/env python3
"""Bake a compact road graph of Spain from Natural Earth ne_10m_roads (public domain) into art-free roads.js.
Usage: python3 tools/bake-roads.py /path/ne_10m_roads.geojson > tools/roads.js
Output: const ROADS={n:[[lon,lat]...] (1e-3 deg), e:[[a,b,km,nameIndex]...], names:[...], towns:[[name,lon,lat]...]}"""
import json, math, sys
BOX = (-9.5, 36.0, 3.4, 43.9); GRID = 0.03
TOWNS = [("Madrid",-3.7038,40.4168),("Barcelona",2.1686,41.3874),("Valencia",-0.3763,39.4699),("Zaragoza",-0.8891,41.6488),
("Sevilla",-5.9845,37.3891),("Málaga",-4.4214,36.7213),("Bilbao",-2.935,43.263),("Granada",-3.5986,37.1773),("Murcia",-1.1307,37.9922),
("Valladolid",-4.7245,41.6523),("Alicante",-0.481,38.3452),("Córdoba",-4.7794,37.8882),("Tarragona",1.2445,41.1189),("Lleida",0.62,41.6176),
("Guadalajara",-3.167,40.633),("Albacete",-1.858,38.994),("Burgos",-3.697,42.344),("Cuenca",-2.134,40.07),("Requena",-1.10,39.49),
("Teruel",-1.106,40.345),("Castellón",-0.037,39.986),("Calatayud",-1.643,41.353),("Salamanca",-5.663,40.97),("Toledo",-4.027,39.862),
("Jaén",-3.79,37.779),("Almería",-2.4637,36.8381),("Cádiz",-6.2886,36.527),("Huelva",-6.95,37.26),("Badajoz",-6.97,38.879),
("Cáceres",-6.372,39.476),("León",-5.567,42.598),("Oviedo",-5.849,43.362),("Santander",-3.80,43.462),("San Sebastián",-1.981,43.318),
("Pamplona",-1.645,42.812),("Logroño",-2.445,42.465),("Girona",2.821,41.979),("Tortosa",0.52,40.81),("Benidorm",-0.131,38.538)]
def inb(p): return BOX[0]<=p[0]<=BOX[2] and BOX[1]<=p[1]<=BOX[3]
def hav(a,b):
    la1,la2=math.radians(a[1]),math.radians(b[1])
    h=math.sin((la2-la1)/2)**2+math.cos(la1)*math.cos(la2)*math.sin(math.radians(b[0]-a[0])/2)**2
    return 12742*math.asin(math.sqrt(h))
src=json.load(open(sys.argv[1]))
nodes={}; nl=[]; edges={}; names=[""]; ni={"":0}
def node(p):
    k=(round(p[0]/GRID),round(p[1]/GRID))
    if k not in nodes: nodes[k]=len(nl); nl.append((k[0]*GRID,k[1]*GRID))
    return nodes[k]
for f in src["features"]:
    g=f["geometry"]; pr=f["properties"]
    if not g or pr.get("continent")!="Europe": continue
    lines=g["coordinates"] if g["type"]=="MultiLineString" else [g["coordinates"]]
    nm=(pr.get("name") or pr.get("label") or "") or ""
    if nm not in ni: ni[nm]=len(names); names.append(nm)
    for ln in lines:
        pts=[q for q in ln if inb(q)]
        for i in range(len(pts)-1):
            a,b=node(pts[i]),node(pts[i+1])
            if a==b: continue
            km=max(hav(pts[i],pts[i+1]),hav(nl[a],nl[b])); key=(min(a,b),max(a,b))
            if key not in edges or edges[key][0]>km: edges[key]=(km,ni[nm])
# contract chains of degree-2 nodes so the graph stays small
from collections import defaultdict
adj=defaultdict(dict)
for (a,b),(km,n) in edges.items(): adj[a][b]=(km,n); adj[b][a]=(km,n)
for v in list(adj):
    if len(adj[v])==2 and min(abs(nl[v][0]-x)+abs(nl[v][1]-y) for _,x,y in TOWNS)>0.12:
        (a,(k1,n1)),(b,(k2,n2))=adj[v].items()
        if a==b or b in adj[a]: continue
        del adj[a][v]; del adj[b][v]; del adj[v]
        adj[a][b]=adj[b][a]=(k1+k2,n1 or n2)
keep=sorted(adj); re_={v:i for i,v in enumerate(keep)}
nl=[nl[v] for v in keep]
edges={(re_[a],re_[b]):kn for a in adj for b,kn in adj[a].items() if a<b}
out={"n":[[round(x*1000),round(y*1000)] for x,y in nl],
     "e":[[a,b,round(km,1),n] for (a,b),(km,n) in edges.items()],
     "names":names,"towns":[[t,round(x,4),round(y,4)] for t,x,y in TOWNS]}
sys.stdout.write("const ROADS="+json.dumps(out,ensure_ascii=False,separators=(",",":"))+";\n")
sys.stderr.write("nodes %d edges %d\n"%(len(nl),len(edges)))

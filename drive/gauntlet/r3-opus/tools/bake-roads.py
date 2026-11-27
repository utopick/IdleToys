#!/usr/bin/env python3
"""Bake a compact Spain road graph from Natural Earth ne_10m_roads (public domain) into roads.js.
Usage: python3 bake-roads.py /path/ne_10m_roads.geojson [out.js]"""
import json, math, sys, os, heapq
from collections import defaultdict

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'roads.js')
BOX = (-9.5, 36.0, 3.5, 43.9)
GRID = 0.02
CITIES = {"Madrid":(40.4168,-3.7038),"Barcelona":(41.3874,2.1686),"Valencia":(39.4699,-0.3763),"Zaragoza":(41.6488,-0.8891),
"Sevilla":(37.3891,-5.9845),"Málaga":(36.7213,-4.4214),"Bilbao":(43.263,-2.935),"Granada":(37.1773,-3.5986),"Murcia":(37.9922,-1.1307),
"Valladolid":(41.6523,-4.7245),"Alicante":(38.3452,-0.481),"Córdoba":(37.8882,-4.7794),"Tarragona":(41.1189,1.2445),"Lleida":(41.6176,0.62),
"Guadalajara":(40.633,-3.167),"Albacete":(38.994,-1.858),"Burgos":(42.344,-3.697),"A Coruña":(43.362,-8.411),"Salamanca":(40.97,-5.663),"Badajoz":(38.879,-6.97)}

def hav(a, b):
    la1, la2 = math.radians(a[1]), math.radians(b[1])
    h = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin(math.radians(b[0]-a[0])/2)**2
    return 12742 * math.asin(math.sqrt(h))

def inbox(p): return BOX[0] <= p[0] <= BOX[2] and BOX[1] <= p[1] <= BOX[3]
def snap(p): return (round(p[0]/GRID), round(p[1]/GRID))

def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0]-a[0], b[1]-a[1]; L = math.hypot(dx, dy) or 1e-12
    i, dm = 0, -1
    for k in range(1, len(pts)-1):
        d = abs(dy*(pts[k][0]-a[0]) - dx*(pts[k][1]-a[1])) / L
        if d > dm: i, dm = k, d
    if dm <= eps: return [a, b]
    return dp(pts[:i+1], eps)[:-1] + dp(pts[i:], eps)

# 1. lines in the box, cut into runs that stay inside it
lines = []
for f in json.load(open(SRC))['features']:
    g, pr = f['geometry'], f['properties']
    if not g: continue
    parts = g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
    for part in parts:
        run = []
        for p in part:
            if inbox(p): run.append(p)
            else:
                if len(run) > 1: lines.append((run, pr))
                run = []
        if len(run) > 1: lines.append((run, pr))

# 2. junctions: snapped vertices touched by 2+ lines, or line ends
touch = defaultdict(int)
for run, _ in lines:
    for c in {snap(p) for p in run}: touch[c] += 1
names, nidx = [], {}
def name_id(s):
    s = (s or '').strip()
    if s not in nidx: nidx[s] = len(names); names.append(s)
    return nidx[s]
name_id('')
edges = {}  # (a,b) -> [km, name, pts, xw]   a,b are grid cells
def add(a, b, km, nm, pts, xw):
    if a == b: return
    if a > b: a, b, pts = b, a, pts[::-1]
    k = (a, b)
    if k not in edges or edges[k][0] > km: edges[k] = [km, nm, pts, xw]
for run, pr in lines:
    nm, xw = name_id(pr.get('name')), 1 if pr.get('expressway') else 0
    start, km, seg = snap(run[0]), 0.0, [run[0]]
    for i in range(1, len(run)):
        km += hav(run[i-1], run[i]); seg.append(run[i]); c = snap(run[i])
        if i == len(run)-1 or (touch[c] > 1 and c != start):
            add(start, c, km, nm, seg, xw); start, km, seg = c, 0.0, [run[i]]

adj = defaultdict(set)
for a, b in edges: adj[a].add(b); adj[b].add(a)
cell_xy = lambda c: (c[0]*GRID, c[1]*GRID)
# heal: Natural Earth lines often stop just short of each other, so join each dead end to the nearest node within HEAL cells
HEAL = 4
for c in [c for c in adj if len(adj[c]) == 1]:
    best = None
    for dx in range(-HEAL, HEAL+1):
        for dy in range(-HEAL, HEAL+1):
            o = (c[0]+dx, c[1]+dy)
            if o != c and o in adj and o not in adj[c]:
                d = hav(cell_xy(c), cell_xy(o))
                if best is None or d < best[0]: best = (d, o)
    if best:
        add(c, best[1], best[0], 0, [cell_xy(c), cell_xy(best[1])], 0); adj[c].add(best[1]); adj[best[1]].add(c)
def nearest(lat, lon, pool=None):
    return min(pool or adj, key=lambda c: hav(cell_xy(c), (lon, lat)))
city_cell = {n: nearest(*ll) for n, ll in CITIES.items()}

# 3. keep Madrid's component
seen, st = {city_cell['Madrid']}, [city_cell['Madrid']]
while st:
    for m in adj[st.pop()]:
        if m not in seen: seen.add(m); st.append(m)
edges = {k: v for k, v in edges.items() if k[0] in seen and k[1] in seen}
city_cell = {n: nearest(*CITIES[n], seen) if c not in seen else c for n, c in city_cell.items()}

# 4. prune: contract degree-2 non-city nodes (merge edge chains), adjacency updated in place
keep = set(city_cell.values())
adj = defaultdict(set)
for x, y in edges: adj[x].add(y); adj[y].add(x)
K = lambda x, y: (min(x, y), max(x, y))
todo = list(adj)
while todo:
    n = todo.pop()
    nb = adj.get(n)
    if not nb or n in keep or len(nb) != 2: continue
    u, w = sorted(nb)
    e1, e2 = edges.pop(K(u, n)), edges.pop(K(n, w))
    p1 = e1[2] if u < n else e1[2][::-1]   # u -> n
    p2 = e2[2] if n < w else e2[2][::-1]   # n -> w
    del adj[n]; adj[u].discard(n); adj[w].discard(n)
    km = e1[0] + e2[0]
    if K(u, w) not in edges or edges[K(u, w)][0] > km:
        edges[K(u, w)] = [km, e1[1] if e1[0] >= e2[0] else e2[1], p1 + p2[1:], e1[3] & e2[3]]
    adj[u].add(w); adj[w].add(u)
    todo += [u, w]

# 5. write
cells = sorted({c for k in edges for c in k})
ix = {c: i for i, c in enumerate(cells)}
used = sorted({v[1] for v in edges.values()})
nmap = {o: i for i, o in enumerate(used)}
n_out = []
for c in cells: n_out += [round(c[0]*GRID, 3), round(c[1]*GRID, 3)]
e_out = []
for (a, b), (km, nm, pts, xw) in edges.items():
    mid = dp(pts, 0.02)[1:-1]
    flat = []
    for p in mid: flat += [round(p[0], 2), round(p[1], 2)]
    e_out.append([ix[a], ix[b], round(km, 1), nmap[nm], flat, xw])
data = {"n": n_out, "e": e_out, "names": [names[o] for o in used], "cities": {k: ix[c] for k, c in city_cell.items()}}
JS = r"""
function _rAdj(){if(ROADS._adj)return ROADS._adj;const A=[];for(let i=0;i<ROADS.n.length/2;i++)A.push([]);ROADS.e.forEach((e,i)=>{A[e[0]].push(i);A[e[1]].push(i);});return ROADS._adj=A;}
function _rHav(lo1,la1,lo2,la2){const r=Math.PI/180,a=Math.sin((la2-la1)*r/2)**2+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin((lo2-lo1)*r/2)**2;return 12742*Math.asin(Math.sqrt(a));}
function route(from,to){const s=typeof from==='number'?from:ROADS.cities[from],t=typeof to==='number'?to:ROADS.cities[to];if(s==null||t==null)return null;
const A=_rAdj(),N=A.length,D=new Float64Array(N).fill(Infinity),P=new Int32Array(N).fill(-1),H=[[0,s]];D[s]=0;
const push=x=>{H.push(x);let i=H.length-1;while(i>0){const p=(i-1)>>1;if(H[p][0]<=H[i][0])break;[H[p],H[i]]=[H[i],H[p]];i=p;}};
const pop=()=>{const top=H[0],l=H.pop();if(H.length){H[0]=l;let i=0;for(;;){let m=i,a=2*i+1,b=a+1;if(a<H.length&&H[a][0]<H[m][0])m=a;if(b<H.length&&H[b][0]<H[m][0])m=b;if(m===i)break;[H[m],H[i]]=[H[i],H[m]];i=m;}}return top;};
while(H.length){const[d,u]=pop();if(d>D[u])continue;if(u===t)break;for(const ei of A[u]){const e=ROADS.e[ei],v=e[0]===u?e[1]:e[0],nd=d+e[2];if(nd<D[v]){D[v]=nd;P[v]=ei;push([nd,v]);}}}
if(D[t]===Infinity)return null;const legs=[];let v=t;
while(v!==s){const e=ROADS.e[P[v]],u=e[0]===v?e[1]:e[0],n=ROADS.n,pts=[];for(let i=0;i<e[4].length;i+=2)pts.push([e[4][i],e[4][i+1]]);if(e[0]!==u)pts.reverse();
pts.unshift([n[2*u],n[2*u+1]]);pts.push([n[2*v],n[2*v+1]]);legs.push({a:u,b:v,km:e[2],name:ROADS.names[e[3]],expressway:e[5],pts});v=u;}
legs.reverse();return{km:Math.round(D[t]*10)/10,legs};}
function citiesNear(lon,lat,maxKm){const n=ROADS.n;return Object.keys(ROADS.cities).filter(c=>{const i=ROADS.cities[c];return _rHav(lon,lat,n[2*i],n[2*i+1])<=maxKm;});}
if(typeof module!=='undefined')module.exports={ROADS,route,citiesNear};
"""
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('const ROADS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';' + JS.replace('\n', '\n'))
print(OUT, len(cells), 'nodes', len(e_out), 'edges', os.path.getsize(OUT), 'bytes')

// A* over the baked graph (copied into index.html between ROUTE-START/END; tested by tools/route.test.mjs)
function kmBetween(a,b){const r=Math.PI/180,la1=a[1]*r,la2=b[1]*r,h=Math.sin((la2-la1)/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin((b[0]-a[0])*r/2)**2;return 12742*Math.asin(Math.sqrt(h));}
function buildGraph(R){const P=R.n.map(p=>[p[0]/1000,p[1]/1000]),adj=P.map(()=>[]);for(const [a,b,km,n] of R.e){adj[a].push([b,km,n]);adj[b].push([a,km,n]);}return {P,adj};}
function nearestNode(G,p){let best=-1,bd=1e9;G.P.forEach((q,i)=>{if(!G.adj[i].length)return;const d=kmBetween(p,q);if(d<bd){bd=d;best=i;}});return best;}
function findRoute(G,from,to){const s=nearestNode(G,from),t=nearestNode(G,to),g=new Map([[s,0]]),prev=new Map(),open=[[kmBetween(G.P[s],G.P[t]),s]],done=new Set();
 while(open.length){open.sort((x,y)=>x[0]-y[0]);const [,u]=open.shift();if(u===t)break;if(done.has(u))continue;done.add(u);
  for(const [v,km,n] of G.adj[u]){const ng=g.get(u)+km;if(ng<(g.has(v)?g.get(v):1e9)){g.set(v,ng);prev.set(v,[u,km,n]);open.push([ng+kmBetween(G.P[v],G.P[t]),v]);}}}
 if(!g.has(t))return null;const legs=[];let v=t;while(v!==s){const [u,km,n]=prev.get(v);legs.unshift({a:u,b:v,km,n});v=u;}
 const pts=[G.P[s]],cum=[0];let tot=0;for(const l of legs){tot+=l.km;pts.push(G.P[l.b]);cum.push(tot);}
 const a0=kmBetween(from,G.P[s]),b0=kmBetween(G.P[t],to);pts.unshift(from);cum.unshift(0);for(let i=1;i<cum.length;i++)cum[i]+=a0;pts.push(to);cum.push(tot+a0+b0);
 return {km:tot+a0+b0,pts,cum,legs};}

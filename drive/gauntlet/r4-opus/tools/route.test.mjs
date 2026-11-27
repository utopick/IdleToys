import test from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs'; import vm from 'node:vm';
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('roads.js',import.meta.url),'utf8').replace('const ROADS','var ROADS')+fs.readFileSync(new URL('route.js',import.meta.url),'utf8'),ctx);
const G=ctx.buildGraph(ctx.ROADS),T=Object.fromEntries(ctx.ROADS.towns.map(t=>[t[0],[t[1],t[2]]]));
for(const [a,b,lo,hi] of [["Madrid","Valencia",290,420],["Valencia","Barcelona",290,420],["Barcelona","Zaragoza",250,360],["Zaragoza","Madrid",270,380]])
 test(a+'-'+b,()=>{const r=ctx.findRoute(G,T[a],T[b]);assert.ok(r,'no route');console.log(a,b,r.km.toFixed(0));assert.ok(r.km>lo&&r.km<hi,String(r.km));});

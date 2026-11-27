// Generates art/dungeon.png + art/dungeon.json (node built-ins only).
const fs=require('fs'),zlib=require('zlib'),path=require('path');
const OUT=path.join(__dirname,'..','art');
const W=1280,H=328,img=new Uint8Array(W*H*4);
let seed=1234567;const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>>17;seed^=seed<<5;seed>>>=0;return seed/4294967296;};
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const sh=(c,k)=>c.map(v=>Math.max(0,Math.min(255,Math.round(v*k))));
let OX=0,OY=0,FW=640,FH=100;
function px(x,y,c,a=255){x|=0;y|=0;if(x<0||y<0||x>=FW||y>=FH)return;const i=((OY+y)*W+OX+x)*4;img[i]=c[0];img[i+1]=c[1];img[i+2]=c[2];img[i+3]=a;}
function get(x,y){const i=((OY+y)*W+OX+x)*4;return [img[i],img[i+1],img[i+2]];}
function rect(x,y,w,h,c){for(let j=0;j<h;j++)for(let i=0;i<w;i++)px(x+i,y+j,c);}
function frame(x,y,w,h){OX=x;OY=y;FW=w;FH=h;}
// value noise
function hash(x,y){let h=(x*374761393+y*668265263+seed0)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967296;}
let seed0=99;
function vn(x,y,s){const gx=Math.floor(x/s),gy=Math.floor(y/s),fx=x/s-gx,fy=y/s-gy;const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
 const a=hash(gx,gy),b=hash(gx+1,gy),c=hash(gx,gy+1),d=hash(gx+1,gy+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
const fbm=(x,y)=>vn(x,y,16)*.5+vn(x,y,7)*.3+vn(x,y,3)*.2;
const BAY=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
// rough rock with dithered shades
function rock(x0,y0,w,h,base,dark=1){for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){
 let n=fbm(x+OX*3,y+OY*5);const cr=vn(x+OX,y,5);let k=.55+n*.7;if(cr<.12)k*=.45;
 const t=BAY[y&3][x&3]/16;k=Math.floor(k*5+t)/5;px(x,y,sh(base,k*dark));}}
function bricks(x0,y0,w,h,base,mortar,bw=8,bh=4){for(let y=y0;y<y0+h;y++){const row=Math.floor((y-y0)/bh);const off=(row&1)*(bw>>1);
 for(let x=x0;x<x0+w;x++){const bx=Math.floor((x-x0+off)/bw);const lx=(x-x0+off)%bw,ly=(y-y0)%bh;
  if(lx==0||ly==0){px(x,y,sh(mortar,.8+hash(x,y)*.4));continue;}
  const bk=.7+hash(bx*7+row,row*13+bx)*.5;let k=bk*(.85+hash(x,y*3)*.25);if(ly==1)k*=1.12;if(lx==bw-1||ly==bh-1)k*=.8;
  if(vn(x,y,9)<.18)k*=.6; // worn patches
  px(x,y,sh(base,k));}}}
function planks(x0,y0,w,h,base,vert){for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){const a=vert?x-x0:y-y0,b=vert?y:x;
 const p=Math.floor(a/3);let k=.75+hash(p,7)*.35+Math.sin(b*.7+p)*.05;if(a%3==2)k*=.55;if(hash(x,y)<.03)k*=.6;px(x,y,sh(base,k));}}
function line(x0,y0,x1,y1,c){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1;for(let i=0;i<=n;i++)px(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),c);}
function darken(x0,y0,w,h,k){for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++){if(x<0||y<0||x>=FW||y>=FH)continue;px(x,y,sh(get(x,y),k));}}
function stalac(x,y,len,c){for(let j=0;j<len;j++){const hw=Math.max(0,Math.round((len-j)/len*2.5));for(let i=-hw;i<=hw;i++)px(x+i,y+j,sh(c,i==-hw?1.25:i==hw?.6:.9));}}
function stalag(x,y,len,c){for(let j=0;j<len;j++){const hw=Math.max(0,Math.round((len-j)/len*2.5));for(let i=-hw;i<=hw;i++)px(x+i,y-j,sh(c,i==-hw?1.25:i==hw?.6:.9));}}
// generic level: rock, carved corridor (cave or room sections), floor
function level(P,sections){rock(0,0,640,100,P.rock);
 for(const s of sections){if(s.t=='cave'){for(let x=s.x;x<s.x+s.w;x++){const e=Math.min(x-s.x,s.x+s.w-x);
   const top=Math.round(36-Math.min(e,14)*1.2+ (vn(x,3,11)-.5)*14);for(let y=Math.max(4,top);y<92;y++){
    let k=.42+fbm(x*1.3,y*1.3)*.35;k*=0.55+0.45*(y-top)/(92-top);const t=BAY[y&3][x&3]/16;k=Math.floor(k*6+t)/6;px(x,y,sh(P.back,k));}
   px(x,top,sh(P.rock,1.3));px(x,top+1,sh(P.back,.25));}
   for(let i=0;i<s.w/14;i++)stalac(s.x+ri(6,s.w-6),ri(14,26),ri(4,11),P.rock);}
  else{const top=s.top||22;rect(s.x,top-3,s.w,3,sh(P.trim,.9));line(s.x,top-3,s.x+s.w-1,top-3,sh(P.trim,1.3));
   bricks(s.x,top,s.w,92-top,P.brick,sh(P.brick,.35),s.bw||8,s.bh||4);darken(s.x,top,s.w,4,.6);
   for(const px_ of [s.x,s.x+s.w-5]){bricks(px_,top,5,92-top,sh(P.trim,1.1),sh(P.trim,.4),5,3);line(px_,top,px_,91,sh(P.trim,1.4));}}}
 // floor
 for(let x=0;x<640;x++)for(let y=92;y<100;y++){let k=(y==92?1.3:y==93?1.05:.75-(y-94)*.06)*(.8+hash(x,y)*.35);if(y>93&&vn(x,y,4)<.2)k*=.6;px(x,y,sh(P.floor,k));}
 // stones on floor + vignetting top
 for(let i=0;i<40;i++){const x=ri(0,638);px(x,91,sh(P.floor,1.1));px(x+1,91,sh(P.floor,.8));}
 darken(0,0,640,10,.7);}
// ---------- props ----------
function barrel(x,y,c=hex('#6a4426')){for(let j=0;j<10;j++){const hw=j==0||j==9?3:4;for(let i=-hw;i<hw;i++){let k=.7+(i<0?.25:-.05)-(Math.abs(i)>2?.25:0);
 if(j==2||j==7)k=.45;px(x+i,y-10+j,j==2||j==7?[70,70,75].map(v=>v*(.8+(i<0?.4:0))|0):sh(c,k));}}}
function chest(x,y){for(let j=0;j<8;j++)for(let i=0;i<10;i++){let c=sh([110,62,30],.8+(j<3?.25:0)-(i==0||i==9?.25:0));if(j==3)c=[150,120,40];if(i==2||i==7)c=[90,80,60];if(j==4&&i>=4&&i<=5)c=[230,200,80];if(j==0&&(i==0||i==9))continue;px(x+i,y-8+j,c);}}
function bonesP(x,y){const c=[200,190,165],d=[130,120,100];line(x,y-1,x+6,y-2,c);line(x+1,y-1,x+7,y,d);px(x,y-2,c);px(x+6,y-3,c);px(x+7,y-1,c);rect(x+3,y-4,2,2,c);px(x+3,y-3,[40,30,30]);}
function mush(x,y,cap,stem=[190,180,160],s=1){const r=Math.round(3*s),hgt=Math.round(4*s);for(let j=0;j<hgt;j++){px(x,y-1-j,sh(stem,.9));px(x-1,y-1-j,sh(stem,.7));if(s>1.5)px(x+1,y-1-j,sh(stem,.55));}
 for(let j=0;j<=r;j++){const hw=Math.round(Math.sqrt(Math.max(0,r*r-(r-j)*(r-j)))*1.4)+1;for(let i=-hw;i<=hw;i++)px(x+i,y-hgt-r+j,sh(cap,j==0?1.3:i<0?1.1:.75));}
 px(x-1,y-hgt-r+1,sh(cap,1.6));if(r>2)px(x+2,y-hgt-r+2,sh(cap,1.5));}
function sconce(x,y){rect(x-1,y,3,3,[45,40,38]);px(x,y+3,[30,28,26]);rect(x-1,y-2,3,2,[90,55,25]);px(x,y-3,[160,90,40]);} // unlit torch, flame drawn by code
function lantern(x,y){line(x,y-6,x,y-3,[50,45,40]);rect(x-2,y-3,5,5,[55,45,30]);rect(x-1,y-2,3,3,[120,90,45]);px(x,y-1,[170,130,60]);}
function candle(x,y){rect(x,y-4,2,4,[200,190,160]);px(x,y-4,[230,220,190]);px(x,y-5,[60,50,40]);rect(x-1,y,4,1,[80,70,60]);}
function bars(x,y,w,h,c){for(let i=0;i<w;i+=3){line(x+i,y,x+i,y+h,c);px(x+i,y,sh(c,1.5));}line(x,y+2,x+w-1,y+2,c);line(x,y+h-3,x+w-1,y+h-3,c);}
function chain(x,y,len){for(let j=0;j<len;j++)px(x+(j%2),y+j,j%2?[70,70,75]:[110,110,115]);}
function shelf(x,y,w,h,wood){planks(x,y,w,h,sh(wood,.6),true);rect(x,y,w,1,sh(wood,1.2));for(let r=y+2;r<y+h-2;r+=6){rect(x+1,r+4,w-2,1,sh(wood,1.1));
 for(let i=x+1;i<x+w-1;){const bw=ri(1,2),bh=ri(2,4),col=hex(['#6a2020','#203a6a','#2e5a2a','#6a5a20','#4a2a5a','#5a3a24'][ri(0,5)]);rect(i,r+4-bh,bw,bh,col);px(i,r+4-bh,sh(col,1.5));i+=bw+(rnd()<.2?1:0);}}}
function banner(x,y,w,h,c){line(x-1,y,x+w,y,[90,70,40]);for(let j=1;j<h;j++)for(let i=0;i<w;i++){if(j>h-3&&((i+(j-h+3))%3==0))continue;px(x+i,y+j,sh(c,.7+(i==0?.3:0)+hash(i,j)*.2));}
 rect(x+(w>>1)-1,y+4,2,4,sh(c,1.6));}
function sarco(x,y,w){rect(x,y-7,w,7,[70,78,92]);rect(x+1,y-9,w-2,2,[95,105,120]);line(x+1,y-9,x+w-2,y-9,[125,135,150]);for(let i=x+2;i<x+w-2;i+=4)px(i,y-4,[45,50,60]);rect(x+(w>>1)-1,y-8,2,1,[150,150,160]);}
function arch(x,y,w,h,c){for(let i=0;i<w;i++){const t=(i/(w-1))*2-1;const ay=y+Math.round((1-Math.sqrt(1-t*t))*(w/2));for(let k=0;k<3;k++)px(x+i,ay+k,sh(c,k==0?1.3:.9-k*.1));}
 for(let j=y+Math.round(w/2);j<y+h;j++){px(x,j,sh(c,1.1));px(x+1,j,sh(c,.8));px(x+w-1,j,sh(c,.7));px(x+w-2,j,sh(c,.9));}}
function niche(x,y){const inner=[18,18,24];rect(x,y,10,7,inner);arch(x-1,y-4,12,11,[90,96,110]);bonesP(x+1,y+6);rect(x+4,y+1,3,3,[190,180,160]);px(x+4,y+2,[30,25,25]);px(x+6,y+2,[30,25,25]);}
function pillar(x,top,bot,w,c,broken){const t=broken?top+ri(10,30):top;bricks(x,t,w,bot-t,c,sh(c,.4),w,4);line(x,t,x,bot,sh(c,1.3));
 if(broken)for(let i=0;i<w;i++)for(let j=0;j<ri(1,3);j++)px(x+i,t-j,sh(c,.9));else{rect(x-1,top,w+2,2,sh(c,1.2));}rect(x-1,bot-2,w+2,2,sh(c,1.1));}
let CUR=null;const L=(x,y,c)=>(CUR.lights=CUR.lights||[]).push({x,y,c});
const frames={};const F=(n,x,y,w,h,ax=0,ay=0)=>{CUR=frames[n]={x,y,w,h,ax,ay};frame(x,y,w,h);};
// ---------- levels ----------
function lvCellar(){F('lvl_cellar',0,0,640,100);seed0=11;const P={rock:hex('#4a3624'),back:hex('#3a2a1c'),brick:hex('#5a4030'),trim:hex('#6a5038'),floor:hex('#4e3a26')};
 level(P,[{t:'cave',x:0,w:150},{t:'room',x:150,w:130,top:24},{t:'cave',x:280,w:110},{t:'room',x:390,w:120,top:28,bw:10,bh:5},{t:'cave',x:510,w:130}]);
 // mine timber props in caves
 for(const x of [30,95,300,355,540,600]){planks(x,30,3,62,hex('#5a3a1e'),true);planks(x+3,30,3,62,hex('#4a2e18'),true);}
 for(const x of [30,300,540]){planks(x,28,68,3,hex('#5c3c20'),false);}
 // rail
 for(let x=0;x<150;x+=5)rect(x,91,3,1,[60,40,25]);line(0,90,149,90,[110,100,95]);for(let x=540;x<640;x+=5)rect(x,91,3,1,[60,40,25]);line(540,90,639,90,[110,100,95]);
 // mine cart
 rect(560,80,22,9,[70,62,58]);line(560,80,581,80,[120,110,100]);for(let i=562;i<580;i+=5)line(i,81,i,88,[55,48,44]);for(const wx of [564,577]){rect(wx-1,88,3,2,[30,30,30]);px(wx,88,[90,90,90]);}
 for(let i=0;i<6;i++)px(ri(562,579),79,[90,85,70]);
 // wine racks room
 for(let r=0;r<3;r++)planks(160+r*40,40,30,50,hex('#3e2814'),true);
 for(let r=0;r<3;r++)for(let yy=44;yy<88;yy+=5)for(let xx=163+r*40;xx<187+r*40;xx+=5){rect(xx,yy,3,3,[30,15,15]);px(xx,yy,[90,30,40]);px(xx+1,yy+1,[50,20,25]);}
 barrel(255,92);barrel(265,92);barrel(260,82);
 // storeroom: barrels, sacks, shelf
 for(const x of [405,414,423,500])barrel(x,92);barrel(409,82);
 shelf(440,40,40,30,hex('#5a3a20'));for(let i=0;i<3;i++){rect(450+i*9,84,7,8,[120,100,70]);px(452+i*9,84,[150,130,90]);}
 sconce(215,46);L(215,42,'#ffaa55');lantern(60,40);L(60,39,'#ffbb66');lantern(330,38);L(330,37,'#ffbb66');sconce(455,36);L(455,32,'#ffaa55');lantern(610,40);L(610,39,'#ffbb66');}
function lvFungus(){F('lvl_fungus',640,0,640,100);seed0=22;const P={rock:hex('#2e3a34'),back:hex('#252a33'),brick:hex('#3a4038'),trim:hex('#4a5048'),floor:hex('#34402e')};
 level(P,[{t:'cave',x:0,w:250},{t:'room',x:250,w:150,top:30,bw:7},{t:'cave',x:400,w:240}]);
 // moss specks and violet veins
 for(let i=0;i<260;i++){const x=ri(0,639),y=ri(0,91);const c=get(x,y);if(c[0]+c[1]+c[2]<140&&c[0]+c[1]+c[2]>60)px(x,y,rnd()<.5?[50,75,45]:[60,40,75]);}
 // giant mushrooms
 const big=[[60,hex('#7a2a8a'),2.4],[180,hex('#2a8a9a'),2],[470,hex('#9a2a6a'),2.6],[590,hex('#2a9aa0'),1.8]];
 for(const [x,c,s] of big){mush(x,92,c,[150,150,130],s);}
 for(let i=0;i<22;i++){const x=ri(4,636);if(x>250&&x<400)continue;mush(x,92,rnd()<.4?hex('#30b0c0'):rnd()<.5?hex('#b03090'):hex('#806040'),[170,160,140],.7+rnd()*.5);}
 // hanging fungus on ceilings
 for(let i=0;i<18;i++){const x=ri(4,636);if(x>250&&x<400)continue;for(let y=10;y<40;y++){if(get(x,y)[0]<50&&get(x,y-1)[0]>50){chain(x,y,ri(2,6));px(x,y+5,[60,190,180]);break;}}}
 // farm room: beds and fence
 for(let b=0;b<3;b++){const bx=265+b*42;rect(bx,86,34,6,[50,36,24]);for(let i=bx;i<bx+34;i+=2)px(i,86,[70,52,34]);for(let i=bx+3;i<bx+32;i+=6)mush(i,86,b==1?hex('#30b0c0'):hex('#a07050'),[180,170,150],.6);}
 for(let x=258;x<395;x+=6){line(x,83,x,91,[110,80,50]);px(x,82,[140,100,60]);}line(258,85,394,85,[90,65,40]);line(258,88,394,88,[80,60,36]);
 shelf(300,40,26,22,hex('#4a3a24'));banner(350,36,10,18,hex('#3a5a3a'));
 L(62,77,'#cc55ff');L(181,80,'#55e0ff');L(471,74,'#ff55bb');L(591,82,'#55ffee');sconce(340,50);L(340,46,'#ffaa55');L(330,80,'#55e0ff');}
function lvRiver(){F('lvl_river',0,100,640,100);seed0=33;const P={rock:hex('#34404c'),back:hex('#232c38'),brick:hex('#404a58'),trim:hex('#505a68'),floor:hex('#3a4450')};
 level(P,[{t:'cave',x:0,w:200},{t:'room',x:200,w:120,top:26},{t:'cave',x:320,w:320}]);
 // water channel y86-100 except a bank, with a stone bridge at 400-470
 for(let x=0;x<640;x++){const isBridge=x>=400&&x<470;for(let y=86;y<100;y++){if(isBridge&&y<92)continue;
  let c=[14,44,50];const d=(y-86)/14;c=sh(c,1-d*.4);if(((x+y*3)%11==0&&y<90)||(hash(x,y)<.04))c=[60,130,135];if(y==86)c=hash(x,1)<.5?[70,150,150]:[40,95,100];px(x,y,c);}}
 // bridge
 bricks(400,86,70,6,hex('#56606c'),hex('#2a3038'),7,3);line(400,85,469,85,[120,130,140]);for(let i=0;i<70;i++){const t=(i/69)*2-1;const ay=96-Math.round((1-t*t)*4);for(let y=ay;y<100;y++)px(400+i,y,sh([60,68,78],.7));}
 for(let x=410;x<470;x+=12)rect(x,95,6,5,[10,30,36]);
 // walkway ledges where water is: floor surface stays at y92 (stepping stones)
 for(let x=0;x<640;x+=ri(9,15)){if(x>=396&&x<474)continue;const w=ri(5,8);rect(x,92,w,2,[70,80,92]);line(x,92,x+w-1,92,[110,120,132]);}
 // waterfall at x 540
 for(let y=0;y<86;y++)for(let x=536;x<546;x++){const k=hash(x,y*7+((x*5)>>1));px(x,y,k<.25?[180,220,230]:k<.6?[60,120,140]:[30,80,100]);}
 for(let x=530;x<552;x++)for(let y=84;y<90;y++)if(hash(x,y)<.4)px(x,y,[200,230,235]);
 // stalactites + stalagmites
 for(let i=0;i<14;i++)stalac(ri(330,630),ri(14,24),ri(6,16),P.rock);
 for(const x of [50,130,350])stalag(x,92,ri(5,9),P.rock);
 // room: drains + arches
 arch(214,40,24,52,hex('#5a6472'));arch(282,40,24,52,hex('#5a6472'));bars(218,54,16,36,[70,75,85]);chain(260,26,30);chain(266,26,24);
 sconce(258,62);L(258,58,'#ffaa55');lantern(100,42);L(100,41,'#ffcc77');lantern(380,36);L(380,35,'#ffcc77');L(541,60,'#66ccff');candle(300,91);L(301,86,'#ffcc66');}
function lvCrypt(){F('lvl_crypt',640,100,640,100);seed0=44;const P={rock:hex('#2c323e'),back:hex('#20242e'),brick:hex('#4a5262'),trim:hex('#5a6274'),floor:hex('#3a404c')};
 level(P,[{t:'room',x:0,w:200,top:22},{t:'cave',x:200,w:80},{t:'room',x:280,w:180,top:20,bw:9,bh:4},{t:'cave',x:460,w:40},{t:'room',x:500,w:140,top:26}]);
 // arches + sarcophagi
 for(const x of [20,80,140]){arch(x,36,40,56,hex('#606878'));darken(x+3,58,34,34,.55);}
 sarco(28,92,24);sarco(148,92,24);bonesP(95,92);candle(90,91);candle(110,91);
 for(const x of [24,64,104,144,184])niche(x-6,28);
 // gate
 rect(232,40,26,52,[14,14,18]);arch(230,30,30,62,hex('#5a6070'));bars(234,46,24,46,[80,84,92]);
 // library
 for(let i=0;i<5;i++)shelf(290+i*33,34,28,56,hex('#4a3020'));banner(325,24,8,14,hex('#5a1a1a'));banner(390,24,8,14,hex('#5a1a1a'));
 candle(310,91);candle(420,91);
 // ossuary room
 for(let i=0;i<4;i++)niche(512+i*30,40);for(let i=0;i<4;i++)niche(512+i*30,60);sarco(560,92,26);bonesP(600,92);bonesP(520,92);
 sconce(60,46);L(60,42,'#ffaa55');sconce(185,46);L(185,42,'#ffaa55');L(91,86,'#ffcc66');L(311,86,'#ffcc66');L(421,86,'#ffcc66');sconce(590,32);L(590,28,'#ffaa55');}
function lvHoard(){F('lvl_hoard',0,200,640,100);seed0=55;const P={rock:hex('#4a2420'),back:hex('#30181a'),brick:hex('#5a2c26'),trim:hex('#6a3a30'),floor:hex('#4a2a22')};
 level(P,[{t:'cave',x:0,w:120},{t:'room',x:120,w:230,top:18,bw:9},{t:'cave',x:350,w:290}]);
 // vault ribs
 for(let i=0;i<4;i++)arch(140+i*50,22,50,10,hex('#7a4636'));
 // broken pillars
 pillar(150,34,92,8,hex('#6a3a30'),false);pillar(200,34,92,8,hex('#6a3a30'),true);pillar(260,34,92,8,hex('#6a3a30'),true);pillar(320,34,92,8,hex('#6a3a30'),false);
 for(let i=0;i<10;i++){const x=ri(130,340);rect(x,90,ri(2,4),2,[90,55,45]);}
 // throne ruin
 rect(226,62,22,4,[90,30,30]);rect(230,52,14,30,[70,40,30]);rect(232,44,10,10,[80,46,34]);px(234,43,[150,110,50]);px(239,43,[150,110,50]);rect(226,82,22,10,[60,34,28]);line(226,82,247,82,[110,70,50]);
 rect(232,64,10,6,[110,30,30]);
 banner(170,26,9,22,hex('#6a1818'));banner(290,26,9,16,hex('#6a1818'));
 // claw marks, scorch in the hoard area, keep it empty
 darken(380,30,140,62,.75);for(let i=0;i<3;i++)line(440+i*4,40,446+i*4,52,[25,12,12]);
 for(let i=0;i<8;i++)stalac(ri(360,630),ri(14,24),ri(5,12),P.rock);
 bonesP(50,92);bonesP(570,92);chest(590,92);
 sconce(175,56);L(175,52,'#ffaa55');sconce(300,56);L(300,52,'#ffaa55');sconce(237,36);L(237,32,'#ff7744');lantern(60,40);L(60,39,'#ffaa55');sconce(560,46);L(560,42,'#ffaa55');}
function rockBand(){F('rock',640,200,640,14);seed0=66;
 for(let y=0;y<14;y++)for(let x=0;x<640;x++){const st=Math.floor((y+Math.sin(x*.03)*2+vn(x,0,20)*3)/3.5);const base=[[60,44,30],[48,36,28],[56,48,40],[40,32,28],[50,40,32]][((st%5)+5)%5];
  let k=.7+fbm(x*2,y*2)*.5;k=Math.floor(k*5+BAY[y&3][x&3]/16)/5;px(x,y,sh(base,k));}
 for(let i=0;i<70;i++){const x=ri(0,636),y=ri(3,11),w=ri(2,4);rect(x,y,w,2,[90,82,74]);px(x,y,[120,112,100]);px(x+w-1,y+1,[50,44,40]);}
 for(let i=0;i<30;i++){let x=ri(0,639),y=0;while(y<ri(3,7)){px(x,y,[85,60,38]);y++;if(rnd()<.4)x+=rnd()<.5?1:-1;}}
 line(0,13,639,13,[20,14,12]);}
function shaft(){F('shaft',640,214,12,14);for(let y=0;y<14;y++)for(let x=0;x<12;x++)px(x,y,sh([16,12,10],1+hash(x,y)*.4));
 line(0,0,0,13,[50,38,30]);line(11,0,11,13,[30,22,18]);line(2,0,2,13,[110,74,40]);line(9,0,9,13,[90,60,32]);
 for(let y=1;y<14;y+=4){line(3,y,8,y,[130,90,50]);line(3,y+1,8,y+1,[70,46,26]);}}
// props row (transparent)
function goldHeap(n,x,y,w,h){F(n,x,y,w,h,w>>1,h);const cols=[[90,55,10],[140,90,20],[190,130,30],[230,180,50],[255,225,110],[255,250,200]];
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){const t=(i-(w-1)/2)/(w/2);const top=h-Math.round(h*Math.max(0,1-t*t)*(0.88+vn(i,0,4)*.15));if(j<top)continue;
  let v=2+((j-top)<2?1:0)-(i>w/2?1:0)+(hash(i,j)<.35?1:0)-(hash(j,i)<.25?1:0)-((j>h-3)?1:0);if(hash(i*3,j)<.05)v=5;
  if((i+j*2)%5==0&&hash(i,j*2)<.5)v=Math.min(5,v+1);px(i,j,cols[Math.max(0,Math.min(5,v))]);}
 for(let k=0;k<w/10;k++){const sx=ri(3,w-4),sy=h-ri(2,Math.max(3,h>>1));const g=get(sx,sy);if(img[((OY+sy)*W+OX+sx)*4+3]){px(sx,sy,[255,255,240]);px(sx-1,sy,[255,240,160]);px(sx+1,sy,[255,240,160]);px(sx,sy-1,[255,240,160]);}}}
function props(){const y=304;goldHeap('gold_s',0,y,16,8);goldHeap('gold_m',20,y,32,14);goldHeap('gold_l',56,y,56,22);
 F('mushroom',116,y,8,8,4,8);mush(4,8,hex('#30b0c0'),[190,180,160],1);
 F('barrel',128,y,8,10,4,10);barrel(4,10);
 F('bones',140,y,8,4,4,4);bonesP(0,4);
 F('chest',152,y,10,8,5,8);chest(0,8);
 for(let f=0;f<4;f++){F('torch'+f,170+f*8,y,6,12,3,12);rect(1,8,4,2,[60,55,50]);px(2,10,[40,36,34]);px(2,11,[30,28,26]);rect(2,5,2,3,[100,60,28]);px(2,5,[140,80,35]);
  const fl=[[0,0],[1,-1],[0,1],[-1,0]][f];const hgt=[4,5,3,5][f];for(let j=0;j<hgt;j++){const yy=4-j;px(2+(j>1?fl[0]:0),yy,j==0?[255,240,170]:j<2?[255,180,60]:[230,90,30]);px(3+(j>1?fl[1]:0),yy,j<1?[255,220,120]:[255,140,40]);}
  px(2+fl[0],4-hgt,[200,60,20]);}
 for(let f=0;f<3;f++){F('candle'+f,206+f*6,y,4,6,2,6);rect(1,3,2,3,[220,210,180]);px(1,3,[250,240,210]);px(1,5,[180,170,140]);const o=[0,1,0][f];px(1+(f==2?1:0),2,[255,200,80]);px(1+(f==2?1:0),1-(o?0:0),f==1?[255,240,180]:[255,150,50]);if(f==1)px(2,0,[255,120,40]);}}
lvCellar();lvFungus();lvRiver();lvCrypt();lvHoard();rockBand();shaft();props();
// attach lights to their level: lights recorded in order, split by marker
// (each level pushed its lights before the next started)
// PNG
const crcT=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=b=>{let c=~0;for(const v of b)c=crcT[(c^v)&255]^(c>>>8);return (~c)>>>0;};
function chunk(t,d){const len=Buffer.alloc(4);len.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([len,td,c]);}
const raw=Buffer.alloc((W*4+1)*H);for(let y=0;y<H;y++){raw[y*(W*4+1)]=0;Buffer.from(img.buffer,y*W*4,W*4).copy(raw,y*(W*4+1)+1);}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=6;
fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(path.join(OUT,'dungeon.png'),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]));
for(const n in frames)if(n.startsWith('lvl_'))console.assert(frames[n].lights.length>=4&&frames[n].lights.length<=8,n+' lights');
fs.writeFileSync(path.join(OUT,'dungeon.json'),JSON.stringify({image:'dungeon.png',frames,anims:{torch:{frames:['torch0','torch1','torch2','torch3'],fps:8},candle:{frames:['candle0','candle1','candle2'],fps:6}}}));
// preview x3
const S=3,pw=W*S,ph=H*S,pr=Buffer.alloc((pw*4+1)*ph);for(let y=0;y<ph;y++){pr[y*(pw*4+1)]=0;for(let x=0;x<pw;x++){const i=((y/S|0)*W+(x/S|0))*4,o=y*(pw*4+1)+1+x*4;const a=img[i+3];pr[o]=a?img[i]:255;pr[o+1]=a?img[i+1]:0;pr[o+2]=a?img[i+2]:255;pr[o+3]=255;}}
const ih2=Buffer.alloc(13);ih2.writeUInt32BE(pw,0);ih2.writeUInt32BE(ph,4);ih2[8]=8;ih2[9]=6;
fs.writeFileSync('/tmp/r3opus-dun-preview.png',Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih2),chunk('IDAT',zlib.deflateSync(pr)),chunk('IEND',Buffer.alloc(0))]));

"use strict";
/* ===========================================================================
   포닥 생존 — 밸런스 몬테카를로 시뮬 (헤드리스)
   index.html 의 전투 코어 로직을 렌더링 없이 포팅. dt=1/30 고정.
   "실전형" 플레이어 AI: 위협에서 카이팅 + 우선순위 기반 업그레이드 선택.
   실행: node sim.js [runs]   (기본 300회)
   index.html 수치를 바꾸면 이 파일의 상수도 동기화할 것.
   =========================================================================== */
const rnd=(a,b)=>a+Math.random()*(b-a);
const rint=(a,b)=>Math.floor(rnd(a,b+1));
const TAU=Math.PI*2;
const d2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};

const ENEMY_TYPES={
  pipet:   {r:13, hp:28,  speed:60,  dmg:10, xp:2},
  email:   {r:9,  hp:13,  speed:100, dmg:6,  xp:2},
  deadline:{r:11, hp:22,  speed:105, dmg:10, xp:2},
  reviewer:{r:20, hp:100, speed:42,  dmg:16, xp:4},
  reject:  {r:14, hp:32,  speed:48,  dmg:9,  xp:3, ranged:true, shots:2},
  pi:      {r:16, hp:60,  speed:54,  dmg:13, xp:4, ranged:true, shots:2},
  sangmok: {r:30, hp:620, speed:46, dmg:20, xp:10, dasher:true, mid:true},
  jungmok: {r:24, hp:440, speed:54, dmg:16, xp:8,  dasher:true, mid:true},
  hamok:   {r:18, hp:300, speed:62, dmg:13, xp:6,  dasher:true, mid:true},
};
const BOSSES=[
  {hp:1600,dmg:20},{hp:2400,dmg:24},{hp:3300,dmg:28},
];
const UP_MAX={dmg:12,fire:10,proj:8,pierce:7,speed:8,hp:8,regen:7,crit:8,area:7,magnet:5,orbit:7,nova:7,chain:8,beam:7,hole:6,flame:8,freeze:6,missile:7};
// 실전형 우선순위 (낮을수록 먼저). 생존 위급 시 regen/hp 가중.
const PRIO=['fire','dmg','proj','crit','beam','missile','pierce','chain','flame','nova','hole','freeze','area','speed','orbit','regen','hp','magnet'];

function makeGame(){
  return {
    t:0,
    p:{x:0,y:0,r:14,hp:130,maxhp:130,speed:185,regen:0,pickup:120,iframe:0},
    st:{dmg:1,fireRate:1,projSpeed:1,projCount:1,pierce:0,area:1,crit:0.03,critMul:2,
        moveSpeed:1,extra:{orbit:0,nova:0,chain:0,beam:0,hole:0,fire:0,freeze:0,missile:0},evo:{},awaken:{}},
    lv:1,xp:0,xpNeed:3,kills:0,bossKills:0,
    enemies:[],bullets:[],ebullets:[],gems:[],
    spawnTimer:0,fireTimer:0,novaTimer:0,orbitAngle:0,chainTimer:0,beamTimer:0,holeTimer:0,holes:[],
    flameTimer:0,freezeTimer:0,missileTimer:0,missiles:[],
    bossTimer:120,bossAlive:false,bossIdx:0,finalBoss:false,won:false,midTimer:75,
    up:{},
    dead:false,
    bossMinFrac:1,
  };
}
const VW=900,VH=600; // 가상 화면(스폰 반경 기준)

function nearest(G,x,y){let b=null,bd=Infinity;for(const e of G.enemies){const d=d2(x,y,e.x,e.y);if(d<bd){bd=d;b=e;}}return b;}

function spawnEnemy(G){
  const t=G.t, hpS=1+t*0.012+Math.max(0,t-180)*0.02, roll=Math.random();
  let key='pipet';
  if(t>40&&roll<0.10)key='pi';
  else if(t>20&&roll<0.22)key='reject';
  else if(t>25&&roll<0.48)key='reviewer';
  else if(roll<0.50)key='email';
  else if(roll<0.74)key='deadline';
  const b=ENEMY_TYPES[key], ang=rnd(0,TAU), rad=Math.max(VW,VH)*0.62+40;
  G.enemies.push({type:key,x:G.p.x+Math.cos(ang)*rad,y:G.p.y+Math.sin(ang)*rad,
    r:b.r,hp:b.hp*hpS,maxhp:b.hp*hpS,speed:b.speed*(1+t*0.002+Math.max(0,t-180)*0.0007),dmg:b.dmg,xp:b.xp,
    ranged:!!b.ranged,shots:b.shots||1,fire:rnd(1,2.5),slow:0});
}
function spawnBoss(G){
  const isFinal=(G.bossIdx===2);
  const b=BOSSES[G.bossIdx%BOSSES.length];G.bossIdx++;
  const hpS=1+G.t*0.008,ang=rnd(0,TAU),rad=Math.max(VW,VH)*0.6+60;
  G.enemies.push({type:'boss',boss:true,x:G.p.x+Math.cos(ang)*rad,y:G.p.y+Math.sin(ang)*rad,
    r:42,hp:b.hp*hpS,maxhp:b.hp*hpS,speed:56,dmg:b.dmg,xp:40,ranged:true,fire:1.4,slow:0,final:isFinal});
  G.bossAlive=true; if(isFinal)G.finalBoss=true;
}
function spawnMok(G){
  const hpS=1+G.t*0.012+Math.max(0,G.t-180)*0.02, base=rnd(0,TAU);
  ['sangmok','jungmok','hamok'].forEach((k,i)=>{const md=ENEMY_TYPES[k],a=base+i*2.1,rad=Math.max(VW,VH)*0.6+50;
    G.enemies.push({type:k,mid:true,dasher:true,x:G.p.x+Math.cos(a)*rad,y:G.p.y+Math.sin(a)*rad,r:md.r,hp:md.hp*hpS,maxhp:md.hp*hpS,speed:md.speed,dmg:md.dmg,xp:md.xp,slow:0});});
}

function crit(G,dmg){return Math.random()<G.st.crit?dmg*G.st.critMul:dmg;}
function hurtEnemy(G,e,dmg){e.hp-=dmg;if(e.boss)G.bossMinFrac=Math.min(G.bossMinFrac,Math.max(0,e.hp)/e.maxhp);if(e.hp<=0&&!e.dead)killEnemy(G,e);}
function killEnemy(G,e){
  e.dead=true;G.kills++;if(e.boss){G.bossKills++;G.bossAlive=false;}if(e.final)G.won=true;
  const n=e.boss?12:(e.mid?5:1),gv=e.boss?15:e.xp;for(let i=0;i<n;i++)G.gems.push({x:e.x,y:e.y,v:gv,got:false,life:rnd(28,42)});
}
function explode(G,x,y,radius,dmg){for(const e of G.enemies){if(!e.dead&&d2(x,y,e.x,e.y)<radius*radius)hurtEnemy(G,e,crit(G,dmg));}}

function fire(G){
  const p=G.p;
  // 보스가 사거리(520) 내면 우선 조준, 아니면 가장 가까운 적
  let t=null;
  for(const e of G.enemies){if(e.boss&&d2(p.x,p.y,e.x,e.y)<520*520){t=e;break;}}
  if(!t)t=nearest(G,p.x,p.y);
  if(!t)return;
  const dx=t.x-p.x,dy=t.y-p.y,m=Math.hypot(dx,dy)||1;
  const count=G.st.projCount,spread=count>1?0.26:0,base=Math.atan2(dy/m,dx/m);
  const pierce=G.st.evo.meta?999:(1+G.st.pierce); // 기본 관통 1 (군중 관통)
  for(let i=0;i<count;i++){
    const off=count>1?(i-(count-1)/2)*spread:0,a=base+off;
    G.bullets.push({x:p.x,y:p.y,vx:Math.cos(a),vy:Math.sin(a),
      speed:430*G.st.projSpeed,r:6*G.st.area,dmg:13*G.st.dmg,
      pierce:pierce,hit:new Set(),life:1.4});
  }
}

function levelUp(G){
  // 3장 랜덤 제시 → 우선순위 최상위 선택
  const avail=Object.keys(UP_MAX).filter(k=>(G.up[k]||0)<UP_MAX[k]);
  if(!avail.length)return;
  const pool=[...avail],opts=[];
  while(opts.length<3&&pool.length)opts.push(pool.splice(rint(0,pool.length-1),1)[0]);
  // 위급(체력<45%)하면 regen/hp 우선
  let pick;
  if(G.p.hp/G.p.maxhp<0.45){pick=opts.find(o=>o==='regen')||opts.find(o=>o==='hp');}
  if(!pick){let best=99;for(const o of opts){const r=PRIO.indexOf(o);if(r>=0&&r<best){best=r;pick=o;}}}
  if(!pick)pick=opts[0];
  apply(G,pick);G.up[pick]=(G.up[pick]||0)+1;checkEvo(G,pick);
}
function apply(G,id){
  const s=G.st,p=G.p;
  if(id==='dmg')s.dmg*=1.25;
  else if(id==='fire')s.fireRate*=1.2;
  else if(id==='proj')s.projCount+=1;
  else if(id==='pierce')s.pierce+=1;
  else if(id==='speed')s.moveSpeed*=1.12;
  else if(id==='hp'){p.maxhp+=30;p.hp=p.maxhp;}
  else if(id==='regen')p.regen+=1.2;
  else if(id==='crit')s.crit+=0.08;
  else if(id==='area')s.area*=1.2;
  else if(id==='magnet')p.pickup*=1.4;
  else if(id==='orbit')s.extra.orbit+=1;
  else if(id==='nova')s.extra.nova+=1;
  else if(id==='chain')s.extra.chain+=1;
  else if(id==='beam')s.extra.beam+=1;
  else if(id==='hole')s.extra.hole+=1;
  else if(id==='flame')s.extra.fire+=1;
  else if(id==='freeze')s.extra.freeze+=1;
  else if(id==='missile')s.extra.missile+=1;
}
const EVOF={fire:'preprint',proj:'coauthor',pierce:'meta',dmg:'nature',nova:'keynote',orbit:'lab',chain:'surge',beam:'carpet',flame:'inferno',missile:'swarm'};
const WKEY={nova:'nova',orbit:'orbit',chain:'chain',beam:'beam',hole:'hole',flame:'fire',freeze:'freeze',missile:'missile'};
function aw(G,k){return G.st.awaken[k]?2.4:1;}
function ORBR(G){return 92+(G.st.awaken.orbit?42:0);}
function checkEvo(G,id){
  if((G.up[id]||0)<UP_MAX[id])return;
  const f=EVOF[id];
  if(f&&!G.st.evo[f]){G.st.evo[f]=1;if(f==='lab')G.st.extra.orbit+=2;if(f==='nature')G.st.crit+=0.25;}
  const wk=WKEY[id];
  if(wk&&!G.st.awaken[wk])G.st.awaken[wk]=1;
}
function gainXP(G,v){
  G.xp+=v;
  while(G.xp>=G.xpNeed){G.xp-=G.xpNeed;G.lv++;G.xpNeed=Math.round(G.xpNeed*1.16+2);levelUp(G);}
}

function step(G,dt){
  const p=G.p;G.t+=dt;
  // 플레이어 AI: 가까운 위협이 있으면 "가장 큰 각도 빈틈"으로 돌파, 없으면 젬 수집
  const threats=[];let near=Infinity;
  for(const e of G.enemies){const dd=d2(p.x,p.y,e.x,e.y);if(dd<near)near=dd;
    if(dd<210*210) threats.push(Math.atan2(e.y-p.y,e.x-p.x));}
  near=Math.sqrt(near);
  let mx=0,my=0;
  // 가장 가까운 젬 방향
  let gx=0,gy=0,gd=Infinity;
  for(const g of G.gems){const dd=d2(p.x,p.y,g.x,g.y);if(dd<gd){gd=dd;gx=g.x;gy=g.y;}}
  let gvx=0,gvy=0;if(gd<Infinity){const d=Math.sqrt(gd)||1;gvx=(gx-p.x)/d;gvy=(gy-p.y)/d;}
  if(threats.length){
    // 군집 중심(센트로이드)
    let cxs=0,cys=0,cn=0;
    for(const e of G.enemies){const dd=d2(p.x,p.y,e.x,e.y);if(dd<300*300){cxs+=e.x-p.x;cys+=e.y-p.y;cn++;}}
    cxs/=cn||1; cys/=cn||1;
    const cm=Math.hypot(cxs,cys);
    if(cm<40){
      // 포위됨: 가장 큰 각도 빈틈으로 직선 돌파
      threats.sort((a,b)=>a-b);
      let bestGap=-1,bestMid=0;
      for(let i=0;i<threats.length;i++){
        const a1=threats[i], a2=(i+1<threats.length)?threats[i+1]:threats[0]+TAU;
        const gap=a2-a1; if(gap>bestGap){bestGap=gap;bestMid=a1+gap/2;}
      }
      mx=Math.cos(bestMid); my=Math.sin(bestMid);
    } else {
      // 외곽 선회: 군집 중심에 수직(접선) + 너무 가까우면 바깥으로
      const ux=cxs/cm, uy=cys/cm;
      mx=-uy; my=ux;                       // 접선 방향
      if(near<100){ mx-=ux*1.2; my-=uy*1.2; }  // 바깥으로 밀어내기
      if(near>140){ mx+=gvx*0.5; my+=gvy*0.5; } // 여유 시 젬 흡인
    }
  } else {
    mx=gvx; my=gvy;
  }
  const am=Math.hypot(mx,my);
  if(am>0.01){const sp=p.speed*G.st.moveSpeed;p.x+=mx/am*sp*dt;p.y+=my/am*sp*dt;}
  if(p.regen>0&&p.hp<p.maxhp)p.hp=Math.min(p.maxhp,p.hp+p.regen*dt);
  if(p.iframe>0)p.iframe-=dt;

  // 스폰
  G.spawnTimer-=dt;
  let rate=Math.max(0.28,1.2-G.t*0.0025);
  let batch=2+Math.floor(G.t/55);
  if(G.bossAlive){ rate*=1.9; batch=Math.max(1,batch-1); } // 보스전엔 잡몹 억제
  if(!G.finalBoss&&G.spawnTimer<=0&&G.enemies.length<200){G.spawnTimer=rate;for(let i=0;i<batch;i++)spawnEnemy(G);}
  G.bossTimer-=dt;if(!G.finalBoss&&G.bossTimer<=0&&!G.bossAlive){spawnBoss(G);G.bossTimer=90;}
  G.midTimer-=dt;if(!G.finalBoss&&G.midTimer<=0){spawnMok(G);G.midTimer=165;}

  // 발사
  G.fireTimer-=dt;if(G.fireTimer<=0){G.fireTimer=0.36/G.st.fireRate;if(G.enemies.length)fire(G);}
  // nova
  if(G.st.extra.nova>0){G.novaTimer-=dt;if(G.novaTimer<=0){G.novaTimer=3.0;
    const radius=120*G.st.area*(1+0.25*(G.st.extra.nova-1));
    for(const e of G.enemies){if(d2(p.x,p.y,e.x,e.y)<radius*radius){hurtEnemy(G,e,crit(G,60*G.st.dmg*G.st.extra.nova*aw(G,'nova')));if(G.st.evo.keynote)e.slow=2;}}}}
  if(G.st.extra.orbit>0)G.orbitAngle+=dt*3.6;
  // ⚡ 인용 연쇄
  if(G.st.extra.chain>0){G.chainTimer-=dt;if(G.chainTimer<=0){G.chainTimer=1.5;
    const lv=G.st.extra.chain,jumps=4+lv,reach2=180*180,hit=new Set();
    let cur=nearest(G,p.x,p.y),from={x:p.x,y:p.y};const dmgBolt=34*G.st.dmg*(1+0.4*lv)*aw(G,'chain');
    while(cur&&hit.size<jumps){hit.add(cur);hurtEnemy(G,cur,crit(G,dmgBolt));if(G.st.evo.surge)cur.slow=1.6;from={x:cur.x,y:cur.y};
      let nx=null,nd=reach2;for(const e of G.enemies){if(e.dead||hit.has(e))continue;const d=d2(from.x,from.y,e.x,e.y);if(d<nd){nd=d;nx=e;}}cur=nx;}}}
  // 🔆 논문 레이저
  if(G.st.extra.beam>0){G.beamTimer-=dt;if(G.beamTimer<=0){G.beamTimer=2.5;
    const lv=G.st.extra.beam,tgt=nearest(G,p.x,p.y);
    const ang=tgt?Math.atan2(tgt.y-p.y,tgt.x-p.x):0,len=1100,width=(26+10*lv)*G.st.area,dmgB=44*G.st.dmg*lv*aw(G,'beam')*(lv>=3?2:1);
    const fb=(an)=>{const dx=Math.cos(an),dy=Math.sin(an);for(const e of G.enemies){if(e.dead)continue;const rx=e.x-p.x,ry=e.y-p.y,pr=rx*dx+ry*dy;if(pr<0||pr>len)continue;const bx=p.x+dx*pr,by=p.y+dy*pr,rr=width/2+e.r;if(d2(bx,by,e.x,e.y)<rr*rr)hurtEnemy(G,e,crit(G,dmgB));}};
    fb(ang);if(G.st.evo.carpet){fb(ang+Math.PI);fb(ang+Math.PI/2);fb(ang-Math.PI/2);}}}
  // 🕳️ 블랙홀
  if(G.st.extra.hole>0){G.holeTimer-=dt;if(G.holeTimer<=0){G.holeTimer=4.5;
    const lv=G.st.extra.hole,tgt=nearest(G,p.x,p.y);
    G.holes.push({x:tgt?tgt.x:p.x,y:tgt?tgt.y:p.y,r:105+32*lv,life:2.2,tick:0,lv});}}
  for(const h of G.holes){h.life-=dt;h.tick-=dt;const tn=h.tick<=0;if(tn)h.tick=0.2;
    for(const e of G.enemies){if(e.dead)continue;const dd=d2(h.x,h.y,e.x,e.y);if(dd<h.r*h.r){const d=Math.sqrt(dd)||1,pull=e.boss?22:140;e.x+=(h.x-e.x)/d*pull*dt;e.y+=(h.y-e.y)/d*pull*dt;if(tn)hurtEnemy(G,e,crit(G,11*G.st.dmg*h.lv*aw(G,'hole')));}}}
  G.holes=G.holes.filter(h=>h.life>0);
  // 🔥 화염 분사
  if(G.st.extra.fire>0){G.flameTimer-=dt;if(G.flameTimer<=0){G.flameTimer=1.1;
    const lv=G.st.extra.fire,tgt=nearest(G,p.x,p.y);const aim=tgt?Math.atan2(tgt.y-p.y,tgt.x-p.x):0,range=250+45*lv,half=0.78;
    for(const e of G.enemies){if(e.dead)continue;const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy);if(d<range){let da=Math.atan2(dy,dx)-aim;da=Math.atan2(Math.sin(da),Math.cos(da));if(Math.abs(da)<half){hurtEnemy(G,e,crit(G,9*G.st.dmg*lv*aw(G,'fire')));e.burn=2.0;e.burnT=0;}}}}}
  // ❄️ 광역 빙결
  if(G.st.extra.freeze>0){G.freezeTimer-=dt;if(G.freezeTimer<=0){G.freezeTimer=6.0;
    const lv=G.st.extra.freeze,radius=170+35*lv;
    for(const e of G.enemies){if(d2(p.x,p.y,e.x,e.y)<radius*radius){if(e.boss)e.slow=2.5;else e.frozen=1.6+0.3*lv;hurtEnemy(G,e,crit(G,8*G.st.dmg*lv*aw(G,'freeze')));}}}}
  // 🚀 유도 미사일
  if(G.st.extra.missile>0){G.missileTimer-=dt;if(G.missileTimer<=0){G.missileTimer=1.05;
    const lv=G.st.extra.missile,n=(G.st.evo.swarm?2:1)+lv+(G.st.awaken.missile?2:0);for(let i=0;i<n;i++){const a=rnd(0,TAU);G.missiles.push({x:p.x,y:p.y,vx:Math.cos(a)*140,vy:Math.sin(a)*140,life:3.2,dmg:34*G.st.dmg*aw(G,'missile')});}}}
  for(const ms of G.missiles){const tgt=nearest(G,ms.x,ms.y);
    if(tgt){const desired=Math.atan2(tgt.y-ms.y,tgt.x-ms.x);let cur=Math.atan2(ms.vy,ms.vx);let da=desired-cur;da=Math.atan2(Math.sin(da),Math.cos(da));cur+=Math.max(-0.18,Math.min(0.18,da));ms.vx=Math.cos(cur)*340;ms.vy=Math.sin(cur)*340;}
    ms.x+=ms.vx*dt;ms.y+=ms.vy*dt;ms.life-=dt;
    for(const e of G.enemies){if(e.dead)continue;if(d2(ms.x,ms.y,e.x,e.y)<(e.r+8)*(e.r+8)){explode(G,ms.x,ms.y,72*G.st.area,ms.dmg);ms.life=0;break;}}}
  G.missiles=G.missiles.filter(m=>m.life>0);

  // 총알
  for(const b of G.bullets){
    if(G.st.evo.coauthor){const t=nearest(G,b.x,b.y);if(t){const dx=t.x-b.x,dy=t.y-b.y,m=Math.hypot(dx,dy)||1;b.vx+=(dx/m-b.vx)*0.10;b.vy+=(dy/m-b.vy)*0.10;const mm=Math.hypot(b.vx,b.vy)||1;b.vx/=mm;b.vy/=mm;}}
    b.x+=b.vx*b.speed*dt;b.y+=b.vy*b.speed*dt;b.life-=dt;
    for(const e of G.enemies){if(e.dead||b.hit.has(e))continue;
      if(d2(b.x,b.y,e.x,e.y)<(e.r+b.r)*(e.r+b.r)){
        hurtEnemy(G,e,crit(G,b.dmg));
        if(G.st.evo.preprint)explode(G,b.x,b.y,58*G.st.area,b.dmg*0.6);
        b.hit.add(e);if(b.pierce<=0){b.life=0;break;}b.pierce--;}}
  }
  G.bullets=G.bullets.filter(b=>b.life>0);

  // 적 탄
  for(const eb of G.ebullets){eb.x+=eb.vx*dt;eb.y+=eb.vy*dt;eb.life-=dt;
    if(p.iframe<=0&&d2(eb.x,eb.y,p.x,p.y)<(p.r+eb.r)*(p.r+eb.r)){p.hp-=eb.dmg;p.iframe=0.5;eb.life=0;}}
  G.ebullets=G.ebullets.filter(b=>b.life>0);

  // 적 이동/공격
  const oN=G.st.extra.orbit;
  for(const e of G.enemies){if(e.dead)continue;
    if(e.frozen>0)e.frozen-=dt;
    if(e.slow>0)e.slow-=dt;
    if(e.burn>0){e.burn-=dt;e.burnT=(e.burnT||0)-dt;if(e.burnT<=0){e.burnT=0.4;hurtEnemy(G,e,crit(G,(G.st.evo.inferno?9:5)*G.st.dmg*aw(G,'fire')));}if(e.dead)continue;}
    const sf=e.frozen>0?0:(e.slow>0?0.45:1);
    const dx=p.x-e.x,dy=p.y-e.y,m=Math.hypot(dx,dy)||1;
    if(e.ranged&&!e.boss&&m<240){e.x-=dx/m*e.speed*sf*0.4*dt;e.y-=dy/m*e.speed*sf*0.4*dt;}
    else{e.x+=dx/m*e.speed*sf*dt;e.y+=dy/m*e.speed*sf*dt;}
    if(e.boss){
      if(e.dashT>0){e.dashT-=dt;e.x+=dx/m*300*dt;e.y+=dy/m*300*dt;}
      e.spin=(e.spin||0)+dt*0.7;
      e.atkT=(e.atkT==null?rnd(1.0,1.8):e.atkT)-dt;
      if(!(e.frozen>0)&&e.atkT<=0){
        e.pat=((e.pat==null?-1:e.pat)+1)%3;
        if(e.pat===0){const k=16;for(let i=0;i<k;i++){const a=i*TAU/k+e.spin;G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*165,vy:Math.sin(a)*165,r:9,dmg:e.dmg,life:5});}e.atkT=2.3;}
        else if(e.pat===1){for(let i=0;i<5;i++){const a=Math.atan2(dy,dx)+(i-2)*0.17;G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*240,vy:Math.sin(a)*240,r:8,dmg:e.dmg,life:4});}e.atkT=1.7;}
        else{e.dashT=0.85;e.atkT=2.6;}
      }
    } else if(e.ranged&&!(e.frozen>0)){e.fire-=dt;if(e.fire<=0&&m<540){e.fire=3.0;const base=Math.atan2(dy,dx),n=e.shots||1,bd=Math.round(e.dmg*0.6);for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*0.17;G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*160,vy:Math.sin(a)*160,r:8,dmg:bd,life:2.6});}}}
    if(e.dasher){if(e.dashT>0){e.dashT-=dt;e.x+=dx/m*340*dt;e.y+=dy/m*340*dt;}else{e.dashCd=(e.dashCd==null?rnd(1.4,2.8):e.dashCd)-dt;if(e.dashCd<=0&&!(e.frozen>0)){e.dashT=0.45;e.dashCd=rnd(2.2,3.4);}}}
    if(m<e.r+p.r&&p.iframe<=0){p.hp-=e.dmg;p.iframe=0.5;}
    if(oN>0){const ORB=ORBR(G),hb=18*aw(G,'orbit');for(let i=0;i<oN;i++){const a=G.orbitAngle+i*TAU/oN;const ox=p.x+Math.cos(a)*ORB,oy=p.y+Math.sin(a)*ORB;
      if(d2(ox,oy,e.x,e.y)<(e.r+hb)*(e.r+hb)){if(!e._oc||e._oc<=0){hurtEnemy(G,e,crit(G,18*G.st.dmg*aw(G,'orbit')*Math.pow(2,Math.min(oN-1,6))));e._oc=0.28;}}}}
    if(e._oc>0)e._oc-=dt;
  }
  G.enemies=G.enemies.filter(e=>!e.dead);

  // 젬 수집 (자석 범위 내 자동) + 수명 만료 소멸
  for(const g of G.gems){g.life-=dt;if(d2(g.x,g.y,p.x,p.y)<p.pickup*p.pickup){g.got=true;gainXP(G,g.v);}else if(g.life<=0){g.got=true;}}
  G.gems=G.gems.filter(g=>!g.got);

  if(p.hp<=0)G.dead=true;
}

function runOnce(maxT){
  const G=makeGame();const dt=1/30;
  while(!G.dead&&!G.won&&G.t<maxT)step(G,dt);
  return {t:G.t,lv:G.lv,kills:G.kills,bossKills:G.bossKills,bossMinFrac:G.bossMinFrac,
    evo:Object.keys(G.st.evo).length,dmg:G.st.dmg,proj:G.st.projCount,fire:G.st.fireRate};
}

const RUNS=parseInt(process.argv[2]||'300',10);
const MAXT=600;
const res=[];for(let i=0;i<RUNS;i++)res.push(runOnce(MAXT));
const times=res.map(r=>r.t).sort((a,b)=>a-b);
const med=times[Math.floor(times.length/2)];
const mean=times.reduce((a,b)=>a+b,0)/times.length;
const pct=q=>times[Math.floor(times.length*q)];
const survived=t=>res.filter(r=>r.t>=t).length/res.length*100;
const bossRate=n=>res.filter(r=>r.bossKills>=n).length/res.length*100;
const avg=f=>res.reduce((a,r)=>a+f(r),0)/res.length;

console.log(`\n=== 포닥 생존 밸런스 시뮬 (${RUNS}회, 최대 ${MAXT}s) ===\n`);
console.log(`생존시간  중앙값 ${med.toFixed(1)}s · 평균 ${mean.toFixed(1)}s · 25% ${pct(0.25).toFixed(0)}s · 75% ${pct(0.75).toFixed(0)}s · 최대 ${times[times.length-1].toFixed(0)}s`);
console.log(`도달 레벨 평균 ${avg(r=>r.lv).toFixed(1)} · 처치 평균 ${avg(r=>r.kills).toFixed(0)}\n`);
console.log(`생존율:   60s ${survived(60).toFixed(0)}% · 120s ${survived(120).toFixed(0)}% · 180s ${survived(180).toFixed(0)}% · 300s ${survived(300).toFixed(0)}%`);
console.log(`보스격파: 1마리+ ${bossRate(1).toFixed(0)}% · 2마리+ ${bossRate(2).toFixed(0)}% · 3마리+ ${bossRate(3).toFixed(0)}% · 4마리+ ${bossRate(4).toFixed(0)}%`);
console.log(`무기진화: 평균 ${avg(r=>r.evo).toFixed(2)}종 / 6종`);
console.log(`보스 최저 HP 도달(첫 보스 기준 평균): ${(avg(r=>r.bossMinFrac)*100).toFixed(0)}% (낮을수록 보스에 딜이 들어감)\n`);

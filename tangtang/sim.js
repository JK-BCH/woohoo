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
  pipet:   {r:13, hp:18,  speed:60,  dmg:8,  xp:2},
  email:   {r:9,  hp:8,   speed:100, dmg:5,  xp:2},
  deadline:{r:11, hp:14,  speed:105, dmg:8,  xp:2},
  reviewer:{r:20, hp:80,  speed:42,  dmg:16, xp:4},
  reject:  {r:14, hp:32,  speed:48,  dmg:10, xp:3, ranged:true},
  pi:      {r:16, hp:60,  speed:54,  dmg:14, xp:4, ranged:true},
};
const BOSSES=[
  {hp:550,dmg:18},{hp:850,dmg:22},{hp:1200,dmg:26},
];
const UP_MAX={dmg:8,fire:8,proj:6,pierce:5,speed:6,hp:6,regen:5,crit:6,area:5,magnet:4,orbit:4,nova:4};
// 실전형 우선순위 (낮을수록 먼저). 생존 위급 시 regen/hp 가중.
const PRIO=['fire','dmg','proj','crit','pierce','nova','area','speed','orbit','regen','hp','magnet'];

function makeGame(){
  return {
    t:0,
    p:{x:0,y:0,r:14,hp:130,maxhp:130,speed:185,regen:0,pickup:120,iframe:0},
    st:{dmg:1,fireRate:1,projSpeed:1,projCount:1,pierce:0,area:1,crit:0.03,critMul:2,
        moveSpeed:1,extra:{orbit:0,nova:0},evo:{}},
    lv:1,xp:0,xpNeed:3,kills:0,bossKills:0,
    enemies:[],bullets:[],ebullets:[],gems:[],
    spawnTimer:0,fireTimer:0,novaTimer:0,orbitAngle:0,
    bossTimer:120,bossAlive:false,bossIdx:0,
    up:{},
    dead:false,
    bossMinFrac:1,
  };
}
const VW=900,VH=600; // 가상 화면(스폰 반경 기준)

function nearest(G,x,y){let b=null,bd=Infinity;for(const e of G.enemies){const d=d2(x,y,e.x,e.y);if(d<bd){bd=d;b=e;}}return b;}

function spawnEnemy(G){
  const t=G.t, hpS=1+t*0.009, roll=Math.random();
  let key='pipet';
  if(t>50&&roll<0.14)key='pi';
  else if(t>25&&roll<0.30)key='reviewer';
  else if(t>40&&roll<0.46)key='reject';
  else if(t>10&&roll<0.66)key='deadline';
  else if(roll<0.30)key='email';
  const b=ENEMY_TYPES[key], ang=rnd(0,TAU), rad=Math.max(VW,VH)*0.62+40;
  G.enemies.push({type:key,x:G.p.x+Math.cos(ang)*rad,y:G.p.y+Math.sin(ang)*rad,
    r:b.r,hp:b.hp*hpS,maxhp:b.hp*hpS,speed:b.speed*(1+t*0.002),dmg:b.dmg,xp:b.xp,
    ranged:!!b.ranged,fire:rnd(1,2.5),slow:0});
}
function spawnBoss(G){
  const b=BOSSES[G.bossIdx%BOSSES.length];G.bossIdx++;
  const hpS=1+G.t*0.005,ang=rnd(0,TAU),rad=Math.max(VW,VH)*0.6+60;
  G.enemies.push({type:'boss',boss:true,x:G.p.x+Math.cos(ang)*rad,y:G.p.y+Math.sin(ang)*rad,
    r:42,hp:b.hp*hpS,maxhp:b.hp*hpS,speed:46,dmg:b.dmg,xp:40,ranged:true,fire:1.4,slow:0});
  G.bossAlive=true;
}

function crit(G,dmg){return Math.random()<G.st.crit?dmg*G.st.critMul:dmg;}
function hurtEnemy(G,e,dmg){e.hp-=dmg;if(e.boss)G.bossMinFrac=Math.min(G.bossMinFrac,Math.max(0,e.hp)/e.maxhp);if(e.hp<=0&&!e.dead)killEnemy(G,e);}
function killEnemy(G,e){
  e.dead=true;G.kills++;if(e.boss){G.bossKills++;G.bossAlive=false;}
  const n=e.boss?12:1;for(let i=0;i<n;i++)G.gems.push({x:e.x,y:e.y,v:(e.boss?60:e.xp),got:false});
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
      speed:430*G.st.projSpeed,r:6*G.st.area,dmg:8*G.st.dmg,
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
}
const EVOF={fire:'preprint',proj:'coauthor',pierce:'meta',dmg:'nature',nova:'keynote',orbit:'lab'};
function checkEvo(G,id){
  const f=EVOF[id];if(!f)return;
  if((G.up[id]||0)>=UP_MAX[id]&&!G.st.evo[f]){
    G.st.evo[f]=1;
    if(f==='lab')G.st.extra.orbit+=2;
    if(f==='nature')G.st.crit+=0.25;
  }
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
  let rate=Math.max(0.34,1.4-G.t*0.003);
  let batch=1+Math.floor(G.t/60);
  if(G.bossAlive){ rate*=1.9; batch=Math.max(1,batch-1); } // 보스전엔 잡몹 억제
  if(G.spawnTimer<=0&&G.enemies.length<170){G.spawnTimer=rate;for(let i=0;i<batch;i++)spawnEnemy(G);}
  G.bossTimer-=dt;if(G.bossTimer<=0&&!G.bossAlive){spawnBoss(G);G.bossTimer=90;}

  // 발사
  G.fireTimer-=dt;if(G.fireTimer<=0){G.fireTimer=0.40/G.st.fireRate;if(G.enemies.length)fire(G);}
  // nova
  if(G.st.extra.nova>0){G.novaTimer-=dt;if(G.novaTimer<=0){G.novaTimer=3.0;
    const radius=120*G.st.area*(1+0.25*(G.st.extra.nova-1));
    for(const e of G.enemies){if(d2(p.x,p.y,e.x,e.y)<radius*radius){hurtEnemy(G,e,crit(G,20*G.st.dmg*G.st.extra.nova));if(G.st.evo.keynote)e.slow=2;}}}}
  if(G.st.extra.orbit>0)G.orbitAngle+=dt*3.0;

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
    if(e.slow>0)e.slow-=dt;const sf=e.slow>0?0.45:1;
    const dx=p.x-e.x,dy=p.y-e.y,m=Math.hypot(dx,dy)||1;
    if(e.ranged&&m<240){e.x-=dx/m*e.speed*sf*0.4*dt;e.y-=dy/m*e.speed*sf*0.4*dt;}
    else{e.x+=dx/m*e.speed*sf*dt;e.y+=dy/m*e.speed*sf*dt;}
    if(e.ranged){e.fire-=dt;if(e.fire<=0&&m<560){e.fire=e.boss?0.5:1.8;const n=e.boss?3:1;
      for(let i=0;i<n;i++){const a=Math.atan2(dy,dx)+(e.boss?(i-2)*0.22:0);G.ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*200,vy:Math.sin(a)*200,r:7,dmg:e.dmg,life:4});}}}
    if(m<e.r+p.r&&p.iframe<=0){p.hp-=e.dmg;p.iframe=0.5;}
    if(oN>0){for(let i=0;i<oN;i++){const a=G.orbitAngle+i*TAU/oN;const ox=p.x+Math.cos(a)*60,oy=p.y+Math.sin(a)*60;
      if(d2(ox,oy,e.x,e.y)<(e.r+12)*(e.r+12)){if(!e._oc||e._oc<=0){hurtEnemy(G,e,crit(G,12*G.st.dmg));e._oc=0.3;}}}}
    if(e._oc>0)e._oc-=dt;
  }
  G.enemies=G.enemies.filter(e=>!e.dead);

  // 젬 수집 (자석 범위 내 자동)
  for(const g of G.gems){if(d2(g.x,g.y,p.x,p.y)<p.pickup*p.pickup){g.got=true;gainXP(G,g.v);}}
  G.gems=G.gems.filter(g=>!g.got);

  if(p.hp<=0)G.dead=true;
}

function runOnce(maxT){
  const G=makeGame();const dt=1/30;
  while(!G.dead&&G.t<maxT)step(G,dt);
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

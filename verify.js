#!/usr/bin/env node
/**
 * verify.js — 《격물치지》 8축 통합 검증
 * 사용법: node verify.js [index.html 경로]   (기본: ./index.html)
 *
 * 소스 "리터럴"을 정규식으로 파싱해 교차검증한다 (의도 좌표가 아니라 실제 코드 기준).
 * 따라서 아래 코드 포맷 컨벤션이 깨지면 파서가 놓친다 — HANDOFF.md §4 포맷 규칙 참조.
 * 모든 패치 후 반드시: node --check (문법) → node verify.js (이 파일) 순서로 실행.
 */
const fs = require('fs');
const path = process.argv[2] || 'index.html';
const html = fs.readFileSync(path, 'utf8');
const m0 = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m0) { console.log('script 블록을 찾지 못함'); process.exit(1); }
const src = m0[1];

let fail = 0;
const note = s => { console.log('  ⚠', s); fail++; };

// ───────── [1] 맵: 파싱 + 행 길이 균일성 ─────────
const mm = src.match(/const MAPS=\{([\s\S]*?)\};/)[1];
const MAPS = {};
for (const m of mm.matchAll(/(\w+):\{name:"([^"]+)",tiles:\[([^\]]+)\]\}/g))
  MAPS[m[1]] = { name: m[2], tiles: m[3].match(/"[^"]+"/g).map(s => s.slice(1, -1)) };
console.log('[1] 맵 ' + Object.keys(MAPS).length + '종');
for (const id in MAPS) {
  const t = MAPS[id].tiles, w = t[0].length;
  if (!t.every(r => r.length === w)) note(id + ' 행 길이 불균일');
}
const SOLID = { T:1,B:1,W:1,D:1,L:1,R:1,K:1,C:1,V:1,X:1,J:1,O:1,Y:1,A:1,H:1,E:1,M:1 };
const at = (id, x, y) => { const t = MAPS[id] && MAPS[id].tiles; if (!t) return null;
  return (y < 0 || x < 0 || y >= t.length || x >= t[0].length) ? null : t[y][x]; };
const walkable = (id, x, y) => { const t = at(id, x, y); return t !== null && !SOLID[t]; };
const adjWalk = (id, x, y) => [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => walkable(id, x+dx, y+dy));

// ───────── [2] 포털: WALKP/DOORP 출발·도착 왕복 ─────────
function parseTable(name) {
  const block = src.match(new RegExp('const ' + name + '=\\{([\\s\\S]*?)\\n\\};'))[1];
  const out = []; let cur = null;
  for (const line of block.split('\n')) {
    const mh = line.match(/^\s*(\w+):\{/); if (mh) cur = mh[1];
    for (const e of line.matchAll(/'(\d+),(\d+)':\{to:'(\w+)',x:(\d+),y:(\d+)/g))
      out.push({ map: cur, sx: +e[1], sy: +e[2], to: e[3], tx: +e[4], ty: +e[5] });
  }
  return out;
}
const portals = [...parseTable('WALKP'), ...parseTable('DOORP')];
console.log('[2] 포털 ' + portals.length + '개');
for (const p of portals) {
  if (!MAPS[p.to]) note('포털 대상 맵 없음: ' + p.to);
  if (at(p.map, p.sx, p.sy) === null) note('출발 좌표가 맵 밖: ' + JSON.stringify(p));
  if (!walkable(p.to, p.tx, p.ty)) note('도착 막힘: ' + p.map + ' ' + p.sx + ',' + p.sy + ' → ' + p.to + ' ' + p.tx + ',' + p.ty + ' tile=' + at(p.to, p.tx, p.ty));
}

// ───────── [3] 상자: CHEST_DB 키 ↔ X 타일 양방향 + 인접성 ─────────
const chestKeys = [...src.matchAll(/'(\w+):(\d+),(\d+)':\{(?:gold|item|note|stat|regen|flag)/g)]
  .map(m => ({ id: m[1], x: +m[2], y: +m[3] }));
console.log('[3] 상자 ' + chestKeys.length + '개');
for (const c of chestKeys) {
  const t = at(c.id, c.x, c.y);
  if (c.id === 'campus' && t === 'H') continue;          // 디버그 돌탑 예외
  if (t !== 'X') note('상자 키가 X 타일 아님: ' + c.id + ':' + c.x + ',' + c.y + ' tile=' + t);
  if (t === 'X' && !adjWalk(c.id, c.x, c.y)) note('상자 인접 불가(게이트 의도면 무시 가능): ' + c.id + ':' + c.x + ',' + c.y);
}
for (const id in MAPS)
  MAPS[id].tiles.forEach((row, y) => [...row].forEach((t, x) => {
    if (t === 'X' && !chestKeys.some(c => c.id === id && c.x === x && c.y === y))
      note('X 타일에 CHEST_DB 없음: ' + id + ':' + x + ',' + y);
  }));

// ───────── [4] NPC: 위치·인접·스프라이트·핸들러 전수 ─────────
const npcBlock = src.match(/const NPCS=\{([\s\S]*?)\n\};/)[1];
const npcs = []; let curMap = null;
for (const line of npcBlock.split('\n')) {
  const mh = line.match(/^\s*(\w+):\[/); if (mh) curMap = mh[1];
  for (const e of line.matchAll(/\{x:(\d+),y:(\d+),kind:'(\w+)'/g))
    npcs.push({ map: curMap, x: +e[1], y: +e[2], kind: e[3] });
}
console.log('[4] NPC ' + npcs.length + '명');
for (const n of npcs) {
  const t = at(n.map, n.x, n.y);
  if (t === null || SOLID[t]) note('NPC가 SOLID/맵밖: ' + n.map + ' ' + n.kind + ' (' + n.x + ',' + n.y + ') t=' + t);
  if (!adjWalk(n.map, n.x, n.y)) note('NPC 인접 불가: ' + n.map + ' ' + n.kind);
  if (!src.includes('A.npc.' + n.kind + '=')) note('NPC 스프라이트 없음(투명 NPC!): ' + n.kind);
  if (!src.includes("kind==='" + n.kind + "'")) note('npcTalk 핸들러 없음: ' + n.kind);
}

// ───────── [5] 적: DB ↔ 스프라이트 ↔ 사용처(웨이브/인카운터) ─────────
const dbKeys = [...src.matchAll(/^\s{2}(\w+):\{key:'\w+',name:'/gm)].map(m => m[1]);
console.log('[5] 적 DB ' + dbKeys.length + '종');
for (const k of dbKeys) if (!src.includes('A.enemy.' + k + '=')) note('적 스프라이트 없음: ' + k);
const used = new Set();
for (const m of src.matchAll(/e:\['([^\]]+)'\]/g)) m[1].split("','").forEach(k => used.add(k));
for (const m of src.matchAll(/waves:\[\[([^\]]*)\]/g)) (m[1].match(/'(\w+)'/g) || []).forEach(s => used.add(s.replace(/'/g, '')));
for (const m of src.matchAll(/mkE2?\('(\w+)'/g)) used.add(m[1]);
for (const k of used) if (!dbKeys.includes(k)) note('미정의 적 키 사용: ' + k);

// ───────── [6] 아이템: 상점 재고 ↔ ITEMS ↔ inv 초기화 ─────────
const itemKeys = [...src.matchAll(/^\s{2}(\w+):\{name:'[^']+', price:/gm)].map(m => m[1]);
console.log('[6] 아이템 ' + itemKeys.length + '종');
const stock = new Set();
for (const m of src.matchAll(/openShopWith\(\[([^\]]+)\]/g)) (m[1].match(/'(\w+)'/g) || []).forEach(s => stock.add(s.replace(/'/g, '')));
for (const m of src.matchAll(/vendingShop\(.*?\[([^\]]+)\]/g)) (m[1].match(/'(\w+)'/g) || []).forEach(s => stock.add(s.replace(/'/g, '')));
for (const k of stock) if (!itemKeys.includes(k)) note('미정의 아이템 판매: ' + k);
for (const k of itemKeys) if (!src.includes(k + ':0') && !src.includes(k + ':2')) note('inv 초기화 누락 가능: ' + k);

// ───────── [7] 스킬: 정의 ↔ sk_ 라우팅 전수 ─────────
const skillDefs = [...src.matchAll(/(\w+):\{id:'\w+',name:'([^']+)',mp:\d+,lv:(\d+)/g)].map(m => m[1]);
console.log('[7] 스킬 ' + skillDefs.length + '종');
for (const id of skillDefs) if (!src.includes('sk_' + id))
  note('스킬 라우팅 누락(비대상 스킬은 playerCommand 명시 분기 필요): ' + id);

// ───────── [8] 세이브: S 플래그 init ↔ applySnapshot def 동기화 ─────────
const initS = src.match(/const S=\{([\s\S]*?)\};/)[1].match(/(\w+):/g).map(s => s.slice(0, -1));
const defS = src.match(/const def=\{([\s\S]*?)\};/)[1].match(/(\w+):/g).map(s => s.slice(0, -1));
const missDef = initS.filter(k => !defS.includes(k));
const missInit = defS.filter(k => !initS.includes(k));
if (missDef.length) note('applySnapshot def 누락: ' + missDef.join(','));
if (missInit.length) note('S 초기화 누락: ' + missInit.join(','));
console.log('[8] S 플래그 ' + initS.length + '개');

console.log(fail === 0
  ? '\n✅ 통합 검증 ALL OK — 맵 ' + Object.keys(MAPS).length + ' · 포털 ' + portals.length + ' · 상자 ' + chestKeys.length + ' · NPC ' + npcs.length + ' · 적 ' + dbKeys.length + ' · 아이템 ' + itemKeys.length + ' · 스킬 ' + skillDefs.length
  : '\n❌ 실패 ' + fail + '건');
process.exit(fail ? 1 : 0);

# 《격물치지》 핸드오프 문서 — Claude Code 인계용

> 대학원생 성장 RPG. 쯔꾸루 감성, **단일 index.html**(바닐라 JS + Canvas, 외부 에셋 0).
> 이 문서 하나로 아키텍처·컨벤션·완료 내역·남은 작업·함정을 모두 파악할 수 있게 작성했다.
> 함께 인계되는 파일: `index.html`(**배포본 v2.6 — 본편 완결 + 확장 콘텐츠**, 작업본 통합 완료), `gen_maps.py`(맵 생성·검증), `verify.js`(8축 통합 검증), `chapter3_boston_design.md`(3장 설계서), `volume_expansion_spec.md`(확장 로드맵), `game_details.md`(**경제·밸런스·수집 수치 레퍼런스** — 수치 패치 시 동시 갱신), `README.md`/`CHANGELOG.md`(배포 리포용). (밸런스 시트 `grad_school_rpg_balancing.xlsx`는 리포 미포함 — 시뮬 스크립트로 재현)

---

## 0. 시작하기 (5분 온보딩)

```bash
# 1) 문법 검사 (script 블록만 추출해서)
sed -n '/^<script>/,/^<\/script>/p' index.html | sed '1d;$d' > game.js && node --check game.js && rm game.js

# 2) 8축 통합 검증 (맵·포털·상자·NPC·적·아이템·스킬·세이브 교차검사)
node verify.js index.html

# 3) 맵을 고치거나 추가할 때 (직접 타일 문자열 수정 금지!)
python3 gen_maps.py        # → maps.js 재생성 + BFS 통행성 검증 자동 수행
# 이후 maps.js에서 해당 맵 블록을 정규식으로 추출해 index.html에 splice

# 4) 플레이 테스트: index.html을 브라우저로 열기 (서버 불필요)
#    빠른 테스트: 콘솔에서 P.lv=35;P.atk=1000;… 직접 세팅 (전역 노출 — §10 참조.
#    구 디버그 돌탑은 v2.0에서 소원 돌탑(1회 LUK+5)으로 교체됨)
```

**모든 패치 후 1) → 2) 순서로 무조건 실행.** 이 두 단계가 지금까지 투명 NPC, 막힌 포털, 라우팅 누락 등 실제 버그를 전부 잡아왔다.

---

## 1. 제품·배포 상태

- **배포**: GitHub Pages — 리포 `JK-BCH/woohoo`, main 브랜치 root. URL `https://JK-BCH.github.io/woohoo/`
- **배포본**: **v2.6 (본편 완결 + 국제관 + 도감/칭호 + 리비전 지옥 + 미니게임 + 비주얼 개편)**. 작업본이 `index.html`에 통합됨 — 별도 작업본 파일 없음. **볼륨 확장 로드맵은 `volume_expansion_spec.md` 참조** (v2.2 도감/QoL·v2.3 무한던전·v2.4 미니게임 완료). (주의: 변경은 feature 브랜치에서 작업 — **main에 머지되어야 GH Pages에 반영**된다.)
- **v2.2 수집/QoL**: 도감·칭호 탭(`fmView('dex')`) — 몬스터/술/요리/트로피 도감 + 칭호 11종(`TITLES`, `S.title` 1개 장착 패시브, `checkTitles()`). 트로피 `TROPHIES`(tallyBank 드랍). 전투 배속(`SPEED` 전역·localStorage), 오토세이브(`autoSave()`→'auto'슬롯), 일괄구매(`BUYQ`), 코드복사, 권장Lv표찰(`RECLV`).
- **v2.3 반복 루프**: 리비전 지옥(무한던전) — hsq NPC `revgate`(boss2 게이트), `revStart/revNext/revDefeat/revShop`. 전역 `REV`(세이브 불필요), B.rev 플래그로 battleBg·defeat 분기. 적은 `mkScaled`로 층 스케일(HP×1.13^/ATK×1.05^), 5층마다 `REV_BOSS`. 보상=심사 포인트(`S.revPoints`), 교환소서 영구 스탯 반복 구매. 일일 출석(`S.dailyDate`, ISO 날짜 비교).
- **v2.4 미니게임**: ① 찰스강 낚시 — `MODE='fishing'`(loop·pressA·pressB 분기), `startFishing/renderFishing/fishingAct`, 마커 타이밍→등급 추첨(`FISH_DB`/`FISH_BY_GRADE`), charles NPC `fisher`, 물고기 도감(`S.fish`). ② 체스 수읽기 — NPC `chessman`(플레이버에서 전용 핸들러로 승격), `CHESS_Q` 일일 3지선다(`S.chessDate`). ③ JK 시음회 — `jkTasting()`(jk3Build 메뉴), 일일(`S.tasteDate`). ④ 발도장 — goMap/시작/로드서 `S.visited[CUR]=1`, 도감 탭 표시. 신규 칭호 angler/master.
- **v2.5 비주얼 1차**: 맵별 건물 팔레트(`MAP_THEME` 1=일리노이 적벽돌/2=보스턴 레드브릭/3=콘크리트, `tileImg` 분기) · 물 타일 물결 애니 · 지역 파티클(눈발/낙엽/반딧불) · 장식 타일 N/Q/Z(가로등·벤치·화단, gen_maps `deco()` 연결성 보존 자동 배치 66개, campus 야간 가로등 글로우).
- **v2.6 비주얼 2차+콘텐츠**: 현대도시 테마4(B4 유리 커튼월·R4 옥상설비·P4 아스팔트·G4 보도블럭 — alley/longwood/mit, `URBAN_G`로 골목·롱우드만 바닥 도시화) · U 축구골대(mit 6,16/25,16) · 신규 몹 labstu(실험 망친 공대생, ENC_INF 전용: 폭주 시약 ×1.4+자해 8%·혼란 연기) · 미니맵 col N/Q/Z/U 보강.
- **v2.7 경제**: 완전회복템 일반상점 삭제(보틀숍 wellerfp 제거 — JK 히든재고·보스턴 JK·야바위만) · 안암 야바위꾼(campus 16,12, `gamblerGame`: ₩30,000 가중뽑기 `GACHA_POOL` 합1000·파피2, 기대회수 ~₩7,300 = 골드 싱크).
- **v2.8 종장 콘텐츠**: 타이틀 메뉴(`titleInit` — 이어서/처음부터/코드, `newGame` 분리) · **인문대 교수동 hum**(campus 33,19 D `lock:()=>!S.boss3`, 22×14): 연구실(E/O/X HP+30)·강의실·ENC_HUM 1/16 Lv33+ 몹 3종(evalghost 혼란/recpile 과로/meetghost 침묵·MP누수)·첫 강의 이벤트전(lectern NPC, quizstu 2웨이브 → `S.lecture1`+ATK+5)·미션 ch4 게이트(`!q.ch4||S.boss3`) · gen_maps `NPC_GUARD`(데코의 NPC 좌표 보호 — **NPCS 변경 시 동기 필수**).
- **v2.9 교수동 증축+보스턴 모드**: ① **hum 2층 분리** — hum(1층)=안전 로비(인카운터 없음: 연구실 E/O/X·행정 라운지 V[yuengling/barolo/nightshift]·humta/colleague), **hum2(2층)=줌 강의동**(`encFor`의 ENC_HUM·RECLV 모두 hum2로 이동, 계단 S(20,12) WALKP 왕복). 줌 강의실 3실 = `lectern/lectern2/lectern3` NPC 이벤트전, **순서 해금**: lecture1(quizstu, ATK+5) → lecture2(evalghost, DEF+5) → lecture3(recpile·meetghost, 최대 MP+20) — S 플래그 `lecture2`/`lecture3` 신설. ② 캠퍼스 **교수동 진입로**(gen_maps: y21 동측 연장 x20-33 + 문앞 vline x33). ③ **테마5**(t.B5/R5 사암 석조+청동 지붕): `MAP_THEME` hum/hum2=5 + `tileImg`의 campus (30-36,17-19) 렉트 특례(외관 차별화). ④ **보스턴 모드**(`bostonStart`, 타이틀 버튼) — Lv20 박사로 3장 직행: gainLevels 공식 그대로 시뮬, 스킬 `lv<=20` 12종, keyboard, ₩150,000, `boss1/boss2/card/ch2first/ch3first=1`, checkTitles+`S.title='phd'`, hsq(20,14) 시작. ⑤ `skill_rework_proposal.md`(스킬 16종 사용률 진단·계열 진화 설계 — **미구현**).
- **절대 금지**: 리포 이름/도메인 변경. localStorage는 origin 단위라 **모든 플레이어의 세이브가 증발**한다 (세이브 코드로만 이주 가능).
- 업데이트 절차: `index.html` 덮어쓰기 + CHANGELOG 한 줄 + git tag. GH Pages 캐시 ~10분, 캐시버스팅 불필요.

---

## 2. 아키텍처 결정 (그리고 그 이유)

| 결정 | 내용 | 이유 |
|---|---|---|
| **단일 HTML** | CSS+JS+게임데이터 전부 `index.html` 한 파일 | 빌드 0, 배포 = 파일 업로드. 이 제약은 유지할 것 |
| **에셋 전부 코드 생성** | 스프라이트는 Canvas로 픽셀 단위 생성(`mkC`, `px` 헬퍼), 사운드는 WebAudio 합성(`sfx.*`) | 외부 파일 의존 0. 새 스프라이트도 같은 방식으로 |
| **세이브 = localStorage + 세이브 코드** | 슬롯 3개 + base64 코드 내보내기/불러오기. Google Drive 연동은 **폐기 확정**(다시 제안하지 말 것) | 코드 백업이 기기 이주·iOS 7일 정리 정책의 대비책 |
| **세이브 호환 제1원칙** | 스냅샷 필드는 **추가만 한다. 삭제·개명 금지.** `applySnapshot`이 default 병합으로 구버전 호환 | v0.2 세이브가 v1.1에서 열린다. 이 호환성은 제품 약속 |
| **맵은 gen_maps.py가 생성** | 파이썬에서 그리드 조립 → BFS 통행성·포털 도착·상호작용 인접성 검증 → `maps.js` 출력 → index.html에 splice | 손으로 타일 문자열을 만지면 반드시 사고남 |
| **검증은 소스 리터럴 파싱** | verify.js가 "의도한 좌표"가 아니라 **index.html에 실제로 적힌 코드**를 정규식 파싱해 교차검증 | v0.5에서 의도-기준 검증이 출구 버그를 놓친 교훈 |
| **패치는 파이썬 치환 스크립트** | `rep(old, new, label)` 함수: old 문자열 미발견 시 label과 함께 실패 보고, 전부 성공해야 의미 | 어디가 안 먹었는지 즉시 안다. Claude Code에선 Edit 툴이 같은 역할 — 단 **고유 문자열 매칭 실패를 무시하지 말 것** |
| **밸런스는 시뮬로 결정** | 보스/이벤트전마다 node로 몬테카를로(2,500~4,000회) 승률 곡선 → 수치 확정 | "느낌"으로 정한 수치는 전부 재조정당했다. §9 참조 |

---

## 3. 코드 구조 지도 (index.html 내 순서)

```
<style>          UI (rpgwin 창 스타일, #hud 반투명, #menuBox max-height:64% 스크롤, #dlgPort 초상화)
<script>
  ── 데이터 ──
  NEXT_XP (34개=Lv35캡) / WEAPONS / ITEMS / SKILLS (16종)
  P (플레이어 상태) / S (스토리 플래그 38개) / CHEST_DB
  MAPS (26맵, gen_maps 산출) / SOLID / WALKP / DOORP / NPCS / ENC_* (인카운터 테이블)
  ENEMY_DB (23종)
  ── 에셋 생성 ──
  buildTiles()  타일 스프라이트 (t.G, t.M 물, t.E 침대 …)
  buildNpc()    NPC 스프라이트 (A.npc.*) — mkPerson 헬퍼 / mkCat / 골렘류
  buildEnemy()  전투 스프라이트 (A.enemy.*)
  sfx           WebAudio 효과음
  ── 필드 ──
  renderMap / 이동·충돌 / encounter 판정 (encFor()) / tryInteract() (타일별 분기)
  npcTalk(kind) 모든 NPC 대화·퀘스트 / openChest / dormMenu(휴식처) / travelMenu(3지점)
  labMenu / vendingShop / openShopWith(+shopPrice 할인) / jksShop(2장 별도!) / jk3Shop·jk3Build(3장 보스턴 JK — 별도!)
  ── 전투 ──
  startEncounter / startEventBattle({waves,onWin,noRun…}) / startBoss
  battleLoop(웨이브전 포함) / bossLoop(다페이즈) / playerCommand(메뉴) / playerAct(스킬 실행)
  enemyAct(적 AI 분기 — 키별 기믹) / eHitP / enemyGuard / calcDmg / hitChance / roundEnd
  dmgRange(예상뎀) / ilgwanSpend·ilgwanMult
  ── 메타 ──
  gainLevels / victoryFinal / bossVictory / defeat(현타)
  필드 메뉴 fmView(스탯/아이템/지도/미션/세이브) / QUESTS / canSave() / snapshot·applySnapshot
```

핵심 전투 수식:
- `hitChance(aspd,dspd) = clamp(0.92+(aspd-dspd)*0.012, 0.75, 0.98)` — **적도 최소 75%는 맞는다**(디버그 스탯에도)
- `calcDmg`: atk×mult×(0.9~1.1) − def, LUK% 확률 크리 ×1.5. LUK는 받는 피해 절반 가드 확률이기도 함
- 약점 노출(weak): 받는 피해 ×1.2 / 가드봉인(noGuard) / 적 ATK 디버프(debAtk ×0.85)
- 도주: `min(1, 0.7 + max(0, P.spd−적최고spd)×0.05)`
- 적 상태 턴 감소는 **roundEnd()에 일원화** — 다른 곳에서 감소시키지 말 것
- 보온 텀블러: roundEnd에서 매턴 MP+5 (S.chests['union4:11,4'])

---

## 4. 데이터·포맷 컨벤션 (verify.js가 이 포맷에 의존한다!)

### 4-1. 타일 문자표
| 문자 | 의미 | 통행 | 비고 |
|---|---|---|---|
| G/F/P | 잔디/실내바닥/포장도로 | ○ | G·F는 인카운터존으로 쓰임 |
| T/B/R/K/C | 나무/벽/지붕/책장/책상·테이블 | × | 장식·구조 |
| W | 술 좌판 | × | 조사 시 "점주에게 말 걸라" |
| D | 문(포털) | × | DOORP와 짝. **lock:()=>bool, msg:[…] 지원** |
| L/E | 연구실 문/침대·소파 | × | L=labMenu, E=dormMenu(맵별 문구) |
| O | 세이브 노트북 | × | 인접 시 canSave 성립 |
| V/X/J | 자판기/상자/심사석 | × | X는 CHEST_DB 필수 |
| A | 공항·역 표지판 | × | travelMenu |
| Y/H/M | 갈대·옥수수/디버그 돌탑/물 | × | M은 3장 신설 |
| S | 계단 | ○(밟으면 WALKP) | 유니언 던전 |
| N/Q/Z | 가로등/벤치/화단 | × | v2.5 장식. gen_maps `deco()` 자동 배치(연결성 보존), tryInteract 플레이버. N은 campus 야간 글로우 |
| U | 축구골대 | × | v2.6, mit 잔디밭 2개(수동 배치). 신규 타일은 **미니맵 col 테이블**(snapshot 근처)에도 색 추가할 것 |

### 4-2. verify.js가 기대하는 소스 포맷 (깨뜨리면 검증이 눈멂)
- 맵: ` mapid:{name:"이름",tiles:["...","..."]},` — **한 줄**, 앞에 공백 1칸
- 적 DB: 들여쓰기 **2칸** + `key:{key:'key',name:'이름',…}` — key 필드가 첫 번째
- 아이템: 들여쓰기 2칸 + `key:{name:'이름', price:…}` — name·price 순서 유지
- 스킬: `id:{id:'id',name:'이름',mp:N,lv:N,…}` — 이 순서 그대로
- WALKP/DOORP 엔트리: `'x,y':{to:'map',x:N,y:N…}` — 한 엔트리는 한 줄 안에
- NPCS: `{x:N,y:N,kind:'이름'…}` — x,y,kind 순서
- S 플래그: `const S={…}` 와 `applySnapshot` 내 `const def={…}` **두 곳 동시 추가** (verify [8]이 비교)

### 4-3. 신규 요소 추가 체크리스트
**NPC 추가** = ① NPCS 배치(빈 보행칸 위 아님 + 인접 보행칸 존재) ② `A.npc.키=` 스프라이트 ③ `npcTalk`에 `kind==='키'` 분기 ④ **데코 대상 맵이면 gen_maps `NPC_GUARD`에도 좌표 동기** (안 하면 데코가 NPC 위/주변에 깔림 — v2.5 rower-벤치 겹침 사고). 하나라도 빠지면 verify가 잡는다 (스프라이트 누락 → 투명 NPC였던 vgolem 사례).
**상자 추가** = 맵에 X 타일(gen_maps) + `CHEST_DB['map:x,y']` (gold/item/note/stat/regen/flag 중 하나). `req:()=>bool, reqMsg:[…]`로 잠금 가능.
**적 추가** = ENEMY_DB + `A.enemy.키` 스프라이트 + (기믹 있으면) enemyAct 분기 + verbs 테이블.
**스킬 추가** = SKILLS + (단일기) `targeted`/`TM`/`CFG`/단일 라우트 조건 + 연출 분기, (비대상기) **playerCommand의 명시 `if(c==='sk_키')return{type:'키'}` 필수** (susin/beopgo 누락 사례) + playerAct 분기. MULT 테이블에 예상뎀 등록.
**S 플래그 추가** = init + def 두 곳. **기존 필드 삭제·개명 절대 금지.**
**미션 추가** = QUESTS 배열. 2장 미션은 `ch2:true`(S.boss1 후 표시) — 3장은 같은 패턴으로 `ch3:true` + `S.boss2` 게이트를 **H단계에서 추가해야 함** (필터: `QUESTS.filter(q=>(!q.ch2||S.boss1)&&(!q.ch3||S.boss2))` 식으로 확장).

### 4-4. 자주 쓰는 패턴
- **골렘 게이트**: 길목 1칸에 `cond:()=>!S.플래그` NPC → 격파 시 플래그 → 길 열림 (五經 골렘, 자판기 골렘, 금서 망령). gen_maps 검증에서 해당 상자는 doors에서 빼고 전용 BFS 검사 추가.
- **이벤트 전투**: `startEventBattle({waves:[['a','b'],['c']], noRun, intro, waveMsg, onWin})`
- **순환 대화**: 전역 idx 변수(세이브 불필요) — `yenMailIdx` 참조.
- **플레이버 NPC**(기능 없음): `FLAVOR` 테이블 + `flavorTalk(kind)` + npcTalk 최상단의 명시적 `kind==='…'||…` 가드 한 줄(verify [4]가 리터럴을 요구). 새 플레이버 NPC = FLAVOR 항목 + 가드에 kind 추가 + NPCS 배치 + `A.npc.키` 스프라이트. 현재 19종(전 맵 분위기용 — 체스 노인·버스커·관광객·조정선수·밤샘 공대생·길 잃은 신입생 등).
- **진행도 분기 대화**: S 플래그로 if 체인 (yenmail이 표본: boss3 → paper3 → 순환).

---

## 5. 개발 워크플로우 (단계마다 반복)

1. **맵 작업**: gen_maps.py 수정 → 실행(자동 BFS 검증) → maps.js에서 정규식으로 블록 추출 → index.html splice
2. **로직 패치**: 고유 문자열 기반 치환 (실패 시 중단하고 원인 파악 — 비슷한 코드가 두 곳이면 더 긴 컨텍스트로)
3. **문법**: script 추출 → `node --check`
4. **검증**: `node verify.js index.html` — 실패 0건까지
5. **밸런스(전투 추가 시)**: 시뮬 스크립트로 승률 곡선 → 수치 확정 (§9 방법론)
6. **버전 표기 + 산출**: `<title>`과 타이틀 화면 부제 갱신, WIP 파일명으로 출력 (라이브는 H단계까지 보존)
7. xlsx 시트에 밸런스 노트 추가 (보스/몹/스킬 탭)

---

## 6. 완료 내역

### 배포본 v1.1 (1·2장)
- **1장 안암**: 캠퍼스 낮/밤(출입카드), 문과대 채점 3연전, 서고 던전(五經 골렘), 술집 골목 회식 배틀, 석사논문 3차 심사(보스). 스킬은 사서(四書) 계열.
- **2장 일리노이**: 쿼드(고양이 올리·꽈이꽈이 1/40 조우, 부적), 아시아도서관(+필드보스 금서 목록의 망령 → 최대 MP+30), 그린 스트리트(JK's 히든재고 = 전투 5승마다 입고·구매 소진, 포닥 리허설→학회 명찰), 카페 거리+헌책방(바리스타 도장카드 할인 / 우체국 밑반찬 / 돋보기 / 민서 USB), 유니언 4층 던전(자판기 골렘 → 롱패딩 DEF+5·보온 텀블러 턴당 MP+5), Prelim 보스.
- 시스템: 스킬 12종 역할 분리 + 예상뎀 표시, 도주 SPD 가산, **세이브 포인트 제한**(O/E/L 인접 또는 USB), 인카운터율 하향, 숙취(폭탄주 60%/스태그 10%).

### 3장 진행분 (v1.2-dev, A~G 완료 — 엔딩 도달 가능)
- **A 골격**: 9맵 — hsq(허브 40×28)·yenching·banana·newbury·charles(물 타일 M 신설)·mit·infinite(무한복도)·longwood·jobhall. 포털 46개 왕복 검증. travelMenu 3지점(서울↔일리노이↔보스턴, S.boss2 게이트) + 첫 도착 컷신(S.ch3first). **DOORP lock 기능 신설** — jobhall은 `lock:()=>!S.paper3`로 봉인.
- **B 거점**: 완당 메일함(순환 4종 + paper3/boss3 진행 분기 — 엔딩 메일까지 이미 작성됨), 바나나 라운지 가이드(지역 떡밥), 백베이 보틀숍(바롤로·웰러 현지 조달 = E단계 재료 공급선), 가젯 무기상점. 휴식처(E) 문구 6종 분기.
- **C 성장**: Lv캡 35(NEXT_XP 34개), 신규 스킬 4종 — 수신제가(Lv21, **자기 디버프 전해제+MP12, 침묵 중에도 사용 가능** — D단계 디버프 메타의 해답), 박학심문(Lv24 ×2.6), 법고창신(Lv27 전체×1.3+전체 약점), 활연관통(Lv30 ×3.0 방어·막기무시). 무기: 태블릿(ATK24/8만)·맥북(ATK36/20만). 디버그 돌탑 Lv35 상향.
- **D 몹·디버프 엔진**: 신규 디버프 4축 — **둔화**(`P.slow`: 실효 SPD−6, `pSpdNow()`가 명중·턴순서·도주에 일괄 반영), **MP 누수**(`P.mpLeak`: roundEnd서 매턴 MP−6), **혼란**(`P.confuse`: 행동 35% 실패, 그중 절반은 maxhp 5% 자해(비치명) — **아이템 사용은 혼란 면제**), **과로 스택**(`P.overwork`: 스택당 받는 피해 +8%, 최대 5스택, **턴 감소 없음** — 전투 종료·수신제가로만 해제, eHitP에서 증폭). 수신제가 해제 목록에 4축 전부 추가, 전투 상태 태그 4종, 리셋 4지점(P init/applySnapshot/defeat/endBattle) 동기화. 지역 몹 8종 — 거위 3종(gosling/goose/gander: 둔화·혼란, 떼 인카운터), 축구망령 2종(tackler/striker: 둔화·침묵), 롱우드 3종(intern/resident/cafghost: 과로·MP누수). ENC 4테이블 + encFor 분기(charles 1/20 · mit 1/20 · infinite 1/16 · longwood 1/18). **시뮬(4,000회, 무보급+텀블러·태블릿)**: charles Lv20 100% / mit 99% / infinite Lv20 88%→Lv24 98%(엘리트 3팩 tackler×2+striker는 도주 권장 — 이 레벨대 도주율 100%) / longwood 100%(과로 압박은 F단계 보스에서 본격화).
- **D+ 목(目)·BWH·보스턴 JK (F단계 선행분)**: ① **목(目) 중간보스** — MIT 잔디밭의 나무 지형물 NPC `moktree`(cond `!S.mok`)에 말 걸면 **상목/중목/하목 동시전**(`startEventBattle` waves 1개, noRun). 上目=3턴마다 적 전체 HP+45 힐·평타 약함·**주인공의 술을 가로챔**(item 분기에서 `B.enemies`에 sangmok 생존 시 효과 무효+상목 자가회복, **라면·밑반찬 등 음식은 제외**), 中目=고화력(35% ×1.6), 下目=상태이상 4종 랜덤(둔화/혼란/침묵/MP누수). 격파 시 `S.mok=1`+`S.bwhCoupon=1`. **시뮬: 무보급 Lv28 96% / 라면1개 Lv26 95%**(권장 Lv27+·술/요리 필수, 단 상목 탈취 때문에 회복템이 함정). ② **BWH 펠로우 5인**(롱우드, `bwh1~5` NPC=enemy 동명) — `S.bwhCoupon` 있으면 1:1 전투, 승리 시 `S.bwhN=1` + 레어 술 1병(buffalo/barolo/barbaresco/stagg/wellerfp). bwh2는 `drain`, bwh5(외과 과장)는 4턴마다 자가힐+강타. 단일전이라 Lv25+ 거의 100%. ③ **보스턴 JK** — NPC `jk3`, 5인 전부 격파(`S.bwh1~5`) 후 `jk3Shop` 개방. 첫 방문 시 레어 술 1병 무료(`S.jk3free`). 최상위 술 **파피 밴 윙클 23년**(`pappy`: 완전회복+ATK25%(5턴)+숙취없음, ₩55,000) 판매 — **3장 전투 5승마다 1병 입고**(`S.jk3kills`→`S.jk3stock`, jksShop의 jkkills 패턴 복제). victoryFinal에서 charles/mit/infinite/longwood 승리 시 jk3kills++. 신규 적 8종(sangmok/jungmok/hamok/bwh1~5)·NPC 7종(moktree/bwh1~5/jk3)·S플래그 11개·아이템 pappy 추가.
- **E 요리 시스템**: ① **락**(rock, 뉴버리 7,5) — 스태그/웰러 1병 → `S.matA`(숙성 육수). ② **문**(moon, 찰스 보트하우스 10,12) — 거위 의뢰(`S.moonQ=4`, victoryFinal서 charles 승리 시 적 마릿수만큼 차감, 0이 되면 `S.moonRamen=1`) → **천상 라면**(`P.inv.ramen`, **항상 최대 1개** — 보유 시 수령 거절, 함정 #12), 바롤로/바르바레스코 → `S.matB`(와인 졸임 소스). ③ **한**(han, MIT 25,12) — A+B 각 1개 소모 → **즉시 사용·영구 스탯업**(`S.hanIdx` 순환: HP+30/ATK+3/DEF+3/SPD+2/LUK+3, `S.hanCooked` 누적). ④ **적 SPD 디버프 축 신설**: `e.debSpd`(실효 SPD ×0.75) — `eSpdNow(e)`가 eMiss·턴순서(양 루프)·도주 ms에 일괄 반영, 감소는 roundEnd에만(함정 #8), mkE 초기화 포함. ⑤ **천상 라면 전투 사용**: 완전회복 + 적 전체 `debAtk=2`(−15%)·`debSpd=2`(−25%) — ATK 축은 기존 −15% 재사용(설계서의 −25%에서 의도적 완화), **필드 사용 불가**(`battle:true`, fmView서 disabled). **시뮬(4,000회, 목 기준)**: Lv24 무보급 28%→라면1 77% / Lv26 무보급 77%→요리3회+라면 99.6% — "요리 미사용 빠듯, 사용 쾌적" 달성. F·G 시뮬은 요리 K회 변수 필수.
- **F 필드보스·수집·바**: ① **보스 구스**(찰스, NPC `gooseboss` cond `!S.gooseboss`) — `bossgoose`(hp2200): 3턴마다 둔화 강타·30% 둔화·**피격 시 45% 반격(×1.2)**. ② **스트레스 종양**(롱우드, NPC `tumorboss`) — `stumor`(hp2300): 매턴급 과로 스택·4턴마다 고정뎀38+과로·반피 격노. 격파 시 각각 `S.gooseboss/S.tumorboss`. **시뮬(무보급)**: 둘 다 Lv30 ~36% / Lv32 ~73% (요리 시 100%, 권장 Lv30-32). ③ **루카스**(hsq 고양이 NPC `lucas`) — 5구역 보물(`S.gooseboss·tumorboss·mok·jk3open·nightfirst`) 전부 모으면 **루카스의 방울**(`S.bell`: roundEnd서 디버프 4축 추가 −1틱 = 지속 절반). ④ **나이트 쉬프트 맥주바**(NPC `nightshift` — v2.1에서 hsq→**charles 강변(20,10)**으로 이전) — 3장 전투 누적(`S.bountyKills`, victoryFinal서 ++) 5승마다 현상금(₩15,000+IPA), 첫 수령 시 `S.nightfirst`(루카스 보물#5). 신규 맥주 `nightshift`(HP+120 MP+20).
- **플레이버 NPC·hsq 광장 (F·G 이후)**: ① 전 맵에 **기능 없는 분위기 NPC 19종 20명** — FLAVOR 테이블·flavorTalk 순환 대사(§4-4 패턴): 안암(전단 학부생·노교수·엎드린 대학원생·벼락치기·골목 단골), 일리노이(원반·풋볼 팬·카페 죽돌이·룸메이트·스터디장), 보스턴(체스 노인·버스커·관광객(분수 옆)·쇼핑객·조정 선수·밤샘 공대생·번아웃 의대 친구·옌칭 사서·무한복도 길 잃은 신입생). ② **hsq 광장 데코**(gen_maps): 분수(M 2×2, 25-26×19-20)·야외 체스 테이블(C, 체스 노인 옆)·신문 가판대/기념품 키오스크(R/B 2동)·노천 테이블(C 4개)·가로수 11그루 보강.
- **밸런스·지형 패치 (F·G 이후)**: ① **바나나 라운지 이전** — hsq 북동 건물 철거(공원화) → **무한복도 동쪽 끝**(infinite 37,3 D타일, DOORP `infinite:{'37,3'}`)으로 이동. 회복 거점이 인카운터존(1/16) 깊숙이 들어가 리스크-보상 구조가 됨. 출구는 banana '7,9'→infinite(36,3). banguide·ch3first 컷신 대사도 갱신. ② **뉴버리 힐링 스팟(E) 제거** — 힐링 과다 해소(gen_maps에서 E 삭제 + dormMenu SPOT.newbury 제거). 무료 풀힐은 옌칭·바나나·찰스 벤치·1/2장 거점만. ③ **전체회복 술 가격 인상**(구매 난이도 상향): 폭탄주 6,000→**12,000** / 스태그 28,000→**45,000** / 웰러 30,000→**48,000** / 파피 55,000→**80,000**. 승률 시뮬은 보유 기준이라 §8 기준치 불변 — 경제(보급 빈도)로 난이도 조절.
- **G 최종보스·엔딩**: ① **논문 집필**(옌칭 NPC `thesis`) — 세 필드보스(mok·gooseboss·tumorboss) 격파 + Lv30 충족 시 초고 완성 → **`S.paper3=1`** → jobhall 잠금 해제(DOORP hsq 20,4 `lock:()=>!S.paper3`). ② **임용 커미티**(jobhall J타일 → `jobhallCommittee()` → `startBoss('committee')`) — BOSS_DEF.committee 3페이즈: 검색위원장 `cchair`(2턴마다 기력소진) → 외부심사 `cext`×2(40% 침묵/혼란) → 학장 `cdean`(3턴마다 고정뎀45+침묵 "예산이 없어요"·반피 격노). **bossLoop 종료 분기에 committee 추가**, `committeeVictory()` → `S.boss3=1` + [조교수] + 완당 최종 메일(yenmail에도 분기 기존). **시뮬**: 무보급 Lv32 32%(요리 필수) / 요리3회+라면 Lv30 98%·Lv32 100% (권장 Lv32-34). ③ **jobhall J타일 라우팅 수정** — `CUR==='jobhall'`이면 hallJudge가 아니라 jobhallCommittee(함정 #9 해소). 자판기 stock도 jobhall 분기(yuengling/barbaresco/nightshift) 추가. 신규 적 5종(bossgoose/stumor/cchair/cext/cdean)·NPC 5종(gooseboss/tumorboss/lucas/nightshift/thesis)·S플래그 7개·아이템 nightshift.

---

## 7. 남은 단계 — 본편 완결, 전 단계(A~H) 완료 ✅

### F. 필드보스·수집·바 ✅ 완료 (§6 F 참조)
- 목(目)/BWH/JK(D+) + 보스 구스(찰스)·스트레스 종양(롱우드)·루카스 수집(방울=S.bell)·나이트 쉬프트 현상금까지 모두 구현. (설계의 "infinite 끝 추가 보스"는 선택 사항으로 미구현 — 필요 시 ENC_INF 지역에 골렘 게이트 패턴으로 추가 가능.)

### G. 최종보스·엔딩 ✅ 완료 (§6 G 참조)
- 옌칭 `thesis` 집필 → `S.paper3` → jobhall 개방 → 임용 커미티 3페이즈 → `committeeVictory`(S.boss3=1, [조교수] 엔딩). jobhall J타일 라우팅·자판기 stock 처리 완료. **함정 #9(jobhall J=hallJudge) 해소됨.**

### H. 마감 ✅ 완료 (v2.0 배포)
- 미션 탭 3장 항목 11개 + 필터 `(!q.ch2||S.boss1)&&(!q.ch3||S.boss2)` 적용. **S.jk3open 미설정 버그 수정**(jk3Shop 진입 시 set — 루카스 보물 #4가 이것에 의존).
- 전투 배경 5종 추가: committee(Job Talk 강당)·charles(강+돛단배)·mit(그레이트 돔)·infinite(원근 복도)·longwood(병원 2동). 미니맵 M 색 확인 완료.
- **디버그 돌탑 → 소원 돌탑**(1회 LUK+5 + 막걸리 3병)으로 정식 교체 — 함정 #13 해소. README·CHANGELOG v2.0 갱신, verify 0건 + 전 보스 시뮬 재확인 후 index.html 교체.

### v2.1 패치 ✅ 완료
- **국제관**(campus 남서 건물, 문 12,25 → `intl1`/`intl2` 신규 맵 2종): ① 1층 = 국제 학회 던전(ENC 1/16, 학회 잡몹 3종 confstu/interp/posterg — 침묵·MP깎기 기믹, 출장비 상자 ₩25,000). **시뮬(무보급·만년필): Lv8 69% / Lv10 83% / Lv12 99%** — 권장 Lv10+ 고급 사냥터. ② 2층 = 계단 알코브를 NPC `staffer`(cond `!S.boss3`)가 가로막음 — **3장 완결 후 개방**. 교수급 3종 emer/keynote/chaired(ENC 1/14, 기력소진·침묵 기믹) + 잉크 상자(MP+20) + 최심부 NPC `tenure`(`S.tenureSeen` — **종신심사 Tenure DLC 떡밥**). **시뮬(맥북): Lv33 무보급 82% / Lv35+요리5 99%** — 만렙 엔드게임. 미션 2종(국제관 포스터 세션 5킬=`S.intlKills` / [종장] 종신의 문턱). 신규 S 플래그 2개·적 6종·NPC 2종·전투 배경 1종(1·2층 공용 분기). ③ **나이트 쉬프트 → charles 강변 이전**, ④ **gooseboss/tumorboss 필드 스프라이트를 전투 모습과 일치**(16×16 거위/종양)하게 교체.

### 다음 작업 후보 (선택)
- **볼륨 확장 로드맵: `volume_expansion_spec.md` 참조** — 5축(스토리/미니게임/반복/수집/편의) 명세 + v2.2~v3.0 배포 단위 제안. 신규 작업은 이 문서의 공통 구현 규약(§7)을 따를 것.
- (떡밥) 종신심사 Tenure 편 — 진엔딩/DLC. intl2의 `tenure` NPC가 입구. 설계서 엔딩 절 + 확장 명세 §1-1 참조.
- 캐릭터 성별 선택 · 외부 스프라이트시트 (README 로드맵).
- infinite 끝 추가 보스(선택 — 골렘 게이트 패턴, 확장 명세 §3-1 리비전 지옥이 회수 예정).

---

## 8. 밸런스 기준치 (시뮬로 확정된 값 — 깨뜨리면 안 되는 기준선)

| 콘텐츠 | 기준 |
|---|---|
| 1장 보스(석사) | Lv8 풀준비 94~99%, **폭탄주 없으면 17%** (고위험 필수템 정체성) |
| 2장 리허설 | 잉링 2병 Lv12 84% / Lv13 99% |
| 금서 망령 | 무보급 Lv13 81% / Lv14 97% (권장 Lv14+ 라벨) |
| 2장 Prelim | 맨몸 Lv18 71%, **+보온 텀블러 Lv17 82% / Lv18 97%** (유니언 던전=준비 코스) |
| 3장 목표 곡선 | 잡몹 Lv20~26 / 목(目) 권장 Lv26~28 / 필드보스(구스·종양) 권장 Lv30~32 / 커미티 권장 Lv32~34 + 요리 누적. 단독전은 **무보급 기준**으로 측정 |
| 3장 보스 구스 | 무보급 Lv30 36% / Lv32 77% (반격·둔화, 요리 시 100%) |
| 3장 스트레스 종양 | 무보급 Lv30 37% / Lv32 70% (과로 압박, 요리 시 100%) |
| 3장 임용 커미티 | **무보급 Lv32 32%(요리 사실상 필수)** / 요리3회+라면 Lv30 98% · Lv32 100% (최종보스, 요리 누적 설계) |
| 국제관 1층 (v2.1) | 무보급·만년필 Lv8 69% / Lv10 83% / Lv12 99% (권장 Lv10+ 고급 사냥터) |
| 국제관 2층 (v2.1) | 맥북 Lv33 무보급 82% / Lv35+요리5회 99% (3장 완결 후 만렙 엔드게임) |

**경제 기준치 (v1.2-dev 밸런스 패치)**: 전체회복 술은 비싸야 한다 — 폭탄주 ₩12,000 / 스태그 ₩45,000 / 웰러 ₩48,000 / 파피 ₩80,000. 무료 풀힐 스팟은 의도적으로 희소(뉴버리 제거됨, 바나나는 무한복도 끝). 다시 내리지 말 것.

**시뮬 방법론**: node 몬테카를로 2,500~4,000회. 플레이어 AI는 "실전형 로테이션" — 부동심 유지, 격물 스팸(약점 갱신), MP 60%↑일 때 실사→일이관지 콤보, 치국은 다수전 1회, 회복 임계(HP<40% 잉링, 위기 시 풀회복템). **유틸기를 쿨마다 재시전하는 AI는 금지**(v0.7에서 전 구간 0% 오판 사례). 아이템 소지 시 단독전은 거의 다 이기므로 **난이도 비교는 무보급 기준**.

---

## 9. 함정 목록 (전부 실제로 밟았던 것)

1. **S 플래그 한 곳만 추가** → 구세이브 로드 시 undefined. init+def 동시. (verify [8])
2. **NPC 스프라이트 누락** → 충돌·대화는 되는데 안 보이는 투명 NPC (vgolem가 v0.8~0.9 내내 투명이었음). (verify [4])
3. **비대상 스킬의 명시 라우팅 누락** → 메뉴에 떠도 실행 안 됨 (susin/beopgo 사례). playerCommand의 if 체인에 추가. (verify [7])
4. **검증을 의도 기준으로** → v0.5 출구 버그. 반드시 소스 리터럴 파싱(verify.js가 그렇게 함).
5. **CSS를 추출 script에서 grep** → 오탐. CSS 검증은 index.html 원본에서.
6. **포맷 컨벤션 파괴** → verify.js 정규식이 못 읽어 "검증 통과처럼 보이는 침묵". §4-2 포맷 유지.
7. **jksShop은 openShopWith와 별개** — 가격/할인 로직 수정 시 양쪽 모두 (shopPrice 사용처 grep).
8. **적 상태 감소를 battleLoop/bossLoop에서 직접** → 이중 감소. roundEnd에만.
9. ~~jobhall J = hallJudge 라우팅~~ **G단계에서 해소됨** — `CUR==='jobhall'`이면 jobhallCommittee()로 분기. (prelim→prelimJudge, 그 외→hallJudge 유지.)
10. **gen_maps의 골렘 게이트** — 의도된 차단을 검증기가 오류로 봄 → CHECK doors에서 빼고 전용 검사.
11. **maps.js splice 시 정규식 범위 과탐** — 한 번 아시아도서관·그린 블록을 통째로 삼킨 사고. 블록 단위 추출은 `( mapid:\{name:"…",tiles:\[[^\]]+\]\},)` 패턴으로 좁게.
12. 천상 라면 "2개 미만" = **항상 최대 1개**로 확정 해석 (사용자 승인됨).
13. ~~디버그 돌탑은 출시 전 제거/교체~~ **H단계에서 해소됨** — 소원 돌탑(1회 LUK+5 + 막걸리 3병, `S.debugMax` 플래그 재사용)으로 교체.
14. 인카운터율·고양이 조우율은 한 차례 대폭 하향된 값이 현행 — 새 지역도 1/15~1/26 대역에서 시작할 것.
15. 적 enemyAct 고정 데미지 기믹은 회피 불가로 설계됨(`P.hp-=N` 직접) — 부동심 무력화 수단이므로 남발 금지(보스당 1기믹).

---

## 10. 디버그 수단

- **돌탑**(campus 38,28 H 타일): 일반 모드 = 소원 돌탑(1회 웰러 1병). **URL에 `?admin`을 붙이면 관리자 모드** — 만질 때마다 모든 스탯 +1000(반복)·만렙·전 스킬·+₩100만.
- **콘솔 치트**: `cheat()` — 위와 동일 효과 (전역 노출, 어디서든).
- 만렙 치트(콘솔, 전역 노출): `P.lv=35;P.maxhp=1458;P.maxmp=156;P.atk=1078;P.def=1055;P.spd=1042;P.luk=1022;P.hp=P.maxhp;P.mp=P.maxmp;P.skills=Object.keys(SKILLS);updateHud();`
- 진행 플래그 강제: 콘솔에서 `S.boss2=1` 등 직접 세팅 가능.
- 3장 빠른 진입: 콘솔 치트 → 캠퍼스 A(공항) → 일리노이 → Prelim 1트 → 공항 → 보스턴.
- 세이브 코드는 base64(JSON) — 디코드해서 상태 직접 편집 가능.

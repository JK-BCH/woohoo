# 《격물치지》 핸드오프 문서 — Claude Code 인계용

> 대학원생 성장 RPG. 쯔꾸루 감성, **단일 index.html**(바닐라 JS + Canvas, 외부 에셋 0).
> 이 문서 하나로 아키텍처·컨벤션·완료 내역·남은 작업·함정을 모두 파악할 수 있게 작성했다.
> 함께 인계되는 파일: `gradschool_rpg_v12dev_ch3_ABCD.html`(작업본, 3장 A~D 완료), `index.html`(배포본 v1.1), `gen_maps.py`(맵 생성·검증), `verify.js`(8축 통합 검증), `chapter3_boston_design.md`(3장 설계서), `grad_school_rpg_balancing.xlsx`(밸런스 시트), `README.md`/`CHANGELOG.md`(배포 리포용).

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
#    빠른 테스트: 안암 캠퍼스 남동쪽 수풀의 [DEBUG] 돌탑 → Lv35 + 전 스탯 +1000
```

**모든 패치 후 1) → 2) 순서로 무조건 실행.** 이 두 단계가 지금까지 투명 NPC, 막힌 포털, 라우팅 누락 등 실제 버그를 전부 잡아왔다.

---

## 1. 제품·배포 상태

- **배포**: GitHub Pages — 리포 `JK-BCH/woohoo`, main 브랜치 root. URL `https://JK-BCH.github.io/woohoo/`
- **배포본**: v1.1 (1장 안암 + 2장 일리노이 완결). 리포에는 `index.html` + `README.md` + `CHANGELOG.md` 3개만 올라감.
- **작업본**: 3장 보스턴 A~D단계가 반영된 v1.2-dev (`gradschool_rpg_v12dev_ch3_ABCD.html`). **배포본과 분리 관리** — 3장이 H단계(마감)까지 끝나기 전엔 라이브 `index.html`을 덮어쓰지 말 것.
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

### 4-2. verify.js가 기대하는 소스 포맷 (깨뜨리면 검증이 눈멂)
- 맵: ` mapid:{name:"이름",tiles:["...","..."]},` — **한 줄**, 앞에 공백 1칸
- 적 DB: 들여쓰기 **2칸** + `key:{key:'key',name:'이름',…}` — key 필드가 첫 번째
- 아이템: 들여쓰기 2칸 + `key:{name:'이름', price:…}` — name·price 순서 유지
- 스킬: `id:{id:'id',name:'이름',mp:N,lv:N,…}` — 이 순서 그대로
- WALKP/DOORP 엔트리: `'x,y':{to:'map',x:N,y:N…}` — 한 엔트리는 한 줄 안에
- NPCS: `{x:N,y:N,kind:'이름'…}` — x,y,kind 순서
- S 플래그: `const S={…}` 와 `applySnapshot` 내 `const def={…}` **두 곳 동시 추가** (verify [8]이 비교)

### 4-3. 신규 요소 추가 체크리스트
**NPC 추가** = ① NPCS 배치(빈 보행칸 위 아님 + 인접 보행칸 존재) ② `A.npc.키=` 스프라이트 ③ `npcTalk`에 `kind==='키'` 분기. 하나라도 빠지면 verify가 잡는다 (스프라이트 누락 → 투명 NPC였던 vgolem 사례).
**상자 추가** = 맵에 X 타일(gen_maps) + `CHEST_DB['map:x,y']` (gold/item/note/stat/regen/flag 중 하나). `req:()=>bool, reqMsg:[…]`로 잠금 가능.
**적 추가** = ENEMY_DB + `A.enemy.키` 스프라이트 + (기믹 있으면) enemyAct 분기 + verbs 테이블.
**스킬 추가** = SKILLS + (단일기) `targeted`/`TM`/`CFG`/단일 라우트 조건 + 연출 분기, (비대상기) **playerCommand의 명시 `if(c==='sk_키')return{type:'키'}` 필수** (susin/beopgo 누락 사례) + playerAct 분기. MULT 테이블에 예상뎀 등록.
**S 플래그 추가** = init + def 두 곳. **기존 필드 삭제·개명 절대 금지.**
**미션 추가** = QUESTS 배열. 2장 미션은 `ch2:true`(S.boss1 후 표시) — 3장은 같은 패턴으로 `ch3:true` + `S.boss2` 게이트를 **H단계에서 추가해야 함** (필터: `QUESTS.filter(q=>(!q.ch2||S.boss1)&&(!q.ch3||S.boss2))` 식으로 확장).

### 4-4. 자주 쓰는 패턴
- **골렘 게이트**: 길목 1칸에 `cond:()=>!S.플래그` NPC → 격파 시 플래그 → 길 열림 (五經 골렘, 자판기 골렘, 금서 망령). gen_maps 검증에서 해당 상자는 doors에서 빼고 전용 BFS 검사 추가.
- **이벤트 전투**: `startEventBattle({waves:[['a','b'],['c']], noRun, intro, waveMsg, onWin})`
- **순환 대화**: 전역 idx 변수(세이브 불필요) — `yenMailIdx` 참조.
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

### 3장 진행분 (v1.2-dev, A·B·C·D 완료)
- **A 골격**: 9맵 — hsq(허브 40×28)·yenching·banana·newbury·charles(물 타일 M 신설)·mit·infinite(무한복도)·longwood·jobhall. 포털 46개 왕복 검증. travelMenu 3지점(서울↔일리노이↔보스턴, S.boss2 게이트) + 첫 도착 컷신(S.ch3first). **DOORP lock 기능 신설** — jobhall은 `lock:()=>!S.paper3`로 봉인.
- **B 거점**: 완당 메일함(순환 4종 + paper3/boss3 진행 분기 — 엔딩 메일까지 이미 작성됨), 바나나 라운지 가이드(지역 떡밥), 백베이 보틀숍(바롤로·웰러 현지 조달 = E단계 재료 공급선), 가젯 무기상점. 휴식처(E) 문구 6종 분기.
- **C 성장**: Lv캡 35(NEXT_XP 34개), 신규 스킬 4종 — 수신제가(Lv21, **자기 디버프 전해제+MP12, 침묵 중에도 사용 가능** — D단계 디버프 메타의 해답), 박학심문(Lv24 ×2.6), 법고창신(Lv27 전체×1.3+전체 약점), 활연관통(Lv30 ×3.0 방어·막기무시). 무기: 태블릿(ATK24/8만)·맥북(ATK36/20만). 디버그 돌탑 Lv35 상향.
- **D 몹·디버프 엔진**: 신규 디버프 4축 — **둔화**(`P.slow`: 실효 SPD−6, `pSpdNow()`가 명중·턴순서·도주에 일괄 반영), **MP 누수**(`P.mpLeak`: roundEnd서 매턴 MP−6), **혼란**(`P.confuse`: 행동 35% 실패, 그중 절반은 maxhp 5% 자해(비치명) — **아이템 사용은 혼란 면제**), **과로 스택**(`P.overwork`: 스택당 받는 피해 +8%, 최대 5스택, **턴 감소 없음** — 전투 종료·수신제가로만 해제, eHitP에서 증폭). 수신제가 해제 목록에 4축 전부 추가, 전투 상태 태그 4종, 리셋 4지점(P init/applySnapshot/defeat/endBattle) 동기화. 지역 몹 8종 — 거위 3종(gosling/goose/gander: 둔화·혼란, 떼 인카운터), 축구망령 2종(tackler/striker: 둔화·침묵), 롱우드 3종(intern/resident/cafghost: 과로·MP누수). ENC 4테이블 + encFor 분기(charles 1/20 · mit 1/20 · infinite 1/16 · longwood 1/18). **시뮬(4,000회, 무보급+텀블러·태블릿)**: charles Lv20 100% / mit 99% / infinite Lv20 88%→Lv24 98%(엘리트 3팩 tackler×2+striker는 도주 권장 — 이 레벨대 도주율 100%) / longwood 100%(과로 압박은 F단계 보스에서 본격화).
- **D+ 목(目)·BWH·보스턴 JK (F단계 선행분)**: ① **목(目) 중간보스** — MIT 잔디밭의 나무 지형물 NPC `moktree`(cond `!S.mok`)에 말 걸면 **상목/중목/하목 동시전**(`startEventBattle` waves 1개, noRun). 上目=3턴마다 적 전체 HP+45 힐·평타 약함·**주인공의 술을 가로챔**(item 분기에서 `B.enemies`에 sangmok 생존 시 효과 무효+상목 자가회복), 中目=고화력(35% ×1.6), 下目=상태이상 4종 랜덤(둔화/혼란/침묵/MP누수). 격파 시 `S.mok=1`+`S.bwhCoupon=1`. **시뮬: 무보급 Lv28 96% / 라면1개 Lv26 95%**(권장 Lv27+·술/요리 필수, 단 상목 탈취 때문에 회복템이 함정). ② **BWH 펠로우 5인**(롱우드, `bwh1~5` NPC=enemy 동명) — `S.bwhCoupon` 있으면 1:1 전투, 승리 시 `S.bwhN=1` + 레어 술 1병(buffalo/barolo/barbaresco/stagg/wellerfp). bwh2는 `drain`, bwh5(외과 과장)는 4턴마다 자가힐+강타. 단일전이라 Lv25+ 거의 100%. ③ **보스턴 JK** — NPC `jk3`, 5인 전부 격파(`S.bwh1~5`) 후 `jk3Shop` 개방. 첫 방문 시 레어 술 1병 무료(`S.jk3free`). 최상위 술 **파피 밴 윙클 23년**(`pappy`: 완전회복+ATK25%(5턴)+숙취없음, ₩55,000) 판매 — **3장 전투 5승마다 1병 입고**(`S.jk3kills`→`S.jk3stock`, jksShop의 jkkills 패턴 복제). victoryFinal에서 charles/mit/infinite/longwood 승리 시 jk3kills++. 신규 적 8종(sangmok/jungmok/hamok/bwh1~5)·NPC 7종(moktree/bwh1~5/jk3)·S플래그 11개·아이템 pappy 추가.

---

## 7. 남은 단계 (E → H) — 설계서(chapter3_boston_design.md)와 함께 읽을 것

### E. 요리 시스템 (설계서 §3-1) ★다음 작업
- 락(뉴버리 레스토랑 앞): 스태그/웰러 1병 → 재료A "숙성 육수". 문(찰스 보트하우스): ①주변 몹 N마리 처치 의뢰 → **천상 라면**(full회복+적 전체 ATK·SPD −25% 2턴 전투템, **항상 최대 1개 보유** — 받을 때 1개 있으면 거절) ②바롤로/바르바레스코 → 재료B "와인 졸임 소스". 한(MIT 근처): A+B → 스펙업 요리 **즉시 사용·영구 스탯업**(인벤에 안 남음, 종류 순환: HP+30/ATK+3/DEF+3/SPD+2/LUK+3 등 — 반복 가능하되 재료비가 비싸 자연 제한).
- 재료는 S 카운트(S.matA, S.matB)로, 라면은 P.inv.ramen으로. 합체요리가 **3장 파워 인플레의 주 동력**이므로 F·G 시뮬은 "요리 K회 사용" 변수로 돌릴 것.
- **주의**: 적측 디버프는 현재 `e.debAtk`(ATK −15%)뿐 — 천상 라면의 "적 전체 SPD −25%"용 **적 SPD 디버프 축(`e.debSpd` 등)은 E단계에서 신설**해야 함 (감소는 함정 #8대로 roundEnd에만, eMiss/턴순서/도주 계산에 반영).

### F. 필드보스·수집·바
- ✅(선행 완료) **목(目)** — D+단계에서 MIT 나무 지형물 트리거 + 상목/중목/하목 동시전으로 구현됨(설계 원안의 infinite 2페이즈와는 다른 형태). + **BWH 펠로우 5인 건틀릿 + 보스턴 JK 상점**(파피 밴 윙클)도 함께 구현. §6 D+ 참조.
- (남음) 보스 구스(찰스, 광역 둔화·반격), 스트레스 종양(롱우드, 과로 스택 압박). 골렘 게이트 패턴 재사용. infinite 끝의 추가 보스는 선택.
- 루카스(hsq 고정 NPC): 5개 지역 보물 수집(상자/보스 보상에 flag) → 루카스의 방울(디버프 저항: 지속턴 −1 또는 확률 무효).
- 나이트 쉬프트 맥주바: 현상금 게시판(반복 토벌 퀘) + 3장 맥주.

### G. 최종보스·엔딩
- **논문 작성 진행**: 옌칭에서 집필 단계 → 자료 퀘스트(주요 필드보스 격파와 연동) → `S.paper3=1` → jobhall 잠금 해제.
- **jobhall의 J 타일이 현재 hallJudge(1장 보스!)로 라우팅됨** — 반드시 3장 커미티 핸들러로 교체. (지금은 문이 잠겨 있어 도달 불가라 안전.)
- 교수 임용 커미티: 검색위원장(광역 기력소진) → 외부심사 2인(침묵+혼란) → 학장(고정뎀 "예산이 없어요" + 격노). `S.boss3=1` → [조교수] 엔딩 + 완당 최종 메일(yenmail에 이미 구현돼 있음).
- jobhall 자판기 stock도 prelim 분기에 추가.

### H. 마감
- 미션 탭 3장 항목(ch3:true 게이트 — §4-3), 전투 배경 (hsq/charles/mit/infinite/longwood/newbury), 미니맵 확인, README·CHANGELOG 갱신, **verify.js 0건 + 전 보스 시뮬 재확인** 후 라이브 index.html 교체 배포. 버전 v2.0 권장.

---

## 8. 밸런스 기준치 (시뮬로 확정된 값 — 깨뜨리면 안 되는 기준선)

| 콘텐츠 | 기준 |
|---|---|
| 1장 보스(석사) | Lv8 풀준비 94~99%, **폭탄주 없으면 17%** (고위험 필수템 정체성) |
| 2장 리허설 | 잉링 2병 Lv12 84% / Lv13 99% |
| 금서 망령 | 무보급 Lv13 81% / Lv14 97% (권장 Lv14+ 라벨) |
| 2장 Prelim | 맨몸 Lv18 71%, **+보온 텀블러 Lv17 82% / Lv18 97%** (유니언 던전=준비 코스) |
| 3장 목표 곡선 | 잡몹 Lv20~26 / 목(目) 권장 Lv26~28 / 커미티 권장 Lv32~34 + 요리 누적. 단독전은 **무보급 기준**으로 측정 |

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
9. **jobhall J = hallJudge 라우팅** (G단계에서 교체할 때까지 잠금 유지).
10. **gen_maps의 골렘 게이트** — 의도된 차단을 검증기가 오류로 봄 → CHECK doors에서 빼고 전용 검사.
11. **maps.js splice 시 정규식 범위 과탐** — 한 번 아시아도서관·그린 블록을 통째로 삼킨 사고. 블록 단위 추출은 `( mapid:\{name:"…",tiles:\[[^\]]+\]\},)` 패턴으로 좁게.
12. 천상 라면 "2개 미만" = **항상 최대 1개**로 확정 해석 (사용자 승인됨).
13. **디버그 돌탑은 출시 전 제거/교체** (코드에 주석 있음). H단계 배포 체크리스트에 포함.
14. 인카운터율·고양이 조우율은 한 차례 대폭 하향된 값이 현행 — 새 지역도 1/15~1/26 대역에서 시작할 것.
15. 적 enemyAct 고정 데미지 기믹은 회피 불가로 설계됨(`P.hp-=N` 직접) — 부동심 무력화 수단이므로 남발 금지(보스당 1기믹).

---

## 10. 디버그 수단

- **돌탑**(campus 남동 수풀, H 타일 38,28): Lv35 + 전 스탯 +1000 + 전 스킬. 모든 콘텐츠 한 방 확인용.
- 진행 플래그 강제: 콘솔에서 `S.boss2=1` 등 직접 세팅 가능 (전역 노출).
- 3장 빠른 진입: 돌탑 → 캠퍼스 A(공항) → 일리노이 → Prelim 1트 → 공항 → 보스턴.
- 세이브 코드는 base64(JSON) — 디코드해서 상태 직접 편집 가능.

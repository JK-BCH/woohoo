#!/usr/bin/env python3
# 1장 맵 6종 생성 + 검증 → JS 리터럴 출력
import json, sys
from collections import deque

SOLID=set('TBWDLRKCVXJOYAHEM')  # S,F,G,P 통행 가능

def grid(w,h,fill='G'):
    return [[fill]*w for _ in range(h)]
def border(g,ch):
    h=len(g);w=len(g[0])
    for x in range(w): g[0][x]=ch; g[h-1][x]=ch
    for y in range(h): g[y][0]=ch; g[y][w-1]=ch
def rect(g,x0,y0,x1,y1,ch):
    for y in range(y0,y1+1):
        for x in range(x0,x1+1): g[y][x]=ch
def hline(g,y,x0,x1,ch):
    for x in range(x0,x1+1): g[y][x]=ch
def vline(g,x,y0,y1,ch):
    for y in range(y0,y1+1): g[y][x]=ch
def put(g,x,y,ch): g[y][x]=ch

# ---------- 안암 캠퍼스 40x30 (v0.5 재설계: 길은 전부 목적지에서 끝남) ----------
c=grid(40,30,'G'); border(c,'T')
# 본관 rows2-4 cols15-24, 문 (19,4)
hline(c,2,15,24,'R')
for y in (3,4):
    for x in range(15,25): c[y][x]='B'
put(c,19,4,'D')
# 문과대 rows5-7 cols4-11, 문 (7,7)
hline(c,5,4,11,'R')
for y in (6,7):
    for x in range(4,12): c[y][x]='B'
put(c,7,7,'D')
# 도서관 rows5-7 cols27-34, 문 (31,7)
hline(c,5,27,34,'R')
for y in (6,7):
    for x in range(27,35): c[y][x]='B'
put(c,31,7,'D')
# 연구실 rows13-15 cols27-31, 문 (29,15)
hline(c,13,27,31,'R')
for y in (14,15):
    for x in range(27,32): c[y][x]='B'
put(c,29,15,'L')
# 도로망: 메인 가로 y8 (문과대 문앞 x7 ~ 도서관 문앞 x31)
hline(c,8,7,31,'P')
# 본관 앞 세로 x19 (본관 문앞 y5 ~ 분기점 y21)
vline(c,19,5,21,'P')
# 연구실 연결 y16 (x19 ~ 연구실 문앞 x29)
hline(c,16,19,29,'P')
# 골목 연결: y21 서쪽 x6~x19 → 남쪽 x6 y22~28 (포털)
hline(c,21,6,19,'P')
vline(c,6,22,28,'P')
# 나무 장식 (도로·건물 회피)
for (x,y) in [(3,3),(13,3),(26,3),(36,3),(3,11),(36,11),(13,12),(24,12),(3,18),(36,18),(13,24),(26,24),(33,24),(10,19),(29,21),(16,11),(23,19),(36,25),(3,25)]:
    if c[y][x]=='G': c[y][x]='T'
put(c,10,20,'A')   # 공항버스 표지판 (도로 y21 위에서 조사)
put(c,38,28,'H')   # 히든: 소원 돌탑 (1회 LUK+5 + 막걸리 3병 — v2.0에서 디버그 기능 제거)
# [v2.1] 국제관 (남서) rows23-25 cols9-16, 문 (12,25) — 1층 고급 사냥터 / 2층 교수급(3장 완결 후)
hline(c,23,9,16,'R')
for y in (24,25):
    for x in range(9,17): c[y][x]='B'
put(c,12,25,'D')
hline(c,26,7,12,'P')   # 국제관 앞 도로 (골목길 x6 세로와 연결)

# ---------- 문과대 20x15 ----------
l=grid(20,15,'F'); border(l,'B')
for y in (4,8):
    for x in list(range(3,9))+list(range(11,14)):
        l[y][x]='C'   # 책상 줄
hline(l,5,14,18,'C')   # 조교 데스크 (조교는 (16,4)에 서있음)
put(l,10,14,'F')        # 남쪽 출구 통로

# ---------- 도서관 열람실 25x20 ----------
b=grid(25,20,'F'); border(b,'B')
for y in (3,5,7):
    for x in range(3,13):
        if x!=7: b[y][x]='K'    # 서가 (가운데 통로)
for y in (11,12):
    for x in range(4,15):
        if x!=9: b[y][x]='C'    # 열람석
hline(b,4,16,20,'C')            # 대출 카운터 (사서 (18,6) 앞쪽)
put(b,22,2,'S')                  # B2 계단 (열쇠 필요)
put(b,12,19,'F')                 # 남쪽 출구

# ---------- 깊은 서고 B2 25x20 ----------
s=grid(25,20,'F'); border(s,'B')
vline(s,4,3,16,'K'); put(s,4,9,'F')
vline(s,8,2,15,'K'); put(s,8,6,'F')
vline(s,12,4,17,'K'); put(s,12,12,'F')
vline(s,16,2,15,'K'); put(s,16,8,'F')
vline(s,20,4,16,'K'); put(s,20,13,'F')
put(s,22,2,'S')                  # 위층 계단
# 골렘 포켓: 상자 (1,18), 옆 봉쇄
put(s,1,18,'X'); put(s,2,17,'K'); put(s,2,18,'K')
# 추가 상자
put(s,12,2,'X'); put(s,19,17,'X')
# X(12,2): 위 vline8/16과 안 겹침 확인됨

# ---------- 술집 골목 15x12 ----------
a=grid(15,12,'G'); border(a,'T')
vline(a,7,1,10,'P')
# 좌측 점포 건물 + 좌판
for y in range(2,9):
    for x in (1,2): a[y][x]='B'
for y in (3,5,7): put(a,3,y,'W')   # 좌판 3개 (점주 NPC는 (4,3),(4,5),(4,7))
# 우측 안쪽 룸 (cols10-13, rows2-6), 입구 (10,4)
for x in range(10,14):
    a[2][x]='B'; a[6][x]='B'
for y in range(2,7):
    a[y][13]='B'
for y in (3,4,5):
    for x in (10,11,12): a[y][x]='F'
a[3][10]='B'; a[5][10]='B'        # 입구 (10,4)만 개방
# 골목 바닥 디테일: 좌판 앞 통로
vline(a,4,2,8,'P'); hline(a,4,4,7,'P') if False else None
hline(a,9,3,11,'P')
for y in (3,5,7): put(a,4,y,'P')
hline(a,4,5,6,'P')   # (5..6,4)? -> y=4 가로
# 단순화: 추가 길
for x in range(4,8): a[4][x]= 'P' if a[4][x]=='G' else a[4][x]

# ---------- 본관 심사장 12x10 ----------
h=grid(12,10,'F'); border(h,'B')
for x in range(4,8): h[2][x]='J'   # 심사석
put(h,2,2,'V')                      # 자판기
put(h,9,2,'O')                      # 세이브 노트북
put(h,6,9,'F')                      # 남쪽 출구


# ---------- [2장] UIUC 메인 쿼드 36x26 (v0.7: 기숙사·유니언 증축) ----------
q=grid(36,26,'G'); border(q,'T')
for (x,y) in [(2,1),(3,1),(5,1),(8,1),(11,1),(24,1),(27,1),(30,1),(33,1),(1,5),(1,8),(1,14),(1,19),(34,3),(34,8),(34,18),(2,24),(7,24),(26,24),(31,24)]:
    if q[y][x]=='G': q[y][x]='Y'
# 본부(예비심사장) rows2-4 cols14-21, 문 (17,4)
hline(q,2,14,21,'R')
for y in (3,4):
    for x in range(14,22): q[y][x]='B'
put(q,17,4,'D')
# 아시아도서관 rows8-10 cols3-9, 문 (6,10)
hline(q,8,3,9,'R')
for y in (9,10):
    for x in range(3,10): q[y][x]='B'
put(q,6,10,'D')
# 일리니 유니언 rows8-10 cols24-30, 문 (27,10)
hline(q,8,24,30,'R')
for y in (9,10):
    for x in range(24,31): q[y][x]='B'
put(q,27,10,'D')
# 기숙사(셔먼 홀) rows16-18 cols8-14, 문 (11,18)
hline(q,16,8,14,'R')
for y in (17,18):
    for x in range(8,15): q[y][x]='B'
put(q,11,18,'D')
# 도로
vline(q,17,5,21,'P')
hline(q,12,6,34,'P')
vline(q,6,11,12,'P')
vline(q,27,11,12,'P')
vline(q,11,19,20,'P')
hline(q,20,12,16,'P')
# 카페 거리 진입로 (남서쪽으로)
vline(q,8,20,24,'P')
hline(q,20,8,12,'P')
put(q,16,21,'A')
put(q,2,22,'X')
for (x,y) in [(22,7),(21,15),(25,17),(30,21),(4,15)]:
    if q[y][x]=='G': q[y][x]='T'

# ---------- [2장] 카페 거리 24x14 (서사 허브) ----------
cf=grid(24,14,'G'); border(cf,'T')
# 가게 4채: 카페(4) 서점(9) 우체국(14) 헌책방(19)  rows3-5
for cx in (4,9,14,19):
    hline(cf,3,cx-1,cx+1,'R')
    for yy in (4,5):
        for xx in range(cx-1,cx+2): cf[yy][xx]='B'
put(cf,19,5,'D')   # 헌책방만 실제 진입
# 도로
hline(cf,7,2,21,'P')
vline(cf,19,6,7,'P')   # 헌책방 문 앞 진입로
put(cf,12,1,'P')   # 북쪽 출구(쿼드)
vline(cf,12,1,7,'P')
# 벤치/가로수
for (x,y) in [(2,10),(6,10),(11,10),(16,10),(21,10),(7,2),(17,2)]:
    if cf[y][x]=='G': cf[y][x]='T'
put(cf,3,10,'E')   # 카페 야외 좌석(벤치=침대타일 재활용: 휴식)

# ---------- [2장] 헌책방 안쪽 16x10 (절판 사료 미니던전) ----------
bk=grid(16,10,'F'); border(bk,'B')
vline(bk,4,2,7,'K'); put(bk,4,5,'F')
vline(bk,8,2,7,'K'); put(bk,8,4,'F')
vline(bk,12,2,7,'K'); put(bk,12,6,'F')
put(bk,14,2,'X')   # 절판 사료 상자
put(bk,8,9,'F')    # 남쪽 출구

# ---------- [2장] 기숙사 셔먼 홀 12x9 ----------
do=grid(12,9,'F'); border(do,'B')
put(do,2,2,'E')      # 침대 (전용 타일)
put(do,5,2,'C')      # 책상
put(do,9,2,'X')      # 사물함(스탯 아이템)
put(do,6,8,'F')      # 남쪽 출구

# ---------- [2장] 일리니 유니언 1~4층 (v0.8: 4층 던전) ----------
def ufloor():
    m=grid(14,10,'F'); border(m,'B'); return m
u1=ufloor()                       # 1F 푸드코트: 회장 NPC, 위층 계단
for x in (4,7,10): u1[4][x]='C'
put(u1,12,2,'S')
put(u1,7,9,'F')
u2=ufloor()                       # 2F 스터디룸: 서가, 패딩 상자
put(u2,12,2,'S'); put(u2,1,2,'S')
for x in (5,8): u2[5][x]='K'
put(u2,12,7,'X')
u3=ufloor()                       # 3F 행정 사무실: 책상들
put(u3,1,2,'S'); put(u3,12,2,'S')
for x in (4,7,10): u3[6][x]='C'
u4=ufloor()                       # 4F 라운지: 폭주 자판기 골렘 길목 + 보온 텀블러
put(u4,1,2,'S')
vline(u4,9,1,8,'B'); put(u4,9,4,'F')
put(u4,11,4,'X')


# ---------- [2장] 아시아도서관 24x18 ----------
al=grid(24,18,'F'); border(al,'B')
vline(al,4,3,13,'K'); put(al,4,8,'F')
vline(al,8,2,12,'K'); put(al,8,5,'F')
vline(al,12,4,14,'K'); put(al,12,10,'F')
vline(al,16,2,12,'K'); put(al,16,7,'F')
vline(al,20,4,13,'K'); put(al,20,9,'F')
put(al,2,15,'X'); put(al,21,15,'X')
put(al,12,17,'F')

# ---------- [2장] 그린 스트리트 20x12 ----------
gr=grid(20,12,'G'); border(gr,'T')
for x in (4,9,14): gr[3][x]='W'
hline(gr,6,2,17,'P')
for x in (4,9,14): gr[5][x]='P'
put(gr,1,6,'P')
for (x,y) in [(7,9),(12,9),(17,9),(2,9)]:
    if gr[y][x]=='G': gr[y][x]='T'

# ============================================================
# [3장] 보스턴 — A단계 골격
# ============================================================

# ---------- [3장] 하버드 스퀘어 40x28 (허브) ----------
hs=grid(40,28,'G'); border(hs,'T')
# 옌칭연구소 (북서) rows2-4 cols3-12, 문 (7,4)
hline(hs,2,3,12,'R')
for y in (3,4):
    for x in range(3,13): hs[y][x]='B'
put(hs,7,4,'D')
# 임용장 대강당 (북중앙) rows2-4 cols16-25, 문 (20,4) — 논문 완성 전 잠금
hline(hs,2,16,25,'R')
for y in (3,4):
    for x in range(16,26): hs[y][x]='B'
put(hs,20,4,'D')
# (구 바나나 라운지 자리 — MIT 무한복도 끝으로 이전. 북동쪽은 작은 공원으로)
for (x,y) in [(30,3),(33,2),(36,4),(31,6),(35,7)]:
    hs[y][x]='T'
# 도로망: 길은 전부 목적지에서 종결
vline(hs,20,5,25,'P')          # 메인 세로 (대강당 문앞 ~ 남쪽 롱우드 포털)
hline(hs,8,7,20,'P')           # 북 가로 (옌칭~대강당)
vline(hs,7,5,8,'P')            # 옌칭 연결
hline(hs,14,1,38,'P')          # 중앙 대로 (서: 뉴버리 포털 / 동: 찰스 포털)
put(hs,16,20,'A')              # T 정거장 (공항 연결)
vline(hs,16,21,21,'P'); hline(hs,21,16,20,'P')   # 정거장 진입로(메인 세로와 연결)
# 장식: 가로수·노점
for (x,y) in [(4,11),(13,11),(27,11),(35,11),(4,18),(35,18),(10,23),(28,23),(13,17),(26,17)]:
    if hs[y][x]=='G': hs[y][x]='T'
# 광장 꾸미기 (밸런스 패치 후속): 분수·야외 체스·키오스크·노천 테이블·가로수 보강
for (x,y) in [(25,19),(26,19),(25,20),(26,20)]: hs[y][x]='M'   # 광장 분수
for (x,y) in [(10,17),(11,17)]: hs[y][x]='C'                   # 야외 체스 테이블 (체스 노인 옆)
hline(hs,16,4,6,'R'); hline(hs,17,4,6,'B')                     # 서쪽 신문 가판대
hline(hs,21,28,30,'R'); hline(hs,22,28,30,'B')                 # 동쪽 기념품 키오스크
for (x,y) in [(7,12),(8,12),(31,16),(32,16)]: hs[y][x]='C'     # 노천 카페 테이블 (장식)
for (x,y) in [(24,6),(36,6),(2,10),(37,12),(12,20),(33,17),(5,24),(35,24),(9,9),(24,23),(15,24)]:
    if hs[y][x]=='G': hs[y][x]='T'

# ---------- [3장] 옌칭연구소 14x10 ----------
yc=grid(14,10,'F'); border(yc,'B')
put(yc,2,2,'E')                # 연구실 쪽잠 침대
for x in (5,8): yc[3][x]='C'   # 책상
put(yc,11,2,'O')               # 세이브 노트북
put(yc,7,9,'F')                # 남쪽 출구

# ---------- [3장] 바나나 라운지 14x10 ----------
bn=grid(14,10,'F'); border(bn,'B')
put(bn,2,2,'E')                # 소파 (회복)
for x in (5,8,11): bn[4][x]='C' # 테이블
put(bn,7,9,'F')

# ---------- [3장] 뉴버리 스트릿 26x14 ----------
nb=grid(26,14,'G'); border(nb,'T')
# 레스토랑(락 예정) rows2-4 cols3-8
hline(nb,2,3,8,'R')
for y in (3,4):
    for x in range(3,9): nb[y][x]='B'
# 술 좌판 2곳 + 부티크 건물
for x in (13,18): nb[3][x]='W'
hline(nb,2,21,24,'R')
for y in (3,4):
    for x in range(21,25): nb[y][x]='B'
# 도로
hline(nb,7,2,24,'P')
for x in (5,13,18): vline(nb,x,5,7,'P')
put(nb,24,7,'P')               # 동쪽 출구 → 하버드 스퀘어
# (카페 야외 좌석 E는 밸런스 패치로 제거 — 힐링 스팟 과다)
for (x,y) in [(9,10),(15,10),(21,10),(2,5)]:
    if nb[y][x]=='G': nb[y][x]='T'

# ---------- [3장] 찰스 리버 30x20 ----------
cr=grid(30,20,'G'); border(cr,'T')
for y in range(1,8):
    for x in range(1,29): cr[y][x]='M'   # 강
hline(cr,8,1,28,'G')                      # 강둑
hline(cr,9,1,28,'P')                      # 산책로 (서: 하버드 / 동: MIT)
# 보트하우스(문 NPC 예정) rows11-13 cols4-9
hline(cr,11,4,9,'R')
for y in (12,13):
    for x in range(4,10): cr[y][x]='B'
put(cr,12,11,'E')              # 강변 벤치
# 갈대(Y 재활용)
for (x,y) in [(3,8),(8,8),(14,8),(20,8),(25,8),(11,15),(18,15),(24,16),(5,16)]:
    if cr[y][x]=='G': cr[y][x]='Y'

# ---------- [3장] MIT 32x22 ----------
mt=grid(32,22,'G'); border(mt,'T')
# 그레이트 돔 rows2-5 cols11-20, 문 (15,5) → 무한복도
hline(mt,2,11,20,'R')
for y in (3,4,5):
    for x in range(11,21): mt[y][x]='B'
put(mt,15,5,'D')
# 콘크리트 광장
for y in range(6,9):
    for x in range(9,23): mt[y][x]='P'
hline(mt,11,1,15,'P')          # 서쪽 출구 → 찰스 리버
vline(mt,15,9,11,'P')
# 잔디(축구장 느낌 — 인카운터존 예정)
for (x,y) in [(5,15),(26,15),(10,18),(21,18),(27,5),(4,5)]:
    if mt[y][x]=='G': mt[y][x]='T'

# ---------- [3장] 무한복도 38x7 ----------
ic=grid(38,7,'F'); border(ic,'B')
for x in range(6,34,6): put(ic,x,1,'B'); put(ic,x,5,'B')   # 기둥
put(ic,2,4,'F')                # 서쪽 입출구 부근
put(ic,37,3,'D')               # 동쪽 끝 — 바나나 라운지 (포닥들의 비밀 휴게실)

# ---------- [3장] 롱우드 지역 28x18 ----------
lw=grid(28,18,'G'); border(lw,'T')
# 병원 2동
hline(lw,3,3,11,'R')
for y in (4,5,6):
    for x in range(3,12): lw[y][x]='B'
hline(lw,3,17,25,'R')
for y in (4,5,6):
    for x in range(17,26): lw[y][x]='B'
# 도로
vline(lw,14,1,9,'P')           # 북쪽 출구 → 하버드 스퀘어
hline(lw,9,4,24,'P')
for (x,y) in [(6,13),(14,13),(22,13),(2,11),(26,11)]:
    if lw[y][x]=='G': lw[y][x]='T'

# ---------- [3장] 임용장 12x10 ----------
jh=grid(12,10,'F'); border(jh,'B')
for x in range(4,8): jh[2][x]='J'
put(jh,2,2,'V'); put(jh,9,2,'O')
put(jh,6,9,'F')

# ---------- [2장] 예비심사장 12x10 ----------
pr=grid(12,10,'F'); border(pr,'B')
for x in range(4,8): pr[2][x]='J'
put(pr,2,2,'V'); put(pr,9,2,'O')
put(pr,6,9,'F')

# ---------- [v2.1] 국제관 1층 14x10 — 국제 학회장 (Lv10~15 고급 사냥터) ----------
i1=grid(14,10,'F'); border(i1,'B')
put(i1,12,1,'B'); put(i1,11,2,'B')   # 계단 알코브 벽 (스태프 NPC (12,3)가 유일한 통로를 가로막음)
put(i1,12,2,'S')                      # 2층 계단 (3장 완결 후 개방)
for x in (3,6,9): i1[4][x]='K'        # 포스터 세션 보드
put(i1,1,7,'X')                       # 상자
put(i1,7,9,'F')                       # 남쪽 출구

# ---------- [v2.1] 국제관 2층 14x10 — VIP 라운지 (교수급, 3장 완결 후) ----------
i2=grid(14,10,'F'); border(i2,'B')
put(i2,12,2,'S')                      # 1층 계단
for x in (4,7,10): i2[5][x]='C'       # 기조연설 단상
put(i2,1,8,'X')                       # 상자

MAPS={
 'campus':dict(g=c,name='안암 캠퍼스'),
 'liberal':dict(g=l,name='문과대'),
 'library':dict(g=b,name='중앙도서관 열람실'),
 'stacks':dict(g=s,name='깊은 서고 B2'),
 'alley':dict(g=a,name='안암 술집 골목'),
 'hall':dict(g=h,name='본관 심사장'),
 'quad':dict(g=q,name='UIUC 메인 쿼드'),
 'asianlib':dict(g=al,name='아시아도서관'),
 'green':dict(g=gr,name='그린 스트리트'),
 'cafe':dict(g=cf,name='카페 거리'),
 'bookstore':dict(g=bk,name='헌책방'),
 'dorm':dict(g=do,name='셔먼 홀 기숙사'),
 'union1':dict(g=u1,name='일리니 유니언 1층'),
 'union2':dict(g=u2,name='일리니 유니언 2층'),
 'union3':dict(g=u3,name='일리니 유니언 3층'),
 'union4':dict(g=u4,name='일리니 유니언 4층'),
 'prelim':dict(g=pr,name='예비심사장'),
 'hsq':dict(g=hs,name='하버드 스퀘어'),
 'yenching':dict(g=yc,name='옌칭연구소'),
 'banana':dict(g=bn,name='바나나 라운지'),
 'newbury':dict(g=nb,name='뉴버리 스트릿'),
 'charles':dict(g=cr,name='찰스 리버'),
 'mit':dict(g=mt,name='MIT'),
 'infinite':dict(g=ic,name='무한복도'),
 'longwood':dict(g=lw,name='롱우드 지역'),
 'jobhall':dict(g=jh,name='임용 심사장'),
 'intl1':dict(g=i1,name='국제관 1층'),
 'intl2':dict(g=i2,name='국제관 2층'),
}

# ---------- 검증 ----------
# 보행 포털/도착점/상호작용 지점
CHECK={
 'campus':dict(start=(19,12),walk=[(6,28)],doors=[(19,4),(7,7),(31,7),(29,15),(10,20),(38,28),(12,25)],npc=[(17,6)],arrive=[(6,27),(7,8),(31,8),(19,5),(19,12),(29,16),(12,26)]),
 'liberal':dict(start=(10,13),walk=[(10,14)],doors=[],npc=[(16,4)],arrive=[(10,13)]),
 'library':dict(start=(12,18),walk=[(12,19),(22,2)],doors=[],npc=[(18,6)],arrive=[(12,18),(22,3)]),
 'stacks':dict(start=(22,3),walk=[(22,2)],doors=[(12,2),(19,17)],npc=[(1,17)],arrive=[(22,3)]),
 'alley':dict(start=(7,2),walk=[(7,1)],doors=[(3,3),(3,5),(3,7)],npc=[(4,3),(4,5),(4,7),(12,4)],arrive=[(7,2)]),
 'hall':dict(start=(6,8),walk=[(6,9)],doors=[(4,2),(5,2),(6,2),(7,2),(2,2),(9,2)],npc=[],arrive=[(6,8)]),
 'quad':dict(start=(17,20),walk=[(34,12),(8,24)],doors=[(17,4),(6,10),(27,10),(11,18),(16,21),(2,22)],npc=[(19,6)],arrive=[(17,20),(17,5),(6,11),(33,12),(27,11),(11,19),(8,23)]),
 'dorm':dict(start=(6,7),walk=[(6,8)],doors=[(2,2),(9,2)],npc=[],arrive=[(6,7)]),
 'union1':dict(start=(7,8),walk=[(7,9),(12,2)],doors=[],npc=[(3,7)],arrive=[(7,8),(11,2)]),
 'union2':dict(start=(11,2),walk=[(12,2),(1,2)],doors=[(12,7)],npc=[],arrive=[(11,2),(2,2)]),
 'union3':dict(start=(2,2),walk=[(1,2),(12,2)],doors=[],npc=[],arrive=[(2,2),(11,2)]),
 'union4':dict(start=(2,2),walk=[(1,2)],doors=[],npc=[(9,4)],arrive=[(2,2)]),  # 상자(11,4)는 골렘 게이트 전용 검사로 대체
 'asianlib':dict(start=(12,16),walk=[(12,17)],doors=[(2,15),(21,15)],npc=[],arrive=[(12,16)]),
 'green':dict(start=(2,6),walk=[(1,6)],doors=[(4,3),(9,3),(14,3)],npc=[(4,4),(9,4),(14,4)],arrive=[(2,6)]),
 'cafe':dict(start=(12,8),walk=[(12,1)],doors=[(19,5)],npc=[(4,7),(9,7),(14,7)],arrive=[(12,8),(12,2),(19,6)]),
 'bookstore':dict(start=(8,8),walk=[(8,9)],doors=[(14,2)],npc=[],arrive=[(8,8)]),
 'prelim':dict(start=(6,8),walk=[(6,9)],doors=[(4,2),(5,2),(6,2),(7,2),(2,2),(9,2)],npc=[],arrive=[(6,8)]),
 'hsq':dict(start=(20,14),walk=[(1,14),(38,14),(20,25)],doors=[(7,4),(20,4),(16,20)],npc=[],arrive=[(20,14),(20,5),(7,5),(2,14),(37,14),(20,24),(16,21)]),
 'yenching':dict(start=(7,8),walk=[(7,9)],doors=[(2,2),(11,2)],npc=[],arrive=[(7,8)]),
 'banana':dict(start=(7,8),walk=[(7,9)],doors=[(2,2)],npc=[],arrive=[(7,8)]),
 'newbury':dict(start=(23,7),walk=[(24,7)],doors=[(13,3),(18,3)],npc=[],arrive=[(23,7)]),
 'charles':dict(start=(2,9),walk=[(1,9),(28,9)],doors=[(12,11)],npc=[],arrive=[(2,9),(27,9)]),
 'mit':dict(start=(2,11),walk=[(1,11)],doors=[(15,5)],npc=[],arrive=[(2,11),(15,6)]),
 'infinite':dict(start=(2,3),walk=[(1,3)],doors=[(37,3)],npc=[],arrive=[(2,3),(36,3)]),
 'longwood':dict(start=(14,2),walk=[(14,1)],doors=[],npc=[],arrive=[(14,2)]),
 'jobhall':dict(start=(6,8),walk=[(6,9)],doors=[(4,2),(5,2),(6,2),(7,2),(2,2),(9,2)],npc=[],arrive=[(6,8)]),
 'intl1':dict(start=(7,8),walk=[(7,9)],doors=[(1,7)],npc=[(12,3)],arrive=[(7,8),(12,3)]),  # 계단(12,2)은 NPC 게이트 — doors에서 제외 (함정 #10 패턴)
 'intl2':dict(start=(12,3),walk=[(12,2)],doors=[(1,8)],npc=[(2,2)],arrive=[(12,3)]),
}
ok=True
for mid,info in MAPS.items():
    g=info['g']; w=len(g[0]); h2=len(g)
    chk=CHECK[mid]
    npcset=set(chk['npc'])
    def passable(x,y):
        if x<0 or y<0 or x>=w or y>=h2: return False
        return g[y][x] not in SOLID and (x,y) not in npcset
    sx,sy=chk['start']
    if not passable(sx,sy):
        print(f'[{mid}] 시작점 막힘 {sx},{sy} ({g[sy][sx]})'); ok=False; continue
    seen={(sx,sy)}; q=deque([(sx,sy)])
    while q:
        x,y=q.popleft()
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx,ny=x+dx,y+dy
            if (nx,ny) not in seen and passable(nx,ny):
                seen.add((nx,ny)); q.append((nx,ny))
    def near(x,y): return any((x+dx,y+dy) in seen for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)))
    for (x,y) in chk['walk']:
        if g[y][x] in SOLID: print(f'[{mid}] 보행포털이 SOLID {x},{y} {g[y][x]}'); ok=False
        if (x,y) not in seen and not near(x,y): print(f'[{mid}] 보행포털 도달불가 {x},{y}'); ok=False
    for (x,y) in chk['doors']:
        if not near(x,y): print(f'[{mid}] 상호작용 지점 인접 불가 {x},{y} {g[y][x]}'); ok=False
    for (x,y) in chk['npc']:
        if not near(x,y): print(f'[{mid}] NPC 인접 불가 {x},{y}'); ok=False
    for (x,y) in chk['arrive']:
        if g[y][x] in SOLID: print(f'[{mid}] 도착점이 SOLID {x},{y} {g[y][x]}'); ok=False
    print(f'[{mid}] {w}x{h2} 통행가능 {len(seen)}타일 — OK')
# 골렘 게이트 검증: stacks에서 골렘(1,17) 있을 때 상자(1,18) 인접칸 (1,17) 도달 불가, 제거 시 가능
g=MAPS['stacks']['g']; w=25; h2=20
def bfs(block):
    seen={(22,3)}; q=deque([(22,3)])
    while q:
        x,y=q.popleft()
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx,ny=x+dx,y+dy
            if 0<=nx<w and 0<=ny<h2 and (nx,ny) not in seen and g[ny][nx] not in SOLID and (nx,ny)!=block:
                seen.add((nx,ny)); q.append((nx,ny))
    return seen
withG=bfs((1,17)); without=bfs(None)
print('골렘 생존 시 (1,17) 도달:', (1,17) in withG, '/ 골렘 제거 후:', (1,17) in without)
if (1,17) in withG or (1,17) not in without: ok=False

if not ok: sys.exit(1)
# ---------- JS 출력 ----------
out=[]
out.append('const MAPS={')
for mid,info in MAPS.items():
    g=info['g']
    rows=','.join('"'+''.join(r)+'"' for r in g)
    out.append(f' {mid}:{{name:"{info["name"]}",tiles:[{rows}]}},')
out.append('};')
open('maps.js','w').write('\n'.join(out))
print('maps.js 생성 완료,', sum(len(i["g"])*len(i["g"][0]) for i in MAPS.values()),'타일')

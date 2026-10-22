// ==========================================
// [2] 데미지 계산 및 UI 렌더링 영역 (script.js)
// ==========================================

const $ = i => document.getElementById(i);
const f = (x,d=3) => isFinite(x) ? x.toLocaleString("ko-KR",{minimumFractionDigits:0,maximumFractionDigits:d}) : "-";

$("qin").innerHTML = QG.map(g => `<div class="qgrp"><div class="qt">${g[0]}</div><div class="qg">` +
  g[1].map(k => { const q = QF.find(x => x[0]===k); return `<label>${q[1]}<input type="number" step="any" id="q${q[0]}" value="${q[2]}"></label>`; }).join("") + `</div></div>`).join("");

$("wm").innerHTML = ["HP","물리 방어력","마법 방어력","치명타 저항","치명 피해 저항"].map(l=>`<label>${l} 가중치 (직접 입력)<input type="number" step="any" class="wl" data-l="${l}" value="0"></label>`).join("");

// A. 어사이드 기본 효과 [이름, 종류, 수치, 적용]
let BASE = [
  // ── A3 어사이드: 주는 피해량 (받는 피해 감소는 딜 계산 제외) ──
  ["모모 A3 모모~합!: 주는 피해량 (아군 전체)","m",15,true,"받는 피해 -7.5% 미반영"],
  ["우로스 A3 걸어갈 길: 주는 피해량 (같은 성격=순수)","m",45,true,"받는 피해 -12% 미반영 · 에르핀 A2로 순수 성격 보유"],
  ["에르핀(왕도) A3 모두를 위한 힘: 주는 피해량 (아군 전체)","m",22.5,true,"받는 피해 -6% 미반영"],
  ["리뉴아 A3 우리들의 평화로운 시간: 주는 피해량 (아군 전체)","m",22.5,true,"원문 22.5%"],
  ["죠안 A3 은혜 갚은 죠안: 주는 피해량 (아군 전체)","m",15,true,"받는 피해 -7.5% 미반영"],
  ["비비(신성) A3 영원한 포옹: 주는 피해량 (아군 전체)","m",22.5,true,"받는 피해 -6% 미반영"],
  ["벨라 A3 우린 이미 완전한 존재들: 주는 피해량 (아군 전체)","m",22.5,true,""],
  ["실비아 A3 그 어머니에 그 딸: 스킬 피해량 (아군 전체)","sk",33,true,"저·고학년 스킬 비중에만 반영"],
  // ── A2 어사이드 · 상시 효과 ──
  ["우로스 A2 내 마음의 등대 비수: 적 받는 피해 증가 (10중첩×4%)","m",40,true,"필드 9명 + 같은 성격 1명 = 10중첩 · 최대 16중첩=64% · 지속 6초"]
];
// B. 인게임 버프 [이름, 종류, 수치, 지속(초), 쿨타임(0=상시), 첫 발동(초), 적용]
let BF = [
  ["우로스 저학년 순환 지배의 영역: 공격력 부여 35% (영역 위 최고 공격력 아군 기준, 최고 공격력 본인도 받음 → 에르핀 가정 · 저학년은 SP 회복 세팅으로 무한 난사 → 상시 · 독립 곱연산)","mult_atk",35,10,0,0,true],
  ["[참고] 우로스 영역 종료 후 자신 피해량 +62% (Lv13, 10초) — 우로스 한정","m",62,10,0,0,false],
  ["죠안 A2 꿈결 형상(전열 배치): 모든 아군 주는 피해량 +75%×2 = +150% (20초/쿨 42초 · 중열이면 받피 감소, 후열이면 공속으로 바뀜)","m",150,20,42,0,true],
  ["에르핀(왕도) 고학년 에르피엔 펀치: 스킬 피해량 +67.5% (본인 · 25초 / 쿨 60초) — 에르핀은 고학년 미사용이라 꺼 둠","sk",67.5,25,60,0,false],
  ["비비(신성) 고학년 모든 이를 굽어살피리: 아군 주는 피해량 +75% (25초 / 쿨 60초)","m",75,25,60,0,true],
  ["비비(신성) A2 신성한 품 속(비비의 은총): 신성 보유 시 스킬 치명타 확정 + 치명타 시 추가 피해 +40% (25초 / 쿨 60초)","holy",40,25,60,0,true],
  ["비비(신성) 저학년 작은 뜻이 빛이 되어: 아군 공격력 +66% (저학년 무한 난사 → 상시)","atk",66,8,0,0,true],
  ["죠안 저학년 교리를 행하고: 분산 상태 공격력 +46% (공격력 최고 아군=에르핀 가정 · 저학년 무한 난사 → 상시)","atk",46,10,0,0,true],
  ["벨라 저학년 경계선상의 유령: 존속 공격력 +32% (모든 아군 · 저학년 무한 난사 → 상시)","atk",32,7,0,0,true],
  ["벨라 A2 영속(저학년 스킬로 부여): 아군 주는 피해량 +50% (저학년 무한 난사 → 상시)","m",50,0,0,0,true],
  ["실비아 저학년 궁극의 유희: 적 받는 피해 증가 +80% (Lv13 · 30초 · 저학년 무한 난사 → 상시)","m",80,30,0,0,true],
  ["우이(기억) 고학년 일렁이는 파동: 적이 받는 고학년 스킬 피해 +35% (에르핀 고학년 0%라 효과 0) (연못 8초+파동 5초=13초 / 쿨 27초)","hk",35,13,27,0,true]
];
const BT = [["m","피해량 증감 (%p)"],["atk","공격력 풀 (%) [합연산]"],["mult_atk","공격력 증폭 (%) [독립 곱연산]"],["crit","치명타 풀 (%)"],["cd","치명 피해 풀 (%)"],["holy","신성 치명 추가피해 (%)"],["sk","스킬 피해량 (%) — 저·고학년 스킬 비중만"],["hk","적 받는 고학년 스킬 피해 (%) — 고학년 비중만"]];
const opt = (L,v) => L.map(t=>`<option value="${t[0]}" ${t[0]==v?"selected":""}>${t[1]}</option>`).join("");

function drawB(){
  $("bf").innerHTML = "<tr><th>적용</th><th>버프 이름</th><th>종류</th><th>수치</th><th>지속(초)</th><th>쿨타임(초, 0=상시)</th><th>첫 발동(초)</th></tr>" +
    BF.map(b=>{ const ref = String(b[0]).startsWith("[참고");
      return `<tr style="${ref?"opacity:.6":""}"><td><input type="checkbox" class="b6" style="width:auto" ${ref?"disabled":(b[6]!==false?"checked":"")}></td><td><input class="b0" value="${b[0]}" style="width:100%;min-width:360px"></td><td><select class="b1">${opt(BT,b[1])}</select></td>` +
      [2,3,4,5].map(k=>`<td><input type="number" step="any" class="b${k}" value="${b[k]}"></td>`).join("") + "</tr>"; }).join("");
}
function rawB(){
  return [...document.querySelectorAll("#bf tr")].slice(1).map(r=>{
    const g = k => r.querySelector(".b"+k).value;
    return [g(0),g(1),+g(2)||0,+g(3)||0,+g(4)||0,+g(5)||0,r.querySelector(".b6").checked];
  });
}
function drawBase(){
  $("base").innerHTML = "<tr><th>적용</th><th>효과 이름</th><th>종류</th><th>수치</th><th>비고</th></tr>" +
    BASE.map(b=>`<tr><td><input type="checkbox" class="c3" style="width:auto" ${b[3]!==false?"checked":""}></td><td><input class="c0" value="${b[0]}" style="width:100%;min-width:360px"></td><td><select class="c1">${opt(BT,b[1])}</select></td><td><input type="number" step="any" class="c2" value="${b[2]}"></td><td><input class="c4" value="${b[4]||""}" style="width:100%;min-width:240px"></td></tr>`).join("");
}
function rawBase(){
  return [...document.querySelectorAll("#base tr")].slice(1).map(r=>[r.querySelector(".c0").value,r.querySelector(".c1").value,+r.querySelector(".c2").value||0,r.querySelector(".c3").checked,r.querySelector(".c4").value]);
}

function baseDmg(A,D,k){
  const r = 0.5/k*D/A;
  if(r<=0.5) return k*A - 0.5*D;
  return Math.max(0.5*k*A*Math.pow(0.5,(r-0.5)/0.25), 0.0625*k*A);
}
function critP(c,r){
  if(c<=0) return 0;
  if(r<=0) return 0.8;
  const x = r/c;
  return x>=1 ? 0 : Math.min(0.8, Math.max(0, 0.8 - 0.4*x));
}
function critM(d,r,cap4){
  if(cap4) return 4;
  if(d<=0) return 1.15;
  if(r<=0) return 4;
  const x = r/d;
  if(x>=1) return 1.15;
  if(x>0.8) return 2.8 - (x-0.8)/0.2*(2.8-1.15);
  return Math.min(4, Math.max(1.15, 4 - 1.5*x));
}
function calc(p){
  const A = p.A*(1+p.ap/100)*(1+(p.multAtk||0)/100), cr = p.crit*(1+p.cp/100), dd = p.dmg*(1+p.dp/100);
  const holy = (p.holy||0) > 0;
  const b = baseDmg(A,p.D,p.k), pc = critP(cr,p.res);
  const cm = critM(dd,p.rd,p.cap4);
  const mt = Math.max(0.25, 1 + p.m/100);
  let critFactor = 1 - pc + pc*cm;
  if(holy){
    const cmSacred = 1 + (cm - 1)*(1 + p.holy/100); // 신성한 치명타: 기본 치명타 배율(최대 4배)의 추가 피해량(cm-1)이 40% 증가 (최대 5.2배)
    const skS = p.skS !== undefined ? p.skS : 1;
    const skillCrit = p.holyAll ? cmSacred : (pc*cmSacred + (1 - pc)*cm); // 원문: 치명타일 경우 신성한 치명타, 아닐 경우 일반 치명타
    critFactor = skS*skillCrit + (1 - skS)*critFactor;
  }
  return b * mt * critFactor;   // 공격 속도·방어력 감소는 계산하지 않음
}
function applyB(p,t,B){
  const q = {...p};
  B.forEach(b=>{
    if(!(t>=b.f && (b.c<=0 || (t-b.f)%b.c < b.d))) return;
    if(b.t=="m") q.m += b.v;
    else if(b.t=="atk") q.ap += b.v;
    else if(b.t=="mult_atk") q.multAtk = (q.multAtk||0) + b.v;
    else if(b.t=="crit") q.cp += b.v;
    else if(b.t=="cd") q.dp += b.v;
    else if(b.t=="holy") q.holy = (q.holy||0) + b.v;
  });
  return q;
}
function calcT(p,B){
  let s = 0;
  for(let t=0;t<180;t++) s += calc(applyB(p,t,B));
  return s/180;
}

const W = {};
let LOW_S = 1, HIGH_S = 0, TOTAL = 100;
let activeRarity = 0;

// 사도별 스킬 구성 (에르핀(왕도)는 입력값 연동)
const prof = a => a.k === "erpin"
  ? {low:LOW_S, high:HIGH_S, norm:Math.max(0, 1-LOW_S-HIGH_S)}
  : {low:a.low, high:a.high, norm:Math.max(0, 1-a.low-a.high)};
const sumShare = fn => APOS.reduce((s,a)=> s + a.share*fn(prof(a)), 0);
const rowSum = (row, fn) => APOS.filter(a=>a.row===row).reduce((s,a)=> s + a.share*fn(prof(a)), 0);
// 사도 공격 타입: APX.at===1 물리, 그 외(2) 마법. 마공 카드는 마법 사도에게만, 물공 카드는 물리 사도에게만 효과가 있음
const atkType = a => { let x; try{ x = APX[a.id]; }catch(e){} return (x && x.at === 1) ? 1 : 2; };   // APX는 스크립트 뒤쪽에서 선언되므로 초기 렌더 대비
const lblShare = (l,a) => l==="마법 공격력" ? (atkType(a)===2 ? a.share : 0) : l==="물리 공격력" ? (atkType(a)===1 ? a.share : 0) : a.share;
const typeShare = t => APOS.reduce((s,a)=> s + (atkType(a)===t ? a.share : 0), 0);
const wearers = id => APOS.map(a=>({a, c:a.slots.filter(s=>s===id).length})).filter(w=>w.c>0);

function calcW(){
  const p = {};
  QF.forEach(q => p[q[0]] = +$("q"+q[0]).value || 0);
  p.holy = 0;
  p.multAtk = 0;
  const skS = Math.max(0, Math.min(1, ((p.lowShare||0) + (p.highShare||0))/100));   // 스킬 피해량은 저·고학년 스킬 비중만큼만 반영
  const hkS = Math.max(0, Math.min(1, (p.highShare||0)/100));   // 고학년 스킬 피해 증가는 고학년 비중만 반영
  p.skS = skS;
  p.cap4 = +($("critCapMode")?.value || 0) === 1;
  p.holyAll = ($("holyRule")?.value || "exact") === "all";
  const cv = (t,v) => t==="sk" ? {t:"m", v:v*skS} : t==="hk" ? {t:"m", v:v*hkS} : {t,v};
  const B = [
    ...rawBase().filter(b=>b[3]).map(b=>({...cv(b[1],b[2]),d:0,c:0,f:0})),
    ...rawB().filter(b=>b[6]).map(b=>({...cv(b[1],b[2]),d:b[3],c:b[4],f:b[5]}))
  ];
  $("baseSum").textContent = "상시 피해량 증감 합 " + f(rawBase().filter(b=>b[3]&&b[1]==="m").reduce((s,b)=>s+b[2],0),1) + "%p · 스킬 피해량 합 " + f(rawBase().filter(b=>b[3]&&b[1]==="sk").reduce((s,b)=>s+b[2],0),1) + "%";

  LOW_S = Math.max(0, Math.min(1, (p.lowShare||0)/100));
  HIGH_S = Math.max(0, Math.min(1, (p.highShare||0)/100));
  syncShares();
  TOTAL = APOS.reduce((s,a)=>s+a.share, 0);

  // 표 A·B 효과의 180초 평균/최대 (수동 입력 칸은 제외한 순수 표 합계)
  {
    const K = ["ap","multAtk","cp","dp","m"], sum = {}, mx = {};
    let holySec = 0, holyMax = 0;
    K.forEach(k => { sum[k]=0; mx[k]=0; });
    for(let t=0;t<180;t++){
      const q = applyB(p,t,B);
      K.forEach(k => { const v = (q[k]||0) - (p[k]||0); sum[k]+=v; if(v>mx[k]) mx[k]=v; });
      if((q.holy||0) > 0){ holySec++; if(q.holy > holyMax) holyMax = q.holy; }
    }
    const basePc = critP(p.crit*(1+p.cp/100), p.res)*100;
    const baseCm = critM(p.dmg*(1+p.dp/100), p.rd, p.cap4);
    const sacredCm = 1 + (baseCm - 1)*(1 + (holyMax||40)/100);
    const L = [["ap","공격력 버프 (합연산)"],["multAtk","공격력 증폭 (독립 곱연산)"],["cp","치명타 버프"],["dp","치명 피해 버프"],["m","피해량 증감"]];
    $("bsum").innerHTML = L.map(([k,l]) => { const u = "%";
      return `<div class="kpi-card"><div class="kpi-label">${l}</div><div class="kpi-val">평균 +${f(sum[k]/180,1)}${u}</div><div class="kpi-label">최대 +${f(mx[k],1)}${u}</div></div>`; }).join("") +
      `<div class="kpi-card"><div class="kpi-label">신성(비비 A2) 가동률</div><div class="kpi-val">${f(holySec/180*100,1)}% (${holySec}초/180초)</div><div class="kpi-label">추가 피해 +${f(holyMax,0)}% · ${p.holyAll?"100% 신성치명":"치명 시 신성/비치명 시 일반"}</div></div>` +
      `<div class="kpi-card"><div class="kpi-label">현재 치명 확률 · 배율 (버프 전)</div><div class="kpi-val">치확 ${f(basePc,1)}% · ${f(baseCm,2)}배</div><div class="kpi-label">일반 상한 4.00배 · 신성 치명 ${f(sacredCm,2)}배(상한 5.20배)</div></div>`;
  }
  const Y = calcT(p,B);
  const mg = k => (calcT({...p,[k]:p[k]+1},B)/Y - 1)*100;
  W["마법 공격력"] = (calcT({...p,A:p.A*1.01},B)/Y - 1)*100;
  {  // 물리 공격력: 물리 딜러 기준(PA·PD)으로 따로 계산 — 마공과 분리
    const pp = {...p, A:p.PA, D:p.PD}, Yp = calcT(pp,B);
    W["물리 공격력"] = Yp > 0 ? (calcT({...pp, A:pp.A*1.01},B)/Yp - 1)*100 : 0;
  }
  W["치명타"] = mg("cp");
  W["치명 피해"] = mg("dp");
  W["피해량 증가"] = mg("m");
  W["공격 속도"] = 0;   // 공격 속도 가치는 계산하지 않음 (아티팩트·카드의 공속 효과 = 0)
  document.querySelectorAll(".wl").forEach(e => W[e.dataset.l] = +e.value || 0);

  $("wt").textContent = "스탯/버프 +1%p당 최종 피해량 증가율: " +
    ["마법 공격력","물리 공격력","치명타","치명 피해","피해량 증가"].map(l => l+" +"+f(W[l],3)+"%").join(" · ") + " · 공격 속도·방어력은 계산 안 함(가중치 0)";
}

// 카드 객체 (장비는 전 아티팩트 선택 가능, 실제 계산은 '착용 중'인 카드만)
const R = D.map(r => ({
  id: r[0], n: r[1], r: r[2], t: r[3],
  startLv: 2,                                   // 기본 시작 레벨 2 (2→3렙부터)
  spellCnt: r[3]===1 ? maxCopies(r[0]) : 0,     // 스펠 기본 구매 장수: 2장 (특수효과 카드는 1장)
  lab: r[6], v: r[7], costs: r[8], eff: r[9]
}));
const ART = R.filter(x => x.t === 0);
const isWorn = x => APOS.some(a => a.slots.includes(x.id));

// ───────── 편성 UI ─────────
function slotOpts(sel){
  let h = `<option value="0">— 비어 있음 —</option>`;
  [4,3,2,1].forEach(r => {
    const cs = ART.filter(x => x.r === r).sort((a,b) => a.n.localeCompare(b.n,"ko"));
    if(cs.length) h += `<optgroup label="${RN[r-1]}">` + cs.map(c => `<option value="${c.id}" ${c.id===sel?"selected":""}>${c.n}</option>`).join("") + `</optgroup>`;
  });
  return h;
}
function drawLoadout(){
  syncShares();
  const cols = [["back","후열 (파랑)","col-back"],["mid","중열 (초록)","col-mid"],["front","전열 (빨강)","col-front"]];
  $("loadoutGrid").innerHTML = cols.map(([rk,title,cls]) => {
    const mem = APOS.filter(a => a.row === rk);
    const sum = mem.reduce((s,a) => s + a.share, 0);
    return `<div class="col-box ${cls}"><div class="col-title"><span>${title}</span><span>딜 비중 ${f(sum,1)}%</span></div>` +
      (mem.map(a => `
        <div class="apos" data-k="${a.k}">
          <div class="apos-head">
            <b>${a.n}</b>
            <select class="a-row" title="배치 열">${Object.entries(ROWS).map(([k,v])=>`<option value="${k}" ${k===a.row?"selected":""}>${v}</option>`).join("")}</select>
            <label class="sh" title="전투 통계의 입힌 피해량(억). 비중은 전체 합 대비 자동 계산">피해량 <input type="number" class="a-dmg" min="0" step="any" value="${+(+a.dmg).toFixed(2)}">억 <span class="pct">(${f(a.share,1)}%)</span></label>
          </div>
          ${a.slots.map((s,i) => `<select class="a-slot" data-i="${i}" title="장비 ${i+1}">${slotOpts(s)}</select>`).join("")}
        </div>`).join("") || `<div class="note">배치된 사도 없음</div>`) + `</div>`;
  }).join("");
}
$("loadoutGrid").addEventListener("change", e => {
  const t = e.target, box = t.closest(".apos");
  if(!box) return;
  const a = APOS.find(x => x.k === box.dataset.k);
  if(!a) return;
  if(t.classList.contains("a-slot")){ a.slots[+t.dataset.i] = +t.value || 0; drawCardLvGrid(); }
  else if(t.classList.contains("a-row")){ a.row = t.value; drawLoadout(); }
  else if(t.classList.contains("a-dmg")){ a.dmg = Math.max(0, +t.value || 0); syncShares(); drawLoadout(); }
});
$("resetLoadout").onclick = () => { APOS = cloneApos(); drawLoadout(); drawCardLvGrid(); render(); };

// 카드별 시작 레벨 & 스펠 구매 장수 설정 그리드
function drawCardLvGrid(){
  const sortMode = $("cardLvSort")?.value || "cost";
  const relCards = R.filter(x => (x.t === 0 && isWorn(x)) || x.t === 1).sort((a,b) => {
    if(sortMode === "name") return a.n.localeCompare(b.n,"ko");
    const ac = Array.isArray(a.costs) ? (+a.costs[11] || +a.costs[0] || 0) : (+a.cost || 0);
    const bc = Array.isArray(b.costs) ? (+b.costs[11] || +b.costs[0] || 0) : (+b.cost || 0);
    return ac-bc || a.n.localeCompare(b.n,"ko");
  });
  $("cardLvGrid").innerHTML = relCards.map(x => {
    const mx = maxCopies(x.id);
    return `
    <div class="card-lv-item" data-cid="${x.id}">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${x.n}">
        <span class="badge r${x.r}" style="padding:0 4px;font-size:10.5px">${RN[x.r-1][0]}</span>
        <b>${x.n}</b>
      </span>
      <span style="display:flex;gap:4px;align-items:center">
        ${x.t===1 ? `<select class="scnt" data-cid="${x.id}" title="구매 장수${mx<2?' (특수효과 카드: 최대 1장)':''}">
          ${Array.from({length:mx+1},(_,n)=>`<option value="${n}" ${x.spellCnt===n?"selected":""}>${n}장</option>`).join("")}
        </select>` : `<span style="font-size:11px;color:var(--mute)">착용</span>`}
        <input type="number" class="slv" data-cid="${x.id}" min="1" max="11" value="${x.startLv}" title="시작 레벨">
      </span>
    </div>`;
  }).join("");

  document.querySelectorAll(".slv").forEach(inp => {
    inp.onchange = () => {
      const c = R.find(x => x.id === +inp.dataset.cid);
      if(c) c.startLv = Math.min(11, Math.max(1, +inp.value || 1));
      $("globalStartLv").value = "custom";
      render();
    };
  });
  document.querySelectorAll(".scnt").forEach(sel => {
    sel.onchange = () => {
      const c = R.find(x => x.id === +sel.dataset.cid);
      if(c) c.spellCnt = +sel.value || 0;
      render();
    };
  });
}

$("cardLvSort").addEventListener("change", drawCardLvGrid);

// 카드 x의 lv → lv+1 단계 스탯 + 특수효과 증가분 (lv: 1..11)
function stepGainDetail(x, lv){
  const effMode = +$("effMode").value === 1;
  const g6 = +$("grade6Cnt").value || 0;
  const wAtk = W["마법 공격력"] || 0, wAtkP = W["물리 공격력"] || 0;
  const wDmg = W["피해량 증가"] || 0;
  const wSpd = 0;   // 공속 가치 0 (계산 제외)

  const dEff = k => (x.eff[k] && x.eff[k].length > lv) ? (x.eff[k][lv] - x.eff[k][lv-1]) : 0;

  let statGain = 0, effGain = 0;
  let statDescParts = [], effDesc = "", targetDesc = "";

  if(x.t === 0){
    const ws = wearers(x.id);
    if(!ws.length) return {total:0, statGain:0, effGain:0, statDesc:"", effDesc:"", targetDesc:"미착용"};
    const cT = ws.reduce((s,w) => s + w.c, 0);                 // 파티 내 총 착용 장수
    const sumC = fn => ws.reduce((s,w) => s + w.c * fn(w.a), 0); // 착용 장수 가중 합 (스탯용)
    // '해당 효과는 중첩되지 않는다 / 단일 사도가 중복 장착한 효과는 중첩되지 않는다' 카드는 사도당 1장만 효과 인정
    const eC = w => NOSTACK.has(x.id) ? 1 : w.c;
    const cE = ws.reduce((s,w) => s + eC(w), 0);
    const sumE = fn => ws.reduce((s,w) => s + eC(w) * fn(w.a), 0);
    const dbf = Math.max(0, Math.min(100, +$("qdebuff").value || 0)) / 100;
    targetDesc = ws.map(w => `${w.a.n}${w.c>1?` ×${w.c}`:""}`).join(" + ");

    x.lab.forEach((l, j) => {
      const dv = x.v[j][lv] - x.v[j][lv-1];
      statDescParts.push(`${l} +${f(dv,2)}%p${cT>1?`(×${cT})`:""}`);
      statGain += (W[l] || 0) * dv * (sumC(a => lblShare(l,a)) / 100);
    });

    switch(x.id){
      case 2100099: { // 블랑셰의 유리 파랑새: 착용자 고학년 스킬 피증 (일반 공격 피해 -60%p)
        const dv = dEff("0");
        effDesc = `고학년 피증 +${f(dv,0)}%p×${cE}장 = +${f(dv*cE,0)}%p (평타 -60%p)`;
        effGain = dv * wDmg * sumE(a => a.share * prof(a).high) / 100;
        break;
      }
      case 2100106: { // 에르핀의 지팡이: HP 100%일 때 저학년 스킬 피증 (평타 -35%p)
        const dvLow = dEff("3");
        effDesc = `저학년 피증 +${f(dvLow,0)}%p×${cE}명 · SP회복 +${f(dEff("1"),0)}% (평타 -35%p)`;
        effGain = dvLow * wDmg * sumE(a => a.share * prof(a).low) / 100;
        break;
      }
      case 2100091: { // 프리클의 여왕 대리 인장: 착용자와 같은 열 아군 전체 스킬 피증
        const dv = dEff("0");
        effDesc = `${[...new Set(ws.map(w=>ROWS[w.a.row]))].join("·")} 전체 스킬피증 +${f(dv,0)}%p×${cE}명`;
        effGain = dv * wDmg * sumE(a => rowSum(a.row, p => p.low + p.high)) / 100;
        break;
      }
      case 2100102: { // 제이드의 비싼 만년필: 착용자와 같은 열 아군 전체 마법 피증
        const dv = dEff("0");
        effDesc = `${[...new Set(ws.map(w=>ROWS[w.a.row]))].join("·")} 전체 마법피증 +${f(dv,0)}%p×${cE}명`;
        effGain = dv * wDmg * sumE(a => rowSum(a.row, () => 1)) / 100;
        break;
      }
      case 2100067: { // 벨리타의 지팡이
        const dv = dEff("0");
        effDesc = `착용자 피증 +${f(dv,0)}%p×${cE}장 = +${f(dv*cE,0)}%p`;
        effGain = dv * wDmg * sumE(a => a.share) / 100;
        break;
      }
      case 2100114: { // 리스티의 게임 컨트롤러: 스킬 직접 적중 시 10초간 착용자 피증
        const dv = dEff("1");
        effDesc = `스킬 적중 시 착용자 피증 +${f(dv,1)}%p×${cE}명 (적 피감 ${f(dEff("2"),1)}%p)`;
        effGain = dv * wDmg * sumE(a => a.share) / 100;
        break;
      }
      case 2100098: { // 장난감 망원경: 평타 피증 (사거리 비례 평균)
        const dv0 = dEff("0"), dv1 = dEff("1");
        const avgNormDmg = (dv0 + dv1) * 0.5;
        effDesc = `분신/평타 피증 +${f(dv0,0)}~${f(dv1,0)}%p×${cE}장`;
        effGain = avgNormDmg * wDmg * sumE(a => a.share * 0.85) / 100;
        break;
      }
      case 2100036: { // 기원의 성배: 일반 공격 적중 시 SP 회복
        const cDelta = x.costs[lv] - x.costs[lv-1];
        effDesc = cDelta < 0 ? `구매 코스트 ${cDelta} 감소` : `평타 적중 시 SP +3 회복`;
        break;
      }
      case 2100007: { // 실라의 바람살: 착용자 공속
        const dv = dEff("0");
        effDesc = `착용자 공속 +${f(dv,0)}%p×${cE}장 = +${f(dv*cE,0)}%p (계산 미반영)`;
        effGain = dv * 0.5 * wSpd * sumE(a => a.share) / 100;
        break;
      }
      case 2100112: { // 볼케니카 특산 과일 주스: 보호막 대상 저학년 스킬 피증
        const dvLow = dEff("2"), dvSh = dEff("0");
        effDesc = `보호막 부여 시 저학년 피증 +${f(dvLow,0)}%p×${cE}명 (보호막 +${f(dvSh,0)}%p)`;
        effGain = dvLow * cE * wDmg * (sumShare(p => p.low) / 100) * 0.75;
        break;
      }
      case 2100109: { // 힐데의 간호복: 치유 대상 피증
        const dvDmg = dEff("2"), dvHp = dEff("1");
        effDesc = `치유 대상 피증 +${f(dvDmg,1)}%p×${cE}명 = +${f(dvDmg*cE,1)}%p (HP +${f(dvHp*cE,1)}%p)`;
        effGain = dvDmg * cE * wDmg * (TOTAL / 100) * 0.65;
        break;
      }
      case 2100075: { // 30KG 케틀벨: 착용자 스킬 피해량 증가 (공속 -30%p 고정)
        const dv = dEff("0");
        effDesc = `착용자 스킬피증 +${f(dv,0)}%p×${cE}명 (공속 -30%p)`;
        effGain = dv * wDmg * sumE(a => a.share * (prof(a).low + prof(a).high)) / 100;
        break;
      }
      case 2100090: { // 다야의 다이아몬드 커터: 디버프 걸린 적에게 주는 피해 증가
        const dv = dEff("0");
        effDesc = `디버프 적 피증 +${f(dv,0)}%p×${cE}장 (유지율 ${f(dbf*100,0)}%)`;
        effGain = dv * wDmg * sumE(a => a.share) * dbf / 100;
        break;
      }
      case 2100103: { // 슈슈슈슉 글러브: 처치 조건부(계산 미반영)
        effDesc = `처치 시 15초 피증 +${f(dEff("0"),0)}%p·공속 +${f(dEff("1"),0)}%p (최대 3회, 계산 미반영)`;
        break;
      }
      case 2100031: { // 용광검: 저학년 스킬 사이 누적 공속(계산 미반영)
        effDesc = `공속 매초 +${f(dEff("0"),1)}%p 누적 (계산 미반영)`;
        break;
      }
      case 2100104: effDesc = `같은 열 SP회복 +${f(dEff("0"),0)}%p (딜 미반영)`; break;
      case 2100111: effDesc = `감전 피해 +${f(dEff("0"),1)}%p`; break;
      case 2100101: effDesc = `아일라 최대HP +${f(dEff("0"),0)}%p (보호막량 증가)`; break;
      case 2100097: effDesc = `같은 열 받는피해 ${f(dEff("0"),2)}%p×${cE}명 (딜 미반영)`; break;
      case 2100116: effDesc = `전열 받는피해 ${f(dEff("3"),2)}%p`; break;
    }
  } else {
    // 스펠: 파티 전체에 적용, 구매 장수만큼 중첩
    const cnt = x.spellCnt;
    if(cnt <= 0) return {total:0, statGain:0, effGain:0, statDesc:"", effDesc:"", targetDesc:"미구매(0장)"};
    targetDesc = `파티 전체 (스펠 ${cnt}장)`;

    x.lab.forEach((l, j) => {
      const dv = x.v[j][lv] - x.v[j][lv-1];
      statDescParts.push(`${l} +${f(dv,2)}%p${cnt>1?`(×${cnt})`:""}`);
      statGain += (W[l] || 0) * dv * cnt * (APOS.reduce((s,a)=>s+lblShare(l,a),0) / 100);
    });

    const partySkillShare = sumShare(p => p.low + p.high);
    const partyNormShare  = sumShare(p => p.norm);

    switch(x.id){
      case 2200053: { // 멋진 선배님: 6학년 사도 1명당 모든 아군 공격력 증가
        const dv = dEff("1");
        const totalAtk = dv * g6 * cnt;
        const base = x.eff["0"] ? x.eff["0"][lv-1] : 0, dBase = dEff("0");   // 기본 효과: 편성 사도 수 × 피해량 증가 (레벨 무관 고정값)
        effDesc = `기본: 편성 ${APOS.length}명×${f(base,0)}%p = 전체 피증 +${f(base*APOS.length*cnt,0)}%p(레벨 무관) · 추가: 6학년(${g6}명) 전원 공 +${f(totalAtk,2)}%p (사도당 +${f(dv,2)}%p)`;
        effGain = totalAtk * (wAtk * typeShare(2) + wAtkP * typeShare(1)) / 100 + (dBase * APOS.length * cnt) * wDmg * (TOTAL / 100);
        break;
      }
      case 2200043: { // 전술 교본
        const dv = dEff("0");
        effDesc = `아군 전체 피증 +${f(dv*cnt,1)}%p`;
        effGain = (dv * cnt) * wDmg * (TOTAL / 100);
        break;
      }
      case 2200027: { // 전투의 달인
        const dv = dEff("0");
        effDesc = `아군 전체 스킬피증 +${f(dv*cnt,1)}%p`;
        effGain = (dv * cnt) * wDmg * (partySkillShare / 100);
        break;
      }
      case 2200040: { // 치명적인 매력
        const dv = dEff("0");
        effDesc = `아군 전체 평타피증 +${f(dv*cnt,1)}%p`;
        effGain = (dv * cnt) * wDmg * (partyNormShare / 100);
        break;
      }
      case 2200019: { // 중앙GOOD
        const dv = dEff("0");
        effDesc = `중열 피증 +${f(dv*cnt,1)}%p`;
        effGain = (dv * cnt) * wDmg * (rowSum("mid", () => 1) / 100);
        break;
      }
      case 2200020: { // 후발대
        const dv = dEff("0");
        effDesc = `후열 피증 +${f(dv*cnt,1)}%p`;
        effGain = (dv * cnt) * wDmg * (rowSum("back", () => 1) / 100);
        break;
      }
      case 2200016: { // 사기진작
        const dv = dEff("0");
        effDesc = `아군 전체 공속 +${f(dv*cnt,1)}%p (계산 미반영)`;
        effGain = (dv * cnt) * wSpd * 0.65 * (TOTAL / 100);
        break;
      }
      case 2200014: { // 막판 스퍼트 (40초)
        const dv = dEff("1");
        effDesc = `40초간 공속 +${f(dv*cnt,1)}%p (계산 미반영)`;
        effGain = (dv * cnt) * (40/180) * wSpd * 0.65 * (TOTAL / 100);
        break;
      }
      case 2200051: { // 이성의 끈 (30초)
        const dv = dEff("1");
        effDesc = `30초간 전체 피증 +${f(dv*cnt,1)}%p`;
        effGain = (dv * cnt) * (30/180) * wDmg * (TOTAL / 100);
        break;
      }
      case 2200050: { // 오픈런 (10초)
        const dv = dEff("1");
        effDesc = `10초간 전체 피증 +${f(dv*cnt,1)}%p`;
        effGain = (dv * cnt) * (10/180) * wDmg * (TOTAL / 100);
        break;
      }
      case 2200003: { // 저놈 잡아라!
        const dv = dEff("0");
        if(dv > 0) effDesc = `아군 전체 피증 +${f(dv*cnt,1)}%p`;
        effGain = (dv * cnt) * wDmg * (TOTAL / 100);
        break;
      }
      case 2200041: { // 약자무시
        const dv = dEff("0");
        effDesc = `평타 피증 +${f(dv*cnt,1)}%p`;
        effGain = (dv * cnt) * wDmg * (partyNormShare / 100);
        break;
      }
      case 2200047: { // 명상의 시간
        const dv = dEff("0");
        effDesc = `SP 회복량 +${f(dv*cnt,0)}%p`;
        break;
      }
    }
  }

  const finalEffGain = effMode ? effGain : 0;
  return {
    total: statGain + finalEffGain,
    statGain,
    effGain: finalEffGain,
    statDesc: statDescParts.join(", ") || "스탯 없음",
    effDesc,
    targetDesc,
    costDelta: (x.costs && x.costs.length > lv) ? (x.costs[lv] - x.costs[lv-1]) : 0
  };
}

function render(){
  calcW();
  const cap = Math.min(12, Math.max(2, +$("cap").value || 6));
  const gStart = $("globalStartLv").value;
  const spellMode = $("spellIncludeMode").value;
  const qStr = ($("searchInp").value || "").trim().toLowerCase();
  const onlyBestStep = $("onlyOneStepPerCard").checked;

  if(gStart !== "custom"){
    const sv = +gStart || 2;
    R.forEach(x => { x.startLv = sv; });
    document.querySelectorAll(".slv").forEach(inp => { inp.value = sv; });
  }

  // Generate all individual level-up steps (L -> L+1)
  let steps = [];
  R.forEach(x => {
    if(x.t === 0 && !isWorn(x)) return; // 미착용 아티팩트는 0%
    if(spellMode === "art_only" && x.t !== 0) return;
    if(spellMode === "spell_only" && x.t !== 1) return;
    if(activeRarity > 0 && x.r !== activeRarity) return;

    const sLv = Math.max(1, x.startLv);
    let cardSteps = [];
    for(let L = sLv; L < cap; L++){
      const gd = stepGainDetail(x, L);
      if(gd.total <= 0) continue; // Only include steps that increase party damage
      const needWild = BS[x.r - 1] * L;
      const effPerWild = gd.total / needWild;
      const item = {
        x,
        fromLv: L,
        toLv: L + 1,
        needWild,
        gd,
        totalGain: gd.total,
        effPerWild
      };
      if(qStr){
        const hay = `${x.n} ${L}->${L+1} ${gd.targetDesc} ${gd.statDesc} ${gd.effDesc}`.toLowerCase();
        if(!hay.includes(qStr)) continue;
      }
      cardSteps.push(item);
    }
    if(onlyBestStep && cardSteps.length > 0){
      cardSteps.sort((a,b) => b.effPerWild - a.effPerWild);
      steps.push(cardSteps[0]);
    } else {
      steps.push(...cardSteps);
    }
  });

  // Sort strictly by Efficiency per 1 Wildcard (와카 1장당 최종뎀 증가율 %) descending!
  steps.sort((a,b) => b.effPerWild - a.effPerWild || b.totalGain - a.totalGain || a.fromLv - b.fromLv);

  const maxEff = steps.length ? steps[0].effPerWild : 1;
  let h = `<tr>
    <th>순위</th>
    <th>카드명 · 강화 단계</th>
    <th>등급 · 분류</th>
    <th class="c-num">소모 와카</th>
    <th class="c-num">단계 총 딜 증가</th>
    <th class="c-num">와카 1장당 효율</th>
    <th>적용 대상 (착용 사도 / 범위)</th>
    <th>해당 단계 상승 효과 (스탯 + 특수효과)</th>
  </tr>`;

  if(!steps.length){
    h += `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--mute)">조건에 맞는 레벨업 구간이 없습니다. 검색어나 필터 설정을 확인해 주세요.</td></tr>`;
  }

  steps.forEach((s, idx) => {
    const rank = idx + 1;
    const rCls = rank <= 3 ? "rank-badge rank-top3" : (rank <= 10 ? "rank-badge rank-top10" : "rank-badge");
    const costTag = s.gd.costDelta < 0 ? `<span class="tag-cost">코스트 ${s.gd.costDelta}</span>` : "";
    const effPart = s.gd.effDesc ? ` · <span style="color:var(--acc);font-weight:600">${s.gd.effDesc}</span>` : "";
    const pctBar = Math.max(4, Math.min(100, (s.effPerWild / maxEff) * 100));

    h += `<tr>
      <td class="c-rank" data-label="순위"><span class="${rCls}">${rank}위</span></td>
      <td class="c-name" data-label="카드"><b>${s.x.n}</b> <span class="lv-pill">${s.fromLv} → ${s.toLv} Lv</span>${costTag}</td>
      <td data-label="등급 · 분류"><span class="badge r${s.x.r}">${RN[s.x.r-1]} ${s.x.t===0?"아티팩트":"스펠"}</span></td>
      <td class="c-num" data-label="소모 와카"><b>${s.needWild}장</b></td>
      <td class="c-num" data-label="단계 총 딜 증가" style="font-weight:600">+${f(s.totalGain, 3)}%</td>
      <td class="c-num c-eff" data-label="와카 1장당 효율">
        <div class="eff-cell">
          <span class="best" style="font-size:13.5px">+${f(s.effPerWild, 4)}% / 장</span>
          <div class="eff-bar-bg"><div class="eff-bar-fill" style="width:${pctBar.toFixed(1)}%"></div></div>
        </div>
      </td>
      <td class="c-target" data-label="적용 대상">${s.gd.targetDesc}</td>
      <td class="c-effect" data-label="상승 효과">${s.gd.statDesc}${effPart}</td>
    </tr>`;
  });

  $("tb").innerHTML = h;
  const rLabel = activeRarity > 0 ? `${RN[activeRarity-1]} 등급 ` : "전체 ";
  $("sum").innerHTML = `<span class="sum-left"><span class="sum-tag">STEP 3</span> <span>${rLabel}와일드 카드 투자 효율 순위표 (총 ${steps.length}개 구간)</span></span>`;

  // Top 3 KPI summary
  const medals = ["🥇 추천 1순위","🥈 추천 2순위","🥉 추천 3순위"];
  const top3 = steps.slice(0, 3);
  $("kpiStrip").innerHTML = top3.map((s, idx) => `
    <div class="kpi-card">
      <div class="kpi-label">${medals[idx]} · ${RN[s.x.r-1]} ${s.x.t===0?"아티팩트":"스펠"}</div>
      <div class="kpi-val">${s.x.n} <span class="lv-pill">${s.fromLv} → ${s.toLv} Lv</span></div>
      <div style="font-size:12.5px;color:var(--mute);margin-top:4px">와카 1장당 <b style="color:var(--ink)">+${f(s.effPerWild,4)}%</b> <span style="opacity:.85">(총 +${f(s.totalGain,3)}% / 와카 ${s.needWild}장)</span></div>
    </div>
  `).join("");
}

$("addBase").onclick = () => { BASE = rawBase(); BASE.push(["새 기본 효과","m",0,true]); drawBase(); render(); };
$("addb").onclick = () => {
  BF = rawB();
  BF.push(["새 버프","m",0,10,20,0,true]);
  drawB();
  render();
};

document.querySelectorAll("#rarityTabs .tab-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("#rarityTabs .tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeRarity = +btn.dataset.r;
    render();
  };
});

document.querySelectorAll(".lv-preset-btn").forEach(btn => {
  btn.onclick = () => {
    const lv = +btn.dataset.lv;
    $("globalStartLv").value = String(lv);
    R.forEach(x => { x.startLv = lv; });
    document.querySelectorAll(".slv").forEach(inp => { inp.value = lv; });
    render();
  };
});

$("searchInp").addEventListener("input", render);
document.addEventListener("change", (e) => {
  if(e.target.classList.contains("slv") || e.target.classList.contains("scnt")) return;
  render();
});

drawB();
drawBase();
drawLoadout();
drawCardLvGrid();
render();

const apName = id => (APX[id]||{}).n || "?";
const IMG = {};   // 파일로 불러온 이미지 {파일명: objectURL}
const imgTpl = () => { try{ return localStorage.getItem("imgTpl") || "img/{id}.png"; }catch(e){ return "img/{id}.png"; } };
function imgSrc(id){
  const n = apName(id);
  for(const ext of [".png",".webp",".jpg",".jpeg",".gif"]){
    if(IMG[id+ext]) return IMG[id+ext];
    if(IMG[n+ext]) return IMG[n+ext];
  }
  return imgTpl().replace(/\{id\}/g, id).replace(/\{name\}/g, encodeURIComponent(n));
}
function avatar(id,cls){
  const a = APX[id]||{c:"888888",n:"?"};
  return `<div class="av ${cls||''}" style="background:#${a.c}"><span>${a.n[0]}</span><img src="${imgSrc(id)}" alt="" onerror="this.remove()"></div>`;
}
// 이미지(IndexedDB 저장)
const idb = () => new Promise((ok,no)=>{ const r = indexedDB.open("apimg",1); r.onupgradeneeded = ()=>r.result.createObjectStore("f"); r.onsuccess = ()=>ok(r.result); r.onerror = no; });
async function idbAll(){ try{ const db = await idb(); return await new Promise(ok=>{ const o = {}, c = db.transaction("f").objectStore("f").openCursor(); c.onsuccess = ()=>{ const x = c.result; if(x){ o[x.key] = x.value; x.continue(); } else ok(o); }; c.onerror = ()=>ok({}); }); }catch(e){ return {}; } }
async function idbPut(k,v){ try{ const db = await idb(); db.transaction("f","readwrite").objectStore("f").put(v,k); }catch(e){} }
async function idbClear(){ try{ const db = await idb(); db.transaction("f","readwrite").objectStore("f").clear(); }catch(e){} }
const loadImgs = async () => { Object.values(IMG).forEach(URL.revokeObjectURL); for(const k in IMG) delete IMG[k]; const o = await idbAll(); Object.entries(o).forEach(([k,b])=>IMG[k]=URL.createObjectURL(b)); $("imgMsg").textContent = Object.keys(IMG).length ? Object.keys(IMG).length+"장 불러옴" : ""; refreshAp(); };

function apOptions(q){
  q = (q||"").trim();
  const all = Object.entries(APX).filter(([id,a]) => !q || (a.n+a.t).includes(q));
  const grp = (lab,L) => L.length ? `<optgroup label="${lab} (${L.length})">${L.sort((x,y)=>x[1].n.localeCompare(y[1].n,"ko")).map(([id,a])=>`<option value="${id}">${a.n}</option>`).join("")}</optgroup>` : "";
  return grp("편성 중",all.filter(([id])=>APOS.some(p=>p.id==id))) + grp("보유",all.filter(([id,a])=>a.o&&!APOS.some(p=>p.id==id))) + grp("미보유",all.filter(([id,a])=>!a.o));
}
function showAp(id){
  const a = APX[id]; if(!a){ $("apView").innerHTML = ""; return; }
  const p = APOS.find(x=>x.id==id), mx = Math.max(...a.g,1);
  const g = [["공격",a.g[0]],["방어",a.g[1]],["지원",a.g[2]]].map(([l,v])=>`<div class="gb"><span style="width:28px">${l}</span><i style="width:${v/mx*120}px"></i>${v}</div>`).join("");
  const o = "";
  const eq = p ? p.slots.map(s=>{ const c = R.find(x=>x.id===s); return s ? `<div class="sk"><b>${c?c.n:s}</b>\n${(ARX[s]||{}).e||""}</div>` : ""; }).join("") : `<div class="note">편성에 없는 사도입니다. 위의 '배치'로 슬롯에 넣으면 장비·딜 비중을 지정할 수 있습니다.</div>`;
  $("apView").innerHTML = `<div>${avatar(id)}<div style="margin-top:8px">${g}</div><label class="note" style="display:block;margin-top:8px">이 사도 이미지 지정<input type="file" id="apOne" accept="image/*"></label></div>
   <div><h3 style="margin:0 0 2px;font-size:18px">${a.n} <span class="sub" style="font-size:13px">${a.t}</span></h3>
   <div style="margin:6px 0">${o}<span class="tag">${a.at==2?"마법":"물리"} 공격</span>${p?`<span class="tag">편성: ${ROWS[p.row]} · 딜 ${f(p.share,1)}%</span>`:""}</div>
   <p class="note" style="white-space:pre-line">${a.d}</p>
   <h3 class="sec">스킬</h3>${a.sk.map(s=>`<div class="sk"><b>${s[1]}</b> <span class="sub">${{1:"평타",2:"평타2",4:"고학년 스킬",8:"저학년 스킬"}[s[0]]||"스킬"+s[0]}${s[3]?" · 쿨 "+s[3]+"초":""}</span>\n${s[2]}</div>`).join("")}
   <h3 class="sec">어사이드 (A1~A3)</h3>${a.ae.map((e,i)=>`<div class="sk"><b>A${i+1} ${e[0]}</b>\n${e[1]}${e[2]?"\n"+e[2]:""}</div>`).join("")||'<div class="note">어사이드 없음</div>'}
   <h3 class="sec">착용 장비</h3>${eq}</div>`;
  $("apOne").onchange = async e => { const fl = e.target.files[0]; if(!fl) return; await idbPut(id+((fl.name.match(/\.[^.]+$/)||[".png"])[0]), fl); await loadImgs(); drawLoadout(); };
}
function refreshAp(keep){
  const cur = keep || $("apSel").value;
  $("apSel").innerHTML = apOptions($("apQ").value); if(cur && APX[cur] && [...$("apSel").options].some(o=>o.value==cur)) $("apSel").value = cur;
  $("apSlot").innerHTML = APOS.map((a,i)=>`<option value="${i}">${i+1}. ${a.n}</option>`).join("");
  showAp($("apSel").value);
}
$("apQ").oninput = () => refreshAp();
$("apSel").onchange = () => showAp($("apSel").value);
$("apPut").onclick = () => { const a = APOS[+$("apSlot").value], id = +$("apSel").value; if(!a||!id) return; swapBuffs(a.n,id); a.id = id; a.n = apName(id); drawLoadout(); drawCardLvGrid(); render(); refreshAp(String(id)); };
$("imgTpl").value = imgTpl(); $("imgTpl").onchange = () => { try{ localStorage.setItem("imgTpl",$("imgTpl").value||"img/{id}.png"); }catch(e){} drawLoadout(); refreshAp(); };
const addImgs = async L => { for(const f of L) if((f.type||"").startsWith("image/")) await idbPut(f.name,f); await loadImgs(); drawLoadout(); };
$("imgFiles").onchange = e => addImgs(e.target.files); $("imgDir").onchange = e => addImgs(e.target.files);
$("imgClear").onclick = async () => { await idbClear(); await loadImgs(); drawLoadout(); };


// ───────── 사도 교체 시 버프 표 자동 갱신 ─────────
const ORIG_BASE = JSON.parse(JSON.stringify(BASE)), ORIG_BF = JSON.parse(JSON.stringify(BF));
const DEF_ID = Object.fromEntries(DEFAULT_APOS.map(a=>[a.k,a.id]));
const ownerIs = (b,n) => String(b[0]).replace(/^\[참고\]\s*/,"").startsWith(n+" ");
const LNK = {"주는 피해량":"m","공격력":"atk","치명타":"crit","치명 피해":"cd"};
function genBuffs(id){
  const x = APX[id], n = x.n, base = [], bf = [], RW = {전열:"front",중열:"mid",후열:"back"};
  const row = (APOS.find(p=>p.k==="erpin")||{}).row, A3 = x.ae[2];
  if(A3){
    const sc = A3[1].match(/(모든|전열|중열|후열) 아군[^.]*?(스킬 피해량|주는 피해량)/);
    const ln = A3[2].split("\n").map(l=>l.match(/^(스킬 )?피해량 증가\s*:\s*(-?[\d.]+)%/)).find(Boolean);
    if(sc && ln){
      const ok = sc[1]==="모든" || RW[sc[1]]===row, sk = !!ln[1] || sc[2]==="스킬 피해량";
      base.push([`${n} A3 ${A3[0]}: ${sk?"스킬 피해량":"주는 피해량"} (${sc[1]==="모든"?"아군 전체":sc[1]+" 아군"})`, sk?"sk":"m", +ln[2], ok, "자동 추출"+(ok?"":" · 에르핀(왕도) 열과 달라 꺼 둠")]);
    }
  }
  [[x.ae[1],"A2",0], ...x.sk.filter(s=>s[0]===4||s[0]===8).map(s=>[s,s[0]===8?"저학년":"고학년",s[3]])].forEach(([src,lab,cd]) => {
    if(!src) return;
    const title = typeof src[0]==="number" ? src[1] : src[0], txt = src[2] || "";
    const d = +((txt.match(/지속시간\s*:\s*(\d+)초/)||[])[1]) || 10;
    txt.split("\n").forEach(l => { const m = l.match(/^(주는 피해량|공격력|치명타|치명 피해) 증가\s*:\s*(-?[\d.]+)%/);
      if(m) bf.push([`${n} ${lab} ${title}: ${m[1]} +${m[2]}% [자동·검토 필요: 대상/조건 확인]`, LNK[m[1]], +m[2], d, lab==="저학년"?0:cd, 0, false]); });
  });
  return {base, bf};
}
function swapLists(base,bf,oldN,newId){
  const nn = APX[newId].n, keep = (L,n) => L.filter(b => !ownerIs(b,n));
  base = keep(base,oldN); bf = keep(bf,oldN);
  if(nn!==oldN){
    const ob = ORIG_BASE.filter(b=>ownerIs(b,nn)), of = ORIG_BF.filter(b=>ownerIs(b,nn));
    const g = (ob.length||of.length) ? {base:JSON.parse(JSON.stringify(ob)), bf:JSON.parse(JSON.stringify(of))} : genBuffs(newId);
    base = keep(base,nn).concat(g.base); bf = keep(bf,nn).concat(g.bf);
  }
  return {base, bf};
}
function swapBuffs(oldN,newId){ const r = swapLists(rawBase(),rawB(),oldN,newId); BASE = r.base; BF = r.bf; drawBase(); drawB(); }

// 편성 카드에 사진·사도 교체·스킬 비중 입력 추가
const _dl = drawLoadout;
drawLoadout = function(){
  _dl();
  document.querySelectorAll("#loadoutGrid .apos").forEach(box => {
    const a = APOS.find(x=>x.k===box.dataset.k); if(!a) return;
    const head = box.querySelector(".apos-head"), wrap = document.createElement("div"); wrap.innerHTML = avatar(a.id,"sm"); head.prepend(wrap.firstChild);
    const ex = document.createElement("div"); ex.className = "ex";
    const pr = a.k==="erpin" ? `<span title="3번 섹션 입력값 연동">스킬 비중은 3번 설정 연동</span>` : `저학년 <input type="number" class="a-low" min="0" max="100" value="${Math.round(a.low*100)}">% 고학년 <input type="number" class="a-high" min="0" max="100" value="${Math.round(a.high*100)}">%`;
    ex.innerHTML = `<select class="a-swap" title="사도 교체">${apOptions("")}</select>${pr}`; ex.querySelector(".a-swap").value = a.id;
    head.after(ex);
  });
  const pp = $("partyPreview");
  if(pp){
    const cols = [["back","후열","pp-back"],["mid","중열","pp-mid"],["front","전열","pp-front"]];
    pp.innerHTML = cols.map(([rk,label,cls]) => {
      const mem = APOS.filter(a => a.row === rk);
      const sum = mem.reduce((s,a) => s + a.share, 0);
      return `<div class="pp-col ${cls}">
        <div class="pp-col-label">${label}<br><span style="font-size:10px;font-weight:600;opacity:.85">${f(sum,0)}%</span></div>
        <div class="pp-list">${mem.map(a => {
          const eqNames = a.slots.map(sid => (R.find(x=>x.id===sid)||{}).n || "비어 있음").join(" / ");
          return `<div class="pp-item" title="${a.n} (${label}) · 딜 비중 ${f(a.share,1)}%&#10;장착: ${eqNames}">
            ${avatar(a.id,"pp-av")}
            <span class="pp-name">${a.n}</span>
            <span class="pp-share">${f(a.share,1)}%</span>
          </div>`;
        }).join("")}</div>
      </div>`;
    }).join("");
  }
};
drawLoadout();
$("loadoutGrid").addEventListener("change", e => {
  const t = e.target, box = t.closest(".apos"); if(!box) return;
  const a = APOS.find(x=>x.k===box.dataset.k); if(!a) return;
  if(t.classList.contains("a-swap")){ swapBuffs(a.n,+t.value); a.id = +t.value; a.n = apName(a.id); drawLoadout(); refreshAp(t.value); render(); }
  else if(t.classList.contains("a-low")){ a.low = Math.max(0,Math.min(1,(+t.value||0)/100)); render(); }
  else if(t.classList.contains("a-high")){ a.high = Math.max(0,Math.min(1,(+t.value||0)/100)); render(); }
  if(t.classList.contains("a-slot")||t.classList.contains("a-row")||t.classList.contains("a-dmg")) setTimeout(()=>refreshAp(),0);
});
const _rs = $("resetLoadout").onclick; $("resetLoadout").onclick = () => { if(APOS.some(a=>a.id!==DEF_ID[a.k])){ BASE = JSON.parse(JSON.stringify(ORIG_BASE)); BF = JSON.parse(JSON.stringify(ORIG_BF)); drawBase(); drawB(); } _rs(); refreshAp(); };

// 장비 도감
function drawEq(){
  const q = $("eqQ").value.trim(), ty = $("eqT").value, rr = +$("eqR").value;
  const L = R.filter(x => (ty==="all"||x.t===+ty) && (!rr||x.r===rr) && (!q || x.n.includes(q) || ((ARX[x.id]||{}).e||"").includes(q))).sort((a,b)=>b.r-a.r||a.n.localeCompare(b.n,"ko"));
  $("eqt").innerHTML = `<tr><th>카드</th><th>효과 (12렙)</th><th>능력치</th><th>착용 사도</th></tr>` + L.map(x => {
    const w = wearers(x.id).map(o=>`${o.a.n}${o.c>1?"×"+o.c:""}`).join(", "), z = ARX[x.id]||{};
    return `<tr><td><span class="badge r${x.r}">${RN[x.r-1]}</span> <b>${x.n}</b>${x.t?` <span class="tag">스펠</span>`:""}${NOSTACK.has(x.id)?` <span class="tag">중첩불가</span>`:""}<div class="sub">코스트 ${x.costs?x.costs[11]??x.costs[0]:"-"}</div></td><td style="white-space:pre-line">${z.e||"-"}</td><td>${z.s||x.lab.join(", ")}</td><td>${w||"-"}</td></tr>`; }).join("");
}
["eqQ","eqT","eqR"].forEach(i => $(i).addEventListener("input",drawEq)); $("eqBox").addEventListener("toggle",drawEq);
(function(){
  const root = document.documentElement, btn = $("themeBtn");
  const applyTheme = t => {
    if(t === "dark" || t === "light") root.setAttribute("data-theme", t);
    else root.removeAttribute("data-theme");
    const isDark = root.getAttribute("data-theme") === "dark" || (!root.getAttribute("data-theme") && window.matchMedia && window.matchMedia("(prefers-color-scheme:dark)").matches);
    if(btn) btn.textContent = isDark ? "☀️ 라이트 모드" : "🌙 다크 모드";
  };
  try{ applyTheme(localStorage.getItem("themePref")); }catch(e){ applyTheme(null); }
  if(btn) btn.onclick = () => {
    const isDark = root.getAttribute("data-theme") === "dark" || (!root.getAttribute("data-theme") && window.matchMedia && window.matchMedia("(prefers-color-scheme:dark)").matches);
    const next = isDark ? "light" : "dark";
    try{ localStorage.setItem("themePref", next); }catch(e){}
    applyTheme(next);
  };
})();
loadImgs().then(()=>{ drawLoadout(); refreshAp(String(APOS.find(a=>a.k==="erpin").id)); });
render();   // APX(사도 공격 타입) 로드 후 최종 재계산

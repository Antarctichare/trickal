// ==========================================
// [3] 외부 데이터(Network -> data) 연동 모듈 (sync.js)
// ==========================================
(function() {
  // 어떤 형태의 JSON을 붙여넣든 카드 ID(2100xxx/2200xxx)와 사도 ID(10xxx)만 추출
  function parseRawDataText(rawText) {
    const data = typeof rawText === "string" ? JSON.parse(rawText) : rawText;
    const cards = {}, apostles = {};
    const visited = new Set();

    function walk(node) {
      if (!node || typeof node !== "object" || visited.has(node)) return;
      visited.add(node);
      if (Array.isArray(node)) {
        const id = Number(node[0]);
        if (node.length >= 6 && id >= 2100000 && id < 2300000 && typeof node[1] === "string") {
          const lv = Number(node[5]);
          if (!isNaN(lv) && lv > 0) cards[id] = lv;
          return;
        }
        node.forEach(walk);
        return;
      }
      for (const [k, v] of Object.entries(node)) {
        const numK = Number(k);
        if (numK >= 10001 && numK <= 19999 && v && typeof v === "object") {
          if (Array.isArray(v.o) && v.o.length >= 4) apostles[numK] = v.o.slice(0, 4).map(Number);
          else if (Array.isArray(v) && v.length >= 4 && typeof v[0] === "number") apostles[numK] = v.slice(0, 4).map(Number);
          else if (typeof v.lv === "number" || typeof v.level === "number") {
            apostles[numK] = [v.lv || v.level || 1, v.skill || 1, v.fav || 1, v.aside ?? 0];
          }
        }
        if (numK >= 2100000 && numK < 2300000) {
          if (typeof v === "number" && v > 0) cards[numK] = v;
          else if (v && typeof v === "object") {
            const lv = Number(v.lv ?? v.level ?? v.l ?? v[5] ?? v[0]);
            if (!isNaN(lv) && lv > 0) cards[numK] = lv;
          }
        }
        walk(v);
      }
    }
    walk(data);
    return { cards, apostles, timestamp: Date.now() };
  }

  // 추출된 순수 스펙 데이터를 계산기 변수(R, APX, BASE, BF)에 반영
  function applySpecToCalculator(payload, saveLocal = true) {
    if (!payload) return;
    const { cards = {}, apostles = {}, timestamp } = payload;
    let appliedCards = 0, appliedApos = 0;

    // 1) 카드 시작 레벨(startLv) 동기화
    if (Object.keys(cards).length > 0) {
      R.forEach(c => {
        if (cards[c.id] !== undefined && cards[c.id] > 0) {
          c.startLv = Math.min(11, Math.max(1, Number(cards[c.id])));
          appliedCards++;
        }
      });
      if ($("globalStartLv")) $("globalStartLv").value = "custom";
    }

    // 2) 사도 보유 상태(o 배열: [레벨, 스킬, 호감도, 어사이드]) 동기화 및 어사이드 미달성 버프 자동 OFF
    if (Object.keys(apostles).length > 0) {
      Object.entries(apostles).forEach(([id, oArr]) => {
        if (APX[id] && Array.isArray(oArr)) {
          APX[id].o = oArr;
          appliedApos++;
        }
      });

      // 편성된 사도 중 A3/A2 미달성 사도의 버프 체크박스 자동 조정
      APOS.forEach(a => {
        const spec = apostles[a.id] || (APX[a.id] && APX[a.id].o);
        if (!Array.isArray(spec)) return;
        const asideLv = Number(spec[3] ?? 3);
        const namePrefix = a.n + " ";

        BASE.forEach(b => {
          if (String(b[0]).startsWith(namePrefix)) {
            if (b[0].includes("A3")) b[3] = asideLv >= 3;
            else if (b[0].includes("A2")) b[3] = asideLv >= 2;
          }
        });
        BF.forEach(b => {
          if (String(b[0]).startsWith(namePrefix)) {
            if (b[0].includes("A2")) b[6] = asideLv >= 2;
          }
        });
      });
    }

    if (saveLocal) {
      try { localStorage.setItem("userSpecSync", JSON.stringify(payload)); } catch (e) {}
    }

    drawBase();
    drawB();
    drawLoadout();
    drawCardLvGrid();
    if (typeof refreshAp === "function") refreshAp();
    render();

    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString("ko-KR") : "방금 전";
    const statusEl = $("syncStatusBadge");
    if (statusEl) {
      statusEl.innerHTML = `🟢 <b>내 스펙 적용 중</b> (카드 ${appliedCards}종 · 사도 ${appliedApos}명 반영됨 \vert{} ${timeStr})`;
      statusEl.style.color = "#16a34a";
    }
  }

  // 상단 연동 UI 바 삽입
  function injectSyncUI() {
    const bar = document.createElement("div");
    bar.style.cssText = "background:var(--card, #f8fafc);border:1px solid var(--line, #e2e8f0);border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;font-size:13px;";
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span id="syncStatusBadge" style="color:var(--mute, #64748b);">⚪ <b>기본 데이터 모드</b> (서버 저장 없이 브라우저에서만 작동합니다)</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button type="button" id="btnExtSync" style="cursor:pointer;padding:5px 10px;border-radius:6px;border:1px solid #3b82f6;background:#eff6ff;color:#1d4ed8;font-weight:600;">⚡ 확장프로그램에서 불러오기</button>
        <button type="button" id="btnPasteSync" style="cursor:pointer;padding:5px 10px;border-radius:6px;border:1px solid #cbd5e1;background:transparent;color:inherit;">📋 data 응답 직접 붙여넣기</button>
        <button type="button" id="btnResetSync" style="cursor:pointer;padding:5px 10px;border-radius:6px;border:1px solid #fca5a5;background:#fef2f2;color:#dc2626;">🗑️ 내 데이터 초기화</button>
      </div>
      <div id="pasteModalBox" style="display:none;width:100%;margin-top:8px;padding-top:8px;border-top:1px dashed #cbd5e1;">
        <div style="font-size:12px;margin-bottom:4px;opacity:0.85;">💡 F12 개발자 도구 → <b>Network</b> 탭 → <b>data</b> 요청의 <b>Response(응답)</b> 텍스트를 통째로 복사해 아래에 붙여넣으세요. (개인정보는 즉시 폐기되고 카드 레벨과 사도 수치만 추출됩니다.)</div>
        <textarea id="rawDataInput" rows="4" placeholder='여기에 Network -> data 응답 JSON을 붙여넣으세요...' style="width:100%;box-sizing:border-box;font-family:monospace;font-size:12px;padding:6px;border-radius:6px;border:1px solid #cbd5e1;"></textarea>
        <div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end;">
          <button type="button" id="btnApplyRaw" style="cursor:pointer;padding:4px 12px;border-radius:6px;background:#2563eb;color:#fff;border:none;font-weight:600;">적용하기</button>
          <button type="button" id="btnCloseRaw" style="cursor:pointer;padding:4px 10px;border-radius:6px;border:1px solid #cbd5e1;background:transparent;color:inherit;">닫기</button>
        </div>
      </div>
    `;

    const target = $("loadoutGrid") ? $("loadoutGrid").parentElement : document.body;
    target.prepend(bar);

    $("btnExtSync").onclick = () => {
      window.postMessage({ type: "REQUEST_TRICKCAL_SYNC" }, "*");
    };
    $("btnPasteSync").onclick = () => {
      const box = $("pasteModalBox");
      box.style.display = box.style.display === "none" ? "block" : "none";
    };
    $("btnCloseRaw").onclick = () => { $("pasteModalBox").style.display = "none"; };
    $("btnApplyRaw").onclick = () => {
      try {
        const parsed = parseRawDataText($("rawDataInput").value);
        const cLen = Object.keys(parsed.cards).length, aLen = Object.keys(parsed.apostles).length;
        if (!cLen && !aLen) {
          alert("데이터에서 카드 ID(2100xxx/2200xxx)나 사도 ID(10xxx)를 찾지 못했습니다.");
          return;
        }
        applySpecToCalculator(parsed, true);
        $("rawDataInput").value = "";
        $("pasteModalBox").style.display = "none";
        alert(`✅ 연동 완료! (카드 ${cLen}종, 사도 ${aLen}명 반영됨)`);
      } catch (err) {
        alert("올바른 JSON 형식이 아닙니다. Network -> data의 Response 전체를 복사했는지 확인해 주세요.");
      }
    };
    $("btnResetSync").onclick = () => {
      localStorage.removeItem("userSpecSync");
      location.reload();
    };
  }

  // 확장 프로그램 메시지 수신
  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data) return;
    if (e.data.type === "APPLY_TRICKCAL_SYNC") {
      applySpecToCalculator(e.data.payload, true);
      if (!e.data.auto) alert("✅ 확장 프로그램에서 트릭컬노트 데이터를 성공적으로 불러왔습니다!");
    } else if (e.data.type === "EMPTY_TRICKCAL_SYNC") {
      alert("아직 확장 프로그램에 캡처된 데이터가 없습니다.\n트릭컬노트 사이트에 접속하여 새로고침(F5)을 한 번 한 뒤 다시 눌러주세요!");
    }
  });

  // 초기 실행 및 localStorage 복원
  injectSyncUI();
  try {
    const saved = localStorage.getItem("userSpecSync");
    if (saved) applySpecToCalculator(JSON.parse(saved), false);
  } catch (e) {}
})();

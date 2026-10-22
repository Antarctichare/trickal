// ==========================================
// [3] 외부 데이터(Network -> data) 연동 모듈 (sync.js)
// ==========================================
(function() {
  // 사도/카드 한 건을 계산기 내부 형식 o = [레벨, 스킬, 등급, 어사이드]로 변환
  function toO(v) {
    if (Array.isArray(v)) {
      const a = v.slice(0, 4);
      return a.length >= 4 && a.every(x => typeof x === "number" && isFinite(x)) ? a : null;
    }
    if (v && typeof v === "object") {
      const lv = Number(v.level ?? v.lv);
      if (!isFinite(lv) || v.level == null && v.lv == null) return null;
      return [
        lv,
        Number(v.activeSkillLevel ?? v.skill ?? 1),
        Number(v.grade ?? v.fav ?? 1),
        Number(v.asideGrade ?? v.aside ?? 0)
      ];
    }
    return null;
  }

  // 트릭컬노트 data 응답에서 user.data.card.cards[] / user.data.apostle.apostles[] 만 추출
  function parseRawDataText(rawText) {
    const data = typeof rawText === "string" ? JSON.parse(rawText) : rawText;
    const cards = {}, cardsDetail = {}, apostles = {};
    const found = {};

    (function find(node, depth) {
      if (!node || typeof node !== "object" || Array.isArray(node) || depth > 5) return;
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (k === "cards" && Array.isArray(v)) found.cards = v;
        else if (k === "apostles" && Array.isArray(v)) found.apostles = v;
        else if (k === "user" || k === "data" || k === "card" || k === "apostle") find(v, depth + 1);
      }
    })(data, 0);

    (found.cards || []).forEach(c => {
      const id = Number(c && c.cardId), lv = Number(c && c.level);
      if (!Number.isInteger(id) || !(lv > 0)) return;
      cards[id] = lv;
      cardsDetail[id] = { level: lv, count: Number(c.count ?? 0), limitBreak: Number(c.limitBreak ?? 0), type: Number(c.type ?? 0) };
    });
    (found.apostles || []).forEach(a => {
      const id = Number(a && a.apostleId);
      if (!Number.isInteger(id)) return;
      apostles[id] = {
        level: a.level, rank: a.rank, grade: a.grade, asideGrade: a.asideGrade, skinId: a.skinId,
        activeSkillLevel: a.activeSkillLevel, ultimateSkillLevel: a.ultimateSkillLevel,
        asideLevelLimitBreak: a.asideLevelLimitBreak
      };
    });
    return { cards, cardsDetail, apostles, timestamp: Date.now() };
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

    // 2) 사도 보유 상태를 o 배열([레벨, 스킬, 등급, 어사이드])로 변환해 동기화
    //    + 어사이드 미달성 사도의 A2/A3 버프 자동 OFF
    const aposO = {};
    Object.entries(apostles).forEach(([id, v]) => {
      const o = toO(v);
      if (o) aposO[id] = o;
    });

    if (Object.keys(aposO).length > 0) {
      Object.entries(aposO).forEach(([id, o]) => {
        if (APX[id]) {
          APX[id].o = o;
          if (!Array.isArray(apostles[id])) APX[id].user = apostles[id]; // 원본(rank, 스킬 등) 보관
          appliedApos++;
        }
      });

      APOS.forEach(a => {
        const spec = aposO[a.id] || (APX[a.id] && APX[a.id].o);
        if (!Array.isArray(spec)) return;
        const asideRaw = Number(spec[3]);
        const asideLv = isFinite(asideRaw) ? asideRaw : 3;
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
      statusEl.innerHTML = `🟢 <b>내 스펙 적용 중</b> (카드 ${appliedCards}종 · 사도 ${appliedApos}명 반영됨 · ${timeStr})`;
      statusEl.style.color = "#16a34a";
    }
  }

  // 상단 연동 UI 바 삽입
  function injectSyncUI() {
    if (document.getElementById("syncStatusBadge")) return; // 중복 삽입 방지
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

    // 접혀 있는 <details> 안이 아니라 페이지 최상단(main)에 넣어 항상 보이게 한다
    const target = document.querySelector("main") || document.body;
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
          alert("데이터에서 user.data.card.cards / user.data.apostle.apostles 를 찾지 못했습니다.");
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
      window.postMessage({ type: "CLEAR_TRICKCAL_SYNC" }, location.origin); // 확장 프로그램 저장분도 삭제
      setTimeout(() => location.reload(), 200);
    };
  }

  // 확장 프로그램 메시지 수신
  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== location.origin || !e.data) return;
    if (e.data.type === "APPLY_TRICKCAL_SYNC") {
      applySpecToCalculator(e.data.payload, true);
      if (!e.data.auto) alert("✅ 확장 프로그램에서 트릭컬노트 데이터를 성공적으로 불러왔습니다!");
    } else if (e.data.type === "EMPTY_TRICKCAL_SYNC") {
      alert("아직 확장 프로그램에 캡처된 데이터가 없습니다.\n트릭컬노트 사이트에 접속하여 새로고침(F5)을 한 번 한 뒤 다시 눌러주세요!");
    }
  });

  // 초기 실행 및 localStorage 복원 (각 단계를 분리: 하나가 실패해도 불러오기 바는 표시)
  function init() {
    try {
      injectSyncUI();
    } catch (err) {
      console.error("[트릭컬 연동기] 불러오기 바 삽입 실패:", err);
    }
    try {
      const saved = localStorage.getItem("userSpecSync");
      if (saved) {
        const parsed = JSON.parse(saved);
        // 구버전(잘못된 사도 데이터) 저장본은 폐기
        if (parsed && parsed.cardsDetail) applySpecToCalculator(parsed, false);
        else localStorage.removeItem("userSpecSync");
      }
    } catch (err) {
      console.error("[트릭컬 연동기] 저장된 데이터 복원 실패:", err);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

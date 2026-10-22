(function() {
  function applySpecToCalculator(payload, saveLocal = true) {
    if (!payload) return;
    const { cards = {}, apostles = {}, timestamp } = payload;
    let appliedCards = 0, appliedApos = 0;

    if (Object.keys(cards).length > 0) {
      if (typeof R !== "undefined") {
        R.forEach(c => {
          if (cards[c.id] !== undefined && cards[c.id] > 0) {
            c.startLv = Math.min(11, Math.max(1, Number(cards[c.id])));
            appliedCards++;
          }
        });
      }
      const gLv = document.getElementById("globalStartLv");
      if (gLv) gLv.value = "custom";
    }

    if (Object.keys(apostles).length > 0) {
      Object.entries(apostles).forEach(([id, oArr]) => {
        if (typeof APX !== "undefined" && APX[id] && Array.isArray(oArr)) {
          APX[id].o = oArr;
          appliedApos++;
        }
      });

      if (typeof APOS !== "undefined") {
        APOS.forEach(a => {
          const spec = apostles[a.id] || (typeof APX !== "undefined" && APX[a.id] && APX[a.id].o);
          if (!Array.isArray(spec)) return;
          const asideLv = Number(spec[3] ?? 3);
          const namePrefix = a.n + " ";

          if (typeof BASE !== "undefined") {
            BASE.forEach(b => {
              if (String(b[0]).startsWith(namePrefix)) {
                if (b[0].includes("A3")) b[3] = asideLv >= 3;
                else if (b[0].includes("A2")) b[3] = asideLv >= 2;
              }
            });
          }
          if (typeof BF !== "undefined") {
            BF.forEach(b => {
              if (String(b[0]).startsWith(namePrefix)) {
                if (b[0].includes("A2")) b[6] = asideLv >= 2;
              }
            });
          }
        });
      }
    }

    if (saveLocal) {
      try { localStorage.setItem("userSpecSync", JSON.stringify(payload)); } catch (e) {}
    }

    if (typeof drawBase === "function") drawBase();
    if (typeof drawB === "function") drawB();
    if (typeof drawLoadout === "function") drawLoadout();
    if (typeof drawCardLvGrid === "function") drawCardLvGrid();
    if (typeof refreshAp === "function") refreshAp();
    if (typeof render === "function") render();

    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString("ko-KR") : "방금 전";
    const statusEl = document.getElementById("syncStatusBadge");
    if (statusEl) {
      statusEl.innerHTML = `🟢 <b>내 스펙 적용 중</b> (카드 ${appliedCards}종 · 사도 ${appliedApos}명 반영됨 | ${timeStr})`;
      statusEl.style.color = "#16a34a";
    }
  }

  function injectSyncUI() {
    if (document.getElementById("trickcalSyncBar")) return;

    const bar = document.createElement("div");
    bar.id = "trickcalSyncBar";
    bar.style.cssText = "background:#ffffff; color:#0f172a; border:2px solid #3b82f6; border-radius:10px; padding:12px 16px; margin:16px auto; max-width:1200px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; font-size:13px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); z-index:99999; position:relative;";
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span id="syncStatusBadge" style="color:#64748b;">⚪ <b>기본 데이터 모드</b> (서버 저장 없이 브라우저에서만 작동합니다)</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button type="button" id="btnExtSync" style="cursor:pointer;padding:6px 12px;border-radius:6px;border:1px solid #3b82f6;background:#eff6ff;color:#1d4ed8;font-weight:600;">⚡ 확장프로그램에서 불러오기</button>
        <button type="button" id="btnResetSync" style="cursor:pointer;padding:6px 12px;border-radius:6px;border:1px solid #fca5a5;background:#fef2f2;color:#dc2626;">🗑️ 내 데이터 초기화</button>
      </div>
    `;

    const mainEl = document.querySelector("main") || document.body;
    mainEl.insertBefore(bar, mainEl.firstChild);

    document.getElementById("btnExtSync").onclick = () => {
      window.postMessage({ type: "REQUEST_TRICKCAL_SYNC" }, "*");
    };
    document.getElementById("btnResetSync").onclick = () => {
      localStorage.removeItem("userSpecSync");
      location.reload();
    };
  }

  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data) return;
    if (e.data.type === "APPLY_TRICKCAL_SYNC") {
      applySpecToCalculator(e.data.payload, true);
      if (!e.data.auto) alert("✅ 확장 프로그램에서 트릭컬노트 데이터를 성공적으로 불러왔습니다!");
    } else if (e.data.type === "EMPTY_TRICKCAL_SYNC") {
      alert("아직 확장 프로그램에 캡처된 데이터가 없습니다.\n트릭컬노트(note.trickcal.com) 사이트에 접속하여 새로고침(F5)을 한 번 한 뒤 다시 눌러주세요!");
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectSyncUI);
  } else {
    injectSyncUI();
  }

  try {
    const saved = localStorage.getItem("userSpecSync");
    if (saved) applySpecToCalculator(JSON.parse(saved), false);
  } catch (e) {}
})();

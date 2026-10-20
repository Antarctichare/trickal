// 사도 이미지 1회 다운로드: https://tr.triple-lab.com/charas/{영문이름}.png → img/{사도번호}.png
// 영문 이름은 사이트 번들(js/json)에서 한국어 이름 근처의 문자열을 찾아 실제 다운로드로 검증합니다.
// 못 찾은 사도는 tools/names.json 에 {"사도번호":"영문이름"} 으로 직접 적으면 다음 실행에서 우선 사용됩니다.
import fs from "node:fs";
const BASE = process.env.BASE || "https://tr.triple-lab.com";
const UA = { headers: { "user-agent": "Mozilla/5.0" } };
const rd = f => JSON.parse(fs.readFileSync(f, "utf8"));
const apos = rd("tools/apostles.json");
const manual = fs.existsSync("tools/names.json") ? rd("tools/names.json") : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const text = async u => { try { const r = await fetch(u, UA); return r.ok ? await r.text() : ""; } catch { return ""; } };
const img = async u => { try { const r = await fetch(u, UA); return r.ok && (r.headers.get("content-type") || "").startsWith("image/") ? Buffer.from(await r.arrayBuffer()) : null; } catch { return null; } };

// 1) 사이트의 js/json 파일 수집
const files = new Map(), queue = [BASE + "/"];
while (queue.length && files.size < 60) {
  const u = queue.shift(); if (files.has(u)) continue;
  const t = await text(u); files.set(u, t);
  for (const m of t.matchAll(/["'(]([^"'()\s]*?[\w.\-]+\.(?:js|mjs|json))(?:\?[^"'()\s]*)?["')]/g)) {
    try { const v = new URL(m[1], u).href; if (v.startsWith(BASE) && !files.has(v)) queue.push(v); } catch {}
  }
}
const all = [...files.values()].join("\n");
console.log(`수집한 파일 ${files.size}개, ${(all.length / 1024) | 0}KB`);

// 2) 사도별로 영문 이름 후보 → 실제 다운로드로 검증
fs.mkdirSync("img", { recursive: true });
const found = {}, miss = [];
for (const a of apos) {
  const id = String(a.id), full = a.name, variant = /\(/.test(full);
  let cands = manual[id] ? [manual[id]] : [];
  if (!cands.length) {
    const re = new RegExp(esc(full) + (variant ? "" : "(?!\\()"), "g"), list = [];
    for (const m of all.matchAll(re)) {
      const s = Math.max(0, m.index - 120), w = all.slice(s, m.index + full.length + 120);
      for (const t of w.matchAll(/["'`]([A-Za-z][A-Za-z0-9_\-]{1,30})["'`]/g)) list.push({ n: t[1], d: Math.abs(s + t.index - m.index) });
      if (list.length > 400) break;
    }
    list.sort((x, y) => x.d - y.d);
    cands = [...new Set(list.map(x => x.n))].slice(0, 25);
  }
  let ok = null;
  for (const n of cands) {
    const b = await img(`${BASE}/charas/${n}.png`); await sleep(40);
    if (b) { fs.writeFileSync(`img/${id}.png`, b); ok = n; break; }
  }
  if (ok) found[id] = { name: full, file: ok }; else miss.push({ id: a.id, name: full });
}
const byFile = {}; Object.entries(found).forEach(([id, v]) => (byFile[v.file] ||= []).push(`${id} ${v.name}`));
const dup = Object.entries(byFile).filter(([, L]) => L.length > 1);
fs.writeFileSync("tools/names.found.json", JSON.stringify(found, null, 1));
fs.writeFileSync("tools/report.json", JSON.stringify({ ok: Object.keys(found).length, miss, dup }, null, 1));
console.log(`성공 ${Object.keys(found).length} / 실패 ${miss.length} / 같은 파일로 겹침 ${dup.length}`);

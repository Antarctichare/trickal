import fs from "node:fs";

const dataPath = "tools/note_data.json";
if (!fs.existsSync(dataPath)) {
  console.error(`❌ [에러] 파일이 존재하지 않습니다: ${dataPath}`);
  process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(dataPath, "utf8"));

let heroInfo = null;
if (rawData.data && rawData.data.data && rawData.data.data.heroInfo) {
  heroInfo = rawData.data.data.heroInfo;
} else if (rawData.heroInfo) {
  heroInfo = rawData.heroInfo;
}

if (!heroInfo) {
  console.error("❌ [에러] note_data.json에서 heroInfo 데이터를 찾을 수 없습니다.");
  process.exit(1);
}

const CDN_BASE = "https://cdn.note.trickcal.com/HeroIcons/";
const UA = { 
  headers: { 
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "referer": "https://note.trickcal.com/"
  } 
};

async function downloadImages() {
  // ★ 기존 img 폴더가 있다면 통째로 삭제 후 깨끗하게 재생성 (찌꺼기 파일 방지)
  if (fs.existsSync("img")) {
    fs.rmSync("img", { recursive: true, force: true });
    console.log("🧹 기존 img 폴더를 깨끗하게 비웠습니다.");
  }
  fs.mkdirSync("img", { recursive: true });

  let success = 0, fail = 0;
  console.log("🚀 공식 CDN에서 사도 이미지 다운로드 시작...");

  for (const [id, info] of Object.entries(heroInfo)) {
    if (!info || !info.icon) continue;

    const iconHash = info.icon;
    const url = `${CDN_BASE}${iconHash}.webp`;

    try {
      const res = await fetch(url, UA);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(`img/${id}.png`, buffer);
        console.log(`✅ [성공] 사도 ID ${id} -> img/${id}.png`);
        success++;
      } else {
        console.log(`❌ [실패] 사도 ID ${id} - 상태 코드: ${res.status}`);
        fail++;
      }
    } catch (e) {
      console.log(`⚠️ [에러] 사도 ID ${id} 예외 발생:`, e.message);
      fail++;
    }

    await new Promise(r => setTimeout(r, 20));
  }

  console.log(`\n🎉 완료! 성공: ${success}개 / 실패: ${fail}개`);
}

downloadImages();

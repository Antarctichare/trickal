import fs from "node:fs";

// 노트에서 추출한 전체 데이터 JSON 파일 로드
// (예: 구조가 {"10056": { "icon": "...", ... }, "10057": { ... }} 형태라고 가정)
const dataPath = "tools/note_data.json";
if (!fs.existsSync(dataPath)) {
  console.error(`❌ 데이터 파일을 찾을 수 없습니다: ${dataPath}`);
  process.exit(1);
}

const noteData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const CDN_BASE = "https://cdn.note.trickcal.com/HeroIcons/";

async function downloadApostleImages() {
  fs.mkdirSync("img", { recursive: true });
  let successCount = 0;
  let failCount = 0;

  console.log("🚀 공식 CDN에서 사도 이미지 다운로드 시작...");

  for (const [id, info] of Object.entries(noteData)) {
    // 사도 데이터 객체가 아니거나 icon 필드가 없으면 스킵
    if (!info || typeof info !== "object" || !info.icon) continue;

    const iconHash = info.icon;
    const url = `${CDN_BASE}${iconHash}.webp`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        // 계산기 및 프로젝트 구조에 맞춰 .webp 또는 .png로 저장
        fs.writeFileSync(`img/${id}.webp`, buffer);
        console.log(`✅ [성공] ID ${id} -> ${iconHash}.webp`);
        successCount++;
      } else {
        console.log(`❌ [실패] ID ${id} (상태 코드: ${res.status})`);
        failCount++;
      }
    } catch (e) {
      console.log(`⚠️ [에러] ID ${id} 다운로드 중 예외 발생:`, e.message);
      failCount++;
    }

    // 서버 부하 방지용 짧은 딜레이 (20ms)
    await new Promise(r => setTimeout(r, 20));
  }

  console.log(`\n🎉 다운로드 완료! 성공: ${successCount}개 / 실패: ${failCount}개`);
}

downloadApostleImages();

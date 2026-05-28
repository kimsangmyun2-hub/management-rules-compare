import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import pdf from "pdf-parse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function cleanText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeArticleTitle(title) {
  const match = String(title || "").match(/제\s*(\d+)\s*조(?:\s*의\s*(\d+))?/);
  if (!match) return String(title || "").replace(/\s+/g, " ").trim();
  return match[2] ? `제${match[1]}조의${match[2]}` : `제${match[1]}조`;
}

function splitArticles(text) {
  const result = {};
  const source = cleanText(text);
  const regex = /(제\s*\d+\s*조(?:\s*의\s*\d+)?(?:\s*\([^\n)]*\))?[^\n]*)([\s\S]*?)(?=\n?\s*제\s*\d+\s*조(?:\s*의\s*\d+)?(?:\s*\([^\n)]*\))?|$)/g;

  let match;
  while ((match = regex.exec(source)) !== null) {
    const originalTitle = match[1].replace(/\s+/g, " ").trim();
    const key = normalizeArticleTitle(originalTitle);
    const body = match[2].trim();
    result[key] = `${originalTitle}\n${body}`.trim();
  }

  return result;
}

function getArticleSortValue(key) {
  const match = String(key).match(/제(\d+)조(?:의(\d+))?/);
  if (!match) return 999999;
  return Number(match[1]) * 1000 + Number(match[2] || 0);
}

function getChangeReason(guideline, current, revision) {
  if (!current && revision) {
    return "관리규약준칙 및 공동주택 관리 운영상 필요한 사항을 반영하기 위하여 조문을 신설함.";
  }

  if (current && !revision) {
    return "현행 조문 중 중복되거나 운영상 필요성이 낮은 내용을 정비하기 위하여 삭제함.";
  }

  if (current !== revision) {
    return "관리규약준칙 개정사항 및 실제 운영기준을 반영하여 문구를 정비함.";
  }

  return "개정사항 없음.";
}

function extractTextFromHwpBuffer(buffer) {
  // 1차 HWP 지원: 바이너리 안에 노출되는 한글/숫자/기호 텍스트를 최대한 추출합니다.
  // 일부 HWP는 압축/암호화/복합문서 구조 때문에 본문 추출이 제한될 수 있습니다.
  const unicodeText = buffer.toString("utf16le");
  const utf8Text = buffer.toString("utf8");
  const combined = `${unicodeText}\n${utf8Text}`;

  const pieces = combined.match(/[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9\s().,·ㆍ:;\-—~\[\]{}「」『』%㎡㎡㎡]+/g) || [];
  const text = cleanText(pieces.join("\n"));

  if (!/제\s*\d+\s*조/.test(text)) {
    throw new Error("HWP 본문에서 조문번호를 찾지 못했습니다. 한글에서 '다른 이름으로 저장 → TXT 또는 PDF'로 저장 후 다시 업로드해 주세요.");
  }

  return text;
}

async function extractTextFromFile(file) {
  const name = file.originalname.toLowerCase();

  if (name.endsWith(".pdf")) {
    const data = await pdf(file.buffer);
    const text = cleanText(data.text);
    if (!text) {
      throw new Error(`${file.originalname} PDF에서 텍스트를 추출하지 못했습니다. 스캔 PDF는 OCR 기능 추가 전에는 지원되지 않습니다.`);
    }
    return text;
  }

  if (name.endsWith(".hwp")) {
    return extractTextFromHwpBuffer(file.buffer);
  }

  return cleanText(file.buffer.toString("utf-8"));
}

app.post(
  "/api/compare",
  upload.fields([
    { name: "guideline", maxCount: 1 },
    { name: "current", maxCount: 1 },
    { name: "revision", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!req.files?.guideline?.[0] || !req.files?.current?.[0] || !req.files?.revision?.[0]) {
        return res.status(400).json({ error: "3개의 파일을 모두 업로드해 주세요." });
      }

      const guidelineText = await extractTextFromFile(req.files.guideline[0]);
      const currentText = await extractTextFromFile(req.files.current[0]);
      const revisionText = await extractTextFromFile(req.files.revision[0]);

      const guidelineArticles = splitArticles(guidelineText);
      const currentArticles = splitArticles(currentText);
      const revisionArticles = splitArticles(revisionText);

      const allKeys = Array.from(
        new Set([
          ...Object.keys(guidelineArticles),
          ...Object.keys(currentArticles),
          ...Object.keys(revisionArticles)
        ])
      ).sort((a, b) => getArticleSortValue(a) - getArticleSortValue(b));

      if (allKeys.length === 0) {
        return res.status(400).json({
          error: "조문번호를 찾지 못했습니다. 문서에 '제1조', '제2조' 형식의 조문번호가 있는지 확인해 주세요."
        });
      }

      const rows = allKeys.map((key) => {
        const guideline = guidelineArticles[key] || "";
        const current = currentArticles[key] || "";
        const revision = revisionArticles[key] || "";

        return {
          article: key,
          guideline,
          current,
          revision,
          reason: getChangeReason(guideline, current, revision)
        };
      });

      res.json({ rows, count: rows.length });
    } catch (error) {
      res.status(500).json({
        error: error.message || "비교표 생성 중 오류가 발생했습니다."
      });
    }
  }
);

app.use(express.static(path.join(__dirname, "dist")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`관리규약 3단비교표작성 서버 실행 중: ${PORT}`);
});
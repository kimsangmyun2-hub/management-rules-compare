import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 10000;

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

  if (!match) {
    return String(title || "").replace(/\s+/g, " ").trim();
  }

  return match[2]
    ? `제${match[1]}조의${match[2]}`
    : `제${match[1]}조`;
}

function splitArticles(text) {
  const result = {};
  const source = cleanText(text);

  const regex = /(제\s*\d+\s*조(?:\s*의\s*\d+)?(?:\s*\([^)]+\))?.*?)([\s\S]*?)(?=제\s*\d+\s*조|$)/g;

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
    return "관리규약준칙 및 운영 필요사항을 반영하여 조문을 신설함.";
  }

  if (current && !revision) {
    return "현행 규정 중 불필요하거나 중복되는 내용을 삭제·정비함.";
  }

  if (current !== revision) {
    return "관리규약준칙 및 운영 현실을 반영하여 문구를 개정함.";
  }

  return "개정사항 없음.";
}

function extractTextFromHwpBuffer(buffer) {
  const unicodeText = buffer.toString("utf16le");
  const utf8Text = buffer.toString("utf8");
  const combined = `${unicodeText}\n${utf8Text}`;

  const pieces = combined.match(/[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9\s().,·ㆍ:;\-—~\[\]{}「」『』%]+/g) || [];

  const text = cleanText(pieces.join("\n"));

  if (!/제\s*\d+\s*조/.test(text)) {
    throw new Error("HWP 파일에서 조문번호를 찾지 못했습니다. TXT 또는 PDF로 저장 후 다시 업로드해주세요.");
  }

  return text;
}

async function extractTextFromPdf(buffer) {
  try {
    const pdfModule = await import("pdf-parse");
    const pdfParse = pdfModule.default || pdfModule;

    const data = await pdfParse(buffer);

    return cleanText(data.text);
  } catch (error) {
    console.error(error);
    throw new Error("PDF 텍스트 추출 중 오류가 발생했습니다.");
  }
}

async function extractTextFromFile(file) {
  const name = file.originalname.toLowerCase();

  if (name.endsWith(".pdf")) {
    const text = await extractTextFromPdf(file.buffer);

    if (!text) {
      throw new Error("PDF에서 텍스트를 추출하지 못했습니다.");
    }

    return text;
  }

  if (name.endsWith(".hwp")) {
    return extractTextFromHwpBuffer(file.buffer);
  }

  return cleanText(file.buffer.toString("utf8"));
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
        return res.status(400).json({
          error: "3개의 파일을 모두 업로드해주세요."
        });
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

      const rows = allKeys.map((key) => ({
        article: key,
        guideline: guidelineArticles[key] || "",
        current: currentArticles[key] || "",
        revision: revisionArticles[key] || "",
        reason: getChangeReason(
          guidelineArticles[key] || "",
          currentArticles[key] || "",
          revisionArticles[key] || ""
        )
      }));

      res.json({
        success: true,
        count: rows.length,
        rows
      });
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

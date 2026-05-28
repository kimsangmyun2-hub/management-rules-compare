import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function splitArticles(text) {
  const result = {};
  const regex = /(제\s*\d+\s*조(?:의\s*\d+)?[^\n]*)([\s\S]*?)(?=제\s*\d+\s*조(?:의\s*\d+)?|$)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    const title = match[1].replace(/\s+/g, " ").trim();
    const body = match[2].trim();
    result[title] = `${title}\n${body}`.trim();
  }

  return result;
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

app.post(
  "/api/compare",
  upload.fields([
    { name: "guideline", maxCount: 1 },
    { name: "current", maxCount: 1 },
    { name: "revision", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const guidelineText = req.files.guideline[0].buffer.toString("utf-8");
      const currentText = req.files.current[0].buffer.toString("utf-8");
      const revisionText = req.files.revision[0].buffer.toString("utf-8");

      const guidelineArticles = splitArticles(guidelineText);
      const currentArticles = splitArticles(currentText);
      const revisionArticles = splitArticles(revisionText);

      const allKeys = Array.from(
        new Set([
          ...Object.keys(guidelineArticles),
          ...Object.keys(currentArticles),
          ...Object.keys(revisionArticles)
        ])
      );

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

      res.json({ rows });
    } catch (error) {
      res.status(500).json({
        error: "비교표 생성 중 오류가 발생했습니다.",
        detail: error.message
      });
    }
  }
);

app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`관리규약 3단비교표작성 서버 실행 중: ${PORT}`);
});
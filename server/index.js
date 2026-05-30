require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");
const cors = require("cors");
const express = require("express");
const multer = require("multer");
const { extractTextFromFile } = require("./textExtraction");
const {
  extractCandidateName,
  extractContact,
  scoreResume,
  summarizeJD
} = require("./scoring");
const { rankCandidates } = require("./ranking");
const { getRuns, initStore, saveRun } = require("./db/store");

const app = express();
const port = Number(process.env.PORT || 4000);
const projectRoot = path.join(__dirname, "..");
const uploadRoot = path.join(projectRoot, "uploads");
const resumeDir = path.join(uploadRoot, "resumes");
const jdDir = path.join(uploadRoot, "jds");
const distDir = path.join(projectRoot, "dist");

for (const directory of [resumeDir, jdDir, path.join(projectRoot, "data")]) {
  fs.mkdirSync(directory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.fieldname === "jdFile" ? jdDir : resumeDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.-]+/g, "_");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  }
});

const allowedExtensions = new Set([".pdf", ".doc", ".docx", ".txt"]);
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 30
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.has(ext)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${ext || file.originalname}`));
  }
});

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadRoot));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "resume-shortlister" });
});

app.get("/api/runs", async (req, res, next) => {
  try {
    res.json({ runs: await getRuns() });
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/analyze",
  upload.fields([
    { name: "resumes", maxCount: 25 },
    { name: "jdFile", maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const resumeFiles = req.files?.resumes || [];
      const jdFile = req.files?.jdFile?.[0] || null;

      if (!resumeFiles.length) {
        return res.status(400).json({ message: "Upload at least one resume." });
      }

      let jdText = (req.body.jdText || "").trim();
      if (jdFile) {
        jdText = `${jdText}\n\n${await extractTextFromFile(jdFile.path, jdFile.originalname)}`.trim();
      }

      if (!jdText) {
        return res.status(400).json({ message: "Add a job description or upload a JD file." });
      }

      const candidates = await Promise.all(
        resumeFiles.map(async (file) => {
          const text = await extractTextFromFile(file.path, file.originalname);
          const scoring = scoreResume(text, jdText);
          const contact = extractContact(text);

          return {
            id: `${file.filename}-${scoring.score}`,
            candidateName: extractCandidateName(text, file.originalname),
            originalFileName: file.originalname,
            fileType: path.extname(file.originalname).toLowerCase(),
            fileUrl: `/uploads/resumes/${file.filename}`,
            score: scoring.score,
            keyMatchingSkills: scoring.keyMatchingSkills,
            missingSkills: scoring.missingSkills,
            components: scoring.components,
            contact,
            resumeYears: scoring.resumeYears,
            previewText: text.replace(/\s+/g, " ").trim().slice(0, 1800)
          };
        })
      );

      const rankedCandidates = rankCandidates(candidates);

      const run = await saveRun({
        jdSummary: summarizeJD(jdText),
        jdFileName: jdFile?.originalname || "",
        candidates: rankedCandidates
      });

      res.json({
        runId: run.id,
        generatedAt: run.createdAt,
        jdSummary: run.jdSummary,
        candidates: rankedCandidates
      });
    } catch (error) {
      next(error);
    }
  }
);

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: error.message || "Unable to analyze resumes."
  });
});

initStore()
  .then(() => {
    app.listen(port, () => {
      console.log(`Resume Shortlister API running on http://127.0.0.1:${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

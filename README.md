# Resume Shortlister

A full-stack resume screening web application that compares uploaded resumes with a job description, scores each candidate from 0 to 100, and ranks candidates from strongest to weakest match.

## Features

- Upload multiple resumes in PDF, DOC, or DOCX format
- Enter a job description manually or upload a JD document
- Extract resume/JD text and calculate match scores
- Rank candidates by score
- Show candidate name, resume preview, rank, score, matching skills, missing skills, and contact details
- Search and sort ranked candidates
- Export results as CSV
- Store analysis runs locally by default, with optional PostgreSQL support

## Tech Stack

- Frontend: React, Vite, Lucide icons
- Backend: Node.js, Express, Multer
- Parsing: pdf-parse for PDFs, Mammoth for DOCX, text fallback for legacy DOC
- Database: JSON file for local development, PostgreSQL when `DATABASE_URL` is configured

## Setup

```bash
npm install
npm run dev
```

Frontend: `http://127.0.0.1:5173`

API: `http://127.0.0.1:4000`

## Tests

```bash
npm test
```

The tests cover skill extraction, scoring strength, missing skills, ranking order, candidate name detection, and contact extraction.

## Production

```bash
npm run build
npm start
```

The Express server serves the built React app from `dist/` and exposes the API under `/api`.

## Deployment

The project includes [render.yaml](render.yaml) for Render deployment.

See [DEPLOYMENT.md](DEPLOYMENT.md) for hosting steps and production notes.

## Environment

Copy `.env.example` to `.env` if you want to change defaults.

```bash
PORT=4000
CLIENT_ORIGIN=http://127.0.0.1:5173
DATABASE_URL=postgres://user:password@localhost:5432/resume_shortlister
```

If `DATABASE_URL` is provided, the server creates a `screening_runs` table and stores each run as JSONB. Without it, runs are stored in `data/submissions.json`.

## Scoring Approach

The scoring model is deterministic and transparent:

- Skills match: 45 points
- Keyword similarity: 25 points
- Experience relevance: 15 points
- Education alignment: 10 points
- Role fit terms: 5 points

The backend extracts a skill taxonomy from the JD and each resume, calculates matched and missing skills, checks keyword overlap, compares requested years of experience against detected resume experience, and includes education term alignment. Candidates are sorted by final score, highest first.

## Assumptions

- The first clean person-like line in a resume is treated as the candidate name; otherwise the filename is used.
- Legacy `.doc` files are supported with a best-effort text fallback. `.docx` and `.pdf` extraction is more accurate.
- CSV export satisfies the export requirement for spreadsheet tools such as Excel.

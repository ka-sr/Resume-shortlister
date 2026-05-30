import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Download,
  Eye,
  FileText,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  UploadCloud,
  X
} from "lucide-react";

const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const getScoreTone = (score) => {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "low";
};

const getProgressStage = (progress) => {
  if (progress < 12) return "Packaging files";
  if (progress < 74) return "Uploading resumes";
  if (progress < 92) return "Analyzing content";
  return "Ranking candidates";
};

const analyzeResumes = (formData, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/analyze");
    xhr.responseType = "json";

    xhr.onloadstart = () => onProgress(6);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(72, Math.round((event.loaded / event.total) * 72)));
      } else {
        onProgress(34);
      }
    };
    xhr.onload = () => {
      const payload =
        xhr.response ||
        (xhr.responseText
          ? JSON.parse(xhr.responseText)
          : {});
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
      } else {
        reject(new Error(payload.message || "Analysis failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Unable to reach the analysis server."));
    xhr.send(formData);
  });

function App() {
  const [resumes, setResumes] = useState([]);
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("rank");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

  const candidates = result?.candidates || [];

  const filteredCandidates = useMemo(() => {
    const term = query.trim().toLowerCase();
    const visible = term
      ? candidates.filter((candidate) => {
          const searchable = [
            candidate.candidateName,
            candidate.originalFileName,
            candidate.contact?.email,
            ...(candidate.keyMatchingSkills || []),
            ...(candidate.missingSkills || [])
          ]
            .join(" ")
            .toLowerCase();
          return searchable.includes(term);
        })
      : [...candidates];

    return visible.sort((a, b) => {
      if (sortMode === "scoreAsc") return a.score - b.score;
      if (sortMode === "name") return a.candidateName.localeCompare(b.candidateName);
      return a.rank - b.rank;
    });
  }, [candidates, query, sortMode]);

  const topScore = candidates[0]?.score || 0;
  const averageScore = candidates.length
    ? Math.round(candidates.reduce((total, candidate) => total + candidate.score, 0) / candidates.length)
    : 0;

  const handleAnalyze = async (event) => {
    event.preventDefault();
    setError("");

    if (!resumes.length) {
      setError("Add at least one resume.");
      return;
    }

    if (!jdText.trim() && !jdFile) {
      setError("Add a job description.");
      return;
    }

    const formData = new FormData();
    resumes.forEach((resume) => formData.append("resumes", resume));
    formData.append("jdText", jdText);
    if (jdFile) formData.append("jdFile", jdFile);

    setIsLoading(true);
    setUploadProgress(4);
    try {
      const payload = await analyzeResumes(formData, setUploadProgress);
      setUploadProgress(100);
      setResult(payload);
      setSelectedCandidate(payload.candidates?.[0] || null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCsv = () => {
    if (!candidates.length) return;
    const header = [
      "Rank",
      "Candidate Name",
      "Email",
      "Phone",
      "Match Score",
      "Key Matching Skills",
      "Missing Skills",
      "Resume File"
    ];
    const rows = candidates.map((candidate) => [
      candidate.rank,
      candidate.candidateName,
      candidate.contact?.email,
      candidate.contact?.phone,
      candidate.score,
      candidate.keyMatchingSkills.join(", "),
      candidate.missingSkills.join(", "),
      candidate.originalFileName
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `resume-shortlist-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setResumes([]);
    setJdText("");
    setJdFile(null);
    setResult(null);
    setSelectedCandidate(null);
    setQuery("");
    setUploadProgress(0);
    setError("");
  };

  const removeResume = (resumeToRemove) => {
    setResumes((currentResumes) =>
      currentResumes.filter((resume) => resume !== resumeToRemove)
    );
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Resume Screening</p>
            <h1>Candidate Ranking Workspace</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button ghost" type="button" onClick={resetForm} title="Reset">
              <RotateCcw size={18} />
            </button>
            <button
              className="primary-button"
              type="submit"
              form="analysis-form"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
              <span>{isLoading ? "Analyzing" : "Analyze"}</span>
            </button>
          </div>
        </header>

        <div className="layout-grid">
          <form className="input-panel" id="analysis-form" onSubmit={handleAnalyze}>
            <div className="panel-heading">
              <BriefcaseBusiness size={18} />
              <h2>Inputs</h2>
            </div>

            <label className="drop-zone">
              <UploadCloud size={28} />
              <strong>
                {resumes.length
                  ? `${resumes.length} resume${resumes.length > 1 ? "s" : ""} selected`
                  : "Resumes"}
              </strong>
              <small>PDF, DOC, DOCX</small>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                multiple
                onChange={(event) => setResumes([...event.target.files])}
              />
            </label>

            {resumes.length > 0 && (
              <ul className="file-list">
                {resumes.map((resume) => (
                  <li key={`${resume.name}-${resume.size}`}>
                    <FileText size={16} />
                    <span>
                      <strong>{resume.name}</strong>
                      <small>{formatFileSize(resume.size)}</small>
                    </span>
                    <button
                      type="button"
                      className="file-remove"
                      onClick={() => removeResume(resume)}
                      title="Remove file"
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <label className="field-label" htmlFor="jdText">
              Job Description
            </label>
            <textarea
              id="jdText"
              value={jdText}
              onChange={(event) => setJdText(event.target.value)}
              placeholder="Paste the JD here"
              rows={11}
            />

            <label className="inline-file">
              <FileText size={17} />
              <span>{jdFile ? jdFile.name : "JD file"}</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(event) => setJdFile(event.target.files?.[0] || null)}
              />
            </label>

            {isLoading && (
              <div className="progress-panel" role="status" aria-live="polite">
                <div className="progress-copy">
                  <span>{getProgressStage(uploadProgress)}</span>
                  <strong>{uploadProgress}%</strong>
                </div>
                <div className="progress-track">
                  <div style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {error && <p className="error-text">{error}</p>}
          </form>

          <section className="results-panel">
            <div className="metrics-row">
              <article className="metric-card">
                <Trophy size={19} />
                <span>Top Score</span>
                <strong>{topScore}</strong>
              </article>
              <article className="metric-card">
                <BarChart3 size={19} />
                <span>Average</span>
                <strong>{averageScore}</strong>
              </article>
              <article className="metric-card">
                <FileText size={19} />
                <span>Candidates</span>
                <strong>{candidates.length}</strong>
              </article>
            </div>

            <div className="toolbar">
              <label className="search-box">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search candidates"
                />
              </label>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                <option value="rank">Rank</option>
                <option value="scoreAsc">Score low to high</option>
                <option value="name">Name</option>
              </select>
              <button
                className="icon-button"
                type="button"
                onClick={() => setSortMode(sortMode === "scoreAsc" ? "rank" : "scoreAsc")}
                title="Toggle score sort"
              >
                {sortMode === "scoreAsc" ? <ArrowUpAZ size={18} /> : <ArrowDownAZ size={18} />}
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={exportCsv}
                disabled={!candidates.length}
                title="Export CSV"
              >
                <Download size={18} />
              </button>
            </div>

            <div className="candidate-list">
              {filteredCandidates.length ? (
                filteredCandidates.map((candidate) => (
                  <article
                    className={`candidate-card ${
                      selectedCandidate?.id === candidate.id ? "active" : ""
                    }`}
                    key={candidate.id}
                  >
                    <div className="candidate-main">
                      <div className="rank-badge">#{candidate.rank}</div>
                      <div>
                        <h3>{candidate.candidateName}</h3>
                        <p>{candidate.contact?.email || candidate.originalFileName}</p>
                      </div>
                    </div>

                    <div className={`score-block ${getScoreTone(candidate.score)}`}>
                      <strong>{candidate.score}</strong>
                      <span>match</span>
                    </div>

                    <div className="score-meter" aria-label={`Match score ${candidate.score}`}>
                      <span
                        className={getScoreTone(candidate.score)}
                        style={{ width: `${candidate.score}%` }}
                      />
                    </div>

                    <div className="skill-row">
                      {(candidate.keyMatchingSkills.length
                        ? candidate.keyMatchingSkills
                        : ["No direct skill match"]
                      ).map((skill) => (
                        <span className="chip positive" key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>

                    {!!candidate.missingSkills.length && (
                      <div className="skill-row">
                        {candidate.missingSkills.map((skill) => (
                          <span className="chip muted" key={skill}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <button
                      className="text-button"
                      type="button"
                      onClick={() => setSelectedCandidate(candidate)}
                    >
                      <Eye size={16} />
                      <span>Preview</span>
                    </button>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <FileText size={34} />
                  <h3>{query ? "No matching candidates" : "Waiting for analysis"}</h3>
                  <p>
                    {query
                      ? "Try a different name, file, skill, or gap."
                      : "Ranked candidates will appear here."}
                  </p>
                </div>
              )}
            </div>
          </section>

          <aside className="preview-panel">
            <div className="panel-heading">
              <Eye size={18} />
              <h2>Resume Preview</h2>
            </div>

            {selectedCandidate ? (
              <>
                <div className="preview-header">
                  <div>
                    <h3>{selectedCandidate.candidateName}</h3>
                    <p>{selectedCandidate.originalFileName}</p>
                  </div>
                  <span className={`score-pill ${getScoreTone(selectedCandidate.score)}`}>
                    <BadgeCheck size={15} />
                    {selectedCandidate.score}
                  </span>
                  <a href={selectedCandidate.fileUrl} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </div>

                <div className="component-grid">
                  {Object.entries(selectedCandidate.components).map(([label, value]) => (
                    <div className="component-pill" key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>

                {selectedCandidate.fileType === ".pdf" ? (
                  <iframe title="Resume preview" src={selectedCandidate.fileUrl} />
                ) : (
                  <pre>{selectedCandidate.previewText || "Preview unavailable."}</pre>
                )}
              </>
            ) : (
              <div className="empty-state compact">
                <FileText size={30} />
                <p>Select a ranked candidate.</p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

export default App;

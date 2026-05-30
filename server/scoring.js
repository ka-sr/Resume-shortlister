const path = require("path");

const STOP_WORDS = new Set([
  "and",
  "are",
  "but",
  "can",
  "for",
  "from",
  "has",
  "have",
  "into",
  "our",
  "per",
  "the",
  "this",
  "that",
  "with",
  "will",
  "you",
  "your",
  "about",
  "also",
  "been",
  "their",
  "they",
  "them",
  "role",
  "work",
  "team",
  "using",
  "based",
  "strong",
  "good",
  "years",
  "year",
  "experience",
  "candidate",
  "responsibilities",
  "requirements"
]);

const SKILL_ALIASES = {
  "JavaScript": ["javascript", "ecmascript"],
  "TypeScript": ["typescript", "ts"],
  "React": ["react", "react.js", "reactjs"],
  "Next.js": ["next.js", "nextjs", "next"],
  "Node.js": ["node.js", "nodejs", "node"],
  "Express": ["express", "express.js"],
  "HTML": ["html", "html5"],
  "CSS": ["css", "css3"],
  "Tailwind CSS": ["tailwind", "tailwind css"],
  "Redux": ["redux", "redux toolkit"],
  "MongoDB": ["mongodb", "mongo"],
  "PostgreSQL": ["postgresql", "postgres", "psql"],
  "MySQL": ["mysql"],
  "SQL": ["sql"],
  "REST API": ["rest api", "restful", "rest"],
  "GraphQL": ["graphql"],
  "Python": ["python"],
  "Django": ["django"],
  "FastAPI": ["fastapi", "fast api"],
  "Java": ["java"],
  "Spring Boot": ["spring boot", "spring"],
  "C++": ["c++", "cpp"],
  "C#": ["c#", "c sharp"],
  ".NET": [".net", "dotnet"],
  "PHP": ["php"],
  "Laravel": ["laravel"],
  "Docker": ["docker"],
  "Kubernetes": ["kubernetes", "k8s"],
  "AWS": ["aws", "amazon web services"],
  "Azure": ["azure"],
  "GCP": ["gcp", "google cloud"],
  "Git": ["git", "github", "gitlab"],
  "CI/CD": ["ci/cd", "cicd", "continuous integration"],
  "Jest": ["jest"],
  "Testing": ["testing", "unit test", "integration test"],
  "Agile": ["agile", "scrum"],
  "Machine Learning": ["machine learning", "ml"],
  "NLP": ["nlp", "natural language processing"],
  "Data Analysis": ["data analysis", "analytics"],
  "Excel": ["excel", "spreadsheet"],
  "Figma": ["figma"],
  "UI/UX": ["ui/ux", "ux", "user experience"],
  "Communication": ["communication", "stakeholder"],
  "Leadership": ["leadership", "managed", "mentored"]
};

const EDUCATION_TERMS = [
  "bachelor",
  "masters",
  "master",
  "b.tech",
  "m.tech",
  "b.e",
  "m.e",
  "bsc",
  "msc",
  "degree",
  "computer science",
  "engineering",
  "mba",
  "phd"
];

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^\w+#./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAlias(text, alias) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const edge = /[a-z0-9]/i.test(alias[0]) ? "\\b" : "";
  const end = /[a-z0-9]/i.test(alias[alias.length - 1]) ? "\\b" : "";
  return new RegExp(`${edge}${escaped}${end}`, "i").test(text);
}

function extractSkills(text) {
  const normalized = normalize(text);
  return Object.entries(SKILL_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => includesAlias(normalized, alias)))
    .map(([skill]) => skill);
}

function extractKeywords(text, limit = 35) {
  const counts = new Map();
  normalize(text)
    .replace(/[+#./-]/g, " ")
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token) && !/^\d+$/.test(token))
    .forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function extractYears(text) {
  const matches = [...(text || "").matchAll(/(\d{1,2})\+?\s*(?:years?|yrs?)\b/gi)];
  if (!matches.length) return 0;
  return Math.max(...matches.map((match) => Number(match[1])).filter(Number.isFinite));
}

function extractEducation(text) {
  const normalized = normalize(text);
  return EDUCATION_TERMS.filter((term) => normalized.includes(term));
}

function overlap(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => rightSet.has(item));
}

function scoreRatio(matchedCount, totalCount) {
  if (!totalCount) return 1;
  return matchedCount / totalCount;
}

function scoreResume(resumeText, jdText) {
  const jdSkills = extractSkills(jdText);
  const resumeSkills = extractSkills(resumeText);
  const matchedSkills = overlap(jdSkills, resumeSkills);
  const missingSkills = jdSkills.filter((skill) => !resumeSkills.includes(skill));

  const jdKeywords = extractKeywords(jdText);
  const resumeKeywords = extractKeywords(resumeText, 80);
  const matchedKeywords = overlap(jdKeywords, resumeKeywords);

  const skillRatio = jdSkills.length
    ? scoreRatio(matchedSkills.length, jdSkills.length)
    : scoreRatio(matchedKeywords.length, Math.min(jdKeywords.length, 12));

  const keywordRatio = scoreRatio(
    matchedKeywords.length,
    Math.min(jdKeywords.length || 1, 25)
  );

  const jdYears = extractYears(jdText);
  const resumeYears = extractYears(resumeText);
  const experienceRatio = jdYears
    ? Math.min(resumeYears / jdYears, 1)
    : resumeYears
      ? 0.9
      : normalize(resumeText).includes("intern")
        ? 0.55
        : 0.35;

  const jdEducation = extractEducation(jdText);
  const resumeEducation = extractEducation(resumeText);
  const educationRatio = jdEducation.length
    ? scoreRatio(overlap(jdEducation, resumeEducation).length, jdEducation.length)
    : resumeEducation.length
      ? 0.9
      : 0.55;

  const roleWords = extractKeywords(jdText, 8);
  const titleRatio = scoreRatio(overlap(roleWords, resumeKeywords).length, roleWords.length || 1);

  const components = {
    skills: Math.round(skillRatio * 45),
    keywords: Math.round(keywordRatio * 25),
    experience: Math.round(experienceRatio * 15),
    education: Math.round(educationRatio * 10),
    roleFit: Math.round(titleRatio * 5)
  };

  const score = Math.max(
    0,
    Math.min(
      100,
      components.skills +
        components.keywords +
        components.experience +
        components.education +
        components.roleFit
    )
  );

  const genericMatches = matchedKeywords
    .filter((word) => !matchedSkills.map((skill) => skill.toLowerCase()).includes(word))
    .slice(0, 8);

  return {
    score,
    keyMatchingSkills: [...matchedSkills, ...genericMatches].slice(0, 10),
    missingSkills: missingSkills.slice(0, 10),
    allResumeSkills: resumeSkills,
    components,
    jdSkills,
    matchedKeywords: matchedKeywords.slice(0, 12),
    resumeYears,
    jdYears
  };
}

function extractCandidateName(text, originalName) {
  const lines = (text || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => line.length >= 3 && line.length <= 70)
    .filter((line) => !/@/.test(line))
    .filter((line) => !/\b(resume|curriculum|vitae|profile|email|phone|mobile)\b/i.test(line));

  const candidateLine = lines.find((line) => {
    const words = line.split(" ");
    return (
      words.length >= 2 &&
      words.length <= 5 &&
      words.every((word) => /^[A-Za-z.'-]+$/.test(word))
    );
  });

  if (candidateLine) return candidateLine;

  return path
    .basename(originalName || "Candidate", path.extname(originalName || ""))
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractContact(text) {
  const email = (text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone =
    (text || "").match(/(?:\+?\d[\s-]?){9,14}\d/)?.[0]?.replace(/\s+/g, " ").trim() || "";
  return { email, phone };
}

function summarizeJD(jdText) {
  return {
    requiredSkills: extractSkills(jdText),
    keywords: extractKeywords(jdText, 12),
    years: extractYears(jdText)
  };
}

module.exports = {
  extractCandidateName,
  extractContact,
  extractSkills,
  scoreResume,
  summarizeJD
};

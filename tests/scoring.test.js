const test = require("node:test");
const assert = require("node:assert/strict");
const { extractCandidateName, extractContact, extractSkills, scoreResume } = require("../server/scoring");
const { rankCandidates } = require("../server/ranking");

test("extractSkills recognizes common full-stack aliases without false JavaScript matches", () => {
  const skills = extractSkills("Built APIs with React, Node.js, Express and PostgreSQL.");

  assert.deepEqual(skills, ["React", "Node.js", "Express", "PostgreSQL"]);
});

test("scoreResume rewards relevant resumes and reports missing JD skills", () => {
  const jd = [
    "Full stack developer with React, Node.js, Express, PostgreSQL, Docker and REST API.",
    "Requires 3 years experience and a bachelor degree."
  ].join(" ");
  const resume = [
    "Kamal Bhagat",
    "Full Stack Developer",
    "React, Node.js, Express, PostgreSQL and REST API",
    "4 years experience",
    "Bachelor of Engineering"
  ].join("\n");

  const result = scoreResume(resume, jd);

  assert.ok(result.score >= 80);
  assert.ok(result.keyMatchingSkills.includes("React"));
  assert.ok(result.keyMatchingSkills.includes("Node.js"));
  assert.deepEqual(result.missingSkills, ["Docker"]);
  assert.equal(result.components.experience, 15);
});

test("scoreResume gives a weaker score when core JD skills are absent", () => {
  const jd = "React Node.js Express PostgreSQL developer with 3 years experience.";
  const resume = "Customer support specialist with Excel reporting and communication skills.";

  const result = scoreResume(resume, jd);

  assert.ok(result.score < 45);
  assert.ok(result.missingSkills.includes("React"));
  assert.ok(result.missingSkills.includes("PostgreSQL"));
});

test("rankCandidates sorts by score descending and breaks ties by candidate name", () => {
  const ranked = rankCandidates([
    { candidateName: "Zara Khan", score: 72 },
    { candidateName: "Aman Verma", score: 92 },
    { candidateName: "Neha Singh", score: 92 }
  ]);

  assert.deepEqual(
    ranked.map((candidate) => `${candidate.rank}:${candidate.candidateName}`),
    ["1:Aman Verma", "2:Neha Singh", "3:Zara Khan"]
  );
});

test("extractCandidateName and extractContact pull useful profile details", () => {
  const text = [
    "Resume",
    "Priya Sharma",
    "priya@example.com",
    "+91 98765 43210",
    "React Developer"
  ].join("\n");

  assert.equal(extractCandidateName(text, "fallback-name.pdf"), "Priya Sharma");
  assert.deepEqual(extractContact(text), {
    email: "priya@example.com",
    phone: "+91 98765 43210"
  });
});

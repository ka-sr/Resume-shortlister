function rankCandidates(candidates) {
  return [...candidates]
    .sort((a, b) => b.score - a.score || a.candidateName.localeCompare(b.candidateName))
    .map((candidate, index) => ({
      ...candidate,
      rank: index + 1
    }));
}

module.exports = { rankCandidates };

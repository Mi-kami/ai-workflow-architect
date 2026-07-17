/* =========================================================================
   SCORING ENGINE
   A weighted-sum multi-criteria decision model (MCDA), the same class of
   method used for vendor selection / feature prioritization scoring.
   This is fully deterministic — no AI call happens here. It takes the
   user's profile + a target tool category and ranks the matching tools
   from tools-data.js, showing the per-criterion math so the ranking is
   auditable rather than a black box.
   ========================================================================= */

const SCORING_WEIGHTS = {
  budget: 0.30,
  skill: 0.30,
  data: 0.25,
  team: 0.15,
};

/**
 * closeness(a, b) -> 0..1, 1 when equal, decaying linearly with distance
 * on a 1-5 scale. Used for budget & skill, where "close to what you need"
 * matters more than "as high as possible."
 */
function closeness(a, b) {
  const dist = Math.abs(a - b);
  return Math.max(0, 1 - dist / 4);
}

/**
 * dataFit: user's sensitivity requirement vs tool's handling capability.
 * Unlike budget/skill, this is NOT symmetric — a tool that handles MORE
 * sensitive data than you need is fine (small penalty for overkill/cost),
 * but a tool that handles LESS than you need is a hard problem (steep penalty).
 */
function dataFit(userNeed, toolHandling) {
  if (toolHandling >= userNeed) {
    const overkill = toolHandling - userNeed;
    return Math.max(0.7, 1 - overkill * 0.075);
  }
  const shortfall = userNeed - toolHandling;
  return Math.max(0, 1 - shortfall * 0.35);
}

function teamFitScore(userTeamSize, toolTeamFit) {
  return toolTeamFit.includes(userTeamSize) ? 1 : 0.35;
}

/**
 * Score every tool in `category` against the user profile.
 * profile = { budget: 1-5, skill: 1-5, dataSensitivity: 1-5, teamSize: 'solo'|'small'|'large' }
 * Returns tools sorted by score desc, each annotated with a breakdown.
 */
function scoreToolsForCategory(category, profile, toolsDb) {
  const candidates = toolsDb.filter((t) => t.category === category);

  const scored = candidates.map((tool) => {
    const budgetScore = closeness(profile.budget, tool.costTier);
    const skillScore = closeness(profile.skill, tool.skillFloor);
    const dataScore = dataFit(profile.dataSensitivity, tool.dataHandling);
    const teamScore = teamFitScore(profile.teamSize, tool.teamFit);

    const weighted =
      budgetScore * SCORING_WEIGHTS.budget +
      skillScore * SCORING_WEIGHTS.skill +
      dataScore * SCORING_WEIGHTS.data +
      teamScore * SCORING_WEIGHTS.team;

    return {
      ...tool,
      score: Math.round(weighted * 100),
      breakdown: {
        budget: Math.round(budgetScore * 100),
        skill: Math.round(skillScore * 100),
        data: Math.round(dataScore * 100),
        team: Math.round(teamScore * 100),
      },
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Best-effort category matcher: the AI returns free-text tool categories
 * per stage (e.g. "video editing", "writing assistant"). We map that text
 * to the closest known category key via keyword overlap, so the scoring
 * engine can attach itself to AI-generated stages without the AI needing
 * to know our internal taxonomy.
 */
function matchCategory(freeText, categoryLabels) {
  const text = freeText.toLowerCase();
  const keywordMap = {
    writing: ["writ", "copy", "content", "blog", "caption", "script"],
    image: ["image", "graphic", "photo", "illustrat", "design", "visual"],
    video: ["video", "edit", "avatar", "clip"],
    audio: ["audio", "voice", "podcast", "sound", "transcri"],
    coding: ["code", "dev", "program", "engineer", "build app", "software"],
    data: ["data", "analysis", "spreadsheet", "chart", "analytics"],
    automation: ["automat", "workflow", "integrat", "zap", "no-code", "no code"],
    research: ["research", "search", "citation", "literature", "sourc"],
    presentation: ["presentation", "deck", "slide", "document", "doc"],
    productivity: ["schedul", "task", "calendar", "time manage", "productiv"],
    support: ["support", "ticket", "customer service", "helpdesk"],
    meetings: ["meeting", "transcript", "call notes", "minutes"],
    sales: ["sales", "crm", "lead", "pipeline"],
    seo: ["seo", "search engine", "keyword", "ranking"],
  };
  let best = null;
  let bestHits = 0;
  for (const [key, words] of Object.entries(keywordMap)) {
    const hits = words.filter((w) => text.includes(w)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = key;
    }
  }
  return bestHits > 0 ? best : null;
}

if (typeof module !== "undefined") {
  module.exports = { scoreToolsForCategory, matchCategory, SCORING_WEIGHTS };
}

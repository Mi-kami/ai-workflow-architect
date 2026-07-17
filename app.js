/* =========================================================================
   AI Workflow Architect — app.js
   Handles: screen flow, API orchestration (clarify -> generate), rendering
   the generated workflow, wiring the scoring engine to each stage, and
   persisting progress/notes/bookmarks/theme to localStorage.
   ========================================================================= */

const API_ENDPOINT = "/.netlify/functions/generate-workflow";
const STORAGE_KEY = "awa_state_v1";

const LOADING_MESSAGES_CLARIFY = [
  "Reading through what you shared…",
  "Working out what's still unclear…",
];
const LOADING_MESSAGES_GENERATE = [
  "Mapping stages from planning to execution…",
  "Matching tools to each stage…",
  "Scoring tools against your profile…",
  "Drafting prompt examples…",
];

const SECTION_DEFS = [
  { key: "tasks", label: "Tasks" },
  { key: "tools", label: "Tool recommendations" },
  { key: "prompt", label: "Prompt examples" },
  { key: "practices", label: "Best practices & mistakes" },
  { key: "output", label: "Expected output" },
  { key: "meta", label: "Time estimate & tips" },
];

let state = {
  description: "",
  clarifyAnswers: [],
  profile: null,
  workflow: null,
  completed: {},
  notes: {},
  bookmarks: {},
  sectionToggles: Object.fromEntries(SECTION_DEFS.map((s) => [s.key, true])),
  theme: "dark",
};

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  applyTheme();
  wireStaticControls();

  if (state.workflow) {
    renderWorkflow(state.workflow, false);
    showScreen("screen-workflow");
    document.getElementById("startOverBtn").style.display = "flex";
  }
});

function wireStaticControls() {
  document.getElementById("themeToggle").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
    saveState();
  });

  document.getElementById("startOverBtn").addEventListener("click", () => {
    if (!confirm("Start a new workflow? This clears your current progress, notes, and bookmarks.")) return;
    state = {
      description: "", clarifyAnswers: [], profile: null, workflow: null,
      completed: {}, notes: {}, bookmarks: {},
      sectionToggles: Object.fromEntries(SECTION_DEFS.map((s) => [s.key, true])),
      theme: state.theme,
    };
    saveState();
    document.getElementById("descriptionInput").value = "";
    document.getElementById("startOverBtn").style.display = "none";
    showScreen("screen-intake");
  });

  document.getElementById("submitDescription").addEventListener("click", handleSubmitDescription);
  document.getElementById("submitClarify").addEventListener("click", handleSubmitClarify);
  document.getElementById("retryBtn").addEventListener("click", () => showScreen("screen-intake"));

  document.getElementById("toggleSectionsBtn").addEventListener("click", () => {
    document.getElementById("togglesPanel").classList.toggle("open");
  });
  document.getElementById("expandAllBtn").addEventListener("click", toggleExpandAll);
  document.getElementById("printBtn").addEventListener("click", () => window.print());
}

function applyTheme() {
  document.body.classList.toggle("light", state.theme === "light");
}

// ---------------------------------------------------------------------------
// Screen management
// ---------------------------------------------------------------------------

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setLoading(messages) {
  let i = 0;
  const el = document.getElementById("loadingText");
  el.textContent = messages[0];
  showScreen("screen-loading");
  const interval = setInterval(() => {
    i = (i + 1) % messages.length;
    el.textContent = messages[i];
  }, 1600);
  return () => clearInterval(interval);
}

function showError(message) {
  document.getElementById("errorText").textContent = message;
  showScreen("screen-error");
}

// ---------------------------------------------------------------------------
// Step 1: description -> clarifying questions
// ---------------------------------------------------------------------------

async function handleSubmitDescription() {
  const val = document.getElementById("descriptionInput").value.trim();
  if (val.length < 12) {
    alert("Add a bit more detail about what you do — a sentence or two is enough.");
    return;
  }
  state.description = val;
  const stopLoading = setLoading(LOADING_MESSAGES_CLARIFY);

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "clarify", description: val }),
    });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();
    stopLoading();
    renderClarifyQuestions(data.questions || []);
    showScreen("screen-clarify");
  } catch (err) {
    stopLoading();
    showError(
      "Couldn't reach the AI service to generate clarifying questions. " +
      "Check that GROQ_API_KEY and/or GEMINI_API_KEY are set in your Netlify environment variables, then try again.\n\n" +
      String(err.message || err)
    );
  }
}

function renderClarifyQuestions(questions) {
  const container = document.getElementById("clarifyQuestions");
  container.innerHTML = "";
  questions.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "clarify-q";
    div.innerHTML = `
      <label><span class="q-index">Q${i + 1}</span>${escapeHtml(q.question)}</label>
      <input type="text" class="clarify-answer" data-qid="${q.id}" data-question="${escapeHtml(q.question)}" placeholder="Your answer…" />
    `;
    container.appendChild(div);
  });
}

// ---------------------------------------------------------------------------
// Step 2: clarifying answers + profile -> full workflow
// ---------------------------------------------------------------------------

async function handleSubmitClarify() {
  const answerInputs = document.querySelectorAll(".clarify-answer");
  const answers = Array.from(answerInputs).map((inp) => ({
    question: inp.dataset.question,
    answer: inp.value.trim() || "Not specified",
  }));

  const profile = {
    budget: Number(document.getElementById("profileBudget").value),
    skill: Number(document.getElementById("profileSkill").value),
    teamSize: document.getElementById("profileTeam").value,
    dataSensitivity: Number(document.getElementById("profileData").value),
  };

  state.clarifyAnswers = answers;
  state.profile = profile;

  const stopLoading = setLoading(LOADING_MESSAGES_GENERATE);

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "generate",
        description: state.description,
        answers,
        profile,
      }),
    });
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const data = await res.json();
    stopLoading();
    state.workflow = data;
    state.completed = {};
    state.notes = {};
    state.bookmarks = {};
    saveState();
    renderWorkflow(data, true);
    document.getElementById("startOverBtn").style.display = "flex";
    showScreen("screen-workflow");
  } catch (err) {
    stopLoading();
    showError(
      "Couldn't reach the AI service to generate the workflow. " +
      "Check your Netlify environment variables and function logs, then try again.\n\n" +
      String(err.message || err)
    );
  }
}

// ---------------------------------------------------------------------------
// Rendering: full workflow
// ---------------------------------------------------------------------------

function renderWorkflow(data, firstOpenOnly) {
  document.getElementById("workflowTitle").textContent = data.title || "Your workflow";
  document.getElementById("workflowOverview").textContent = data.overview || "";

  renderDiagram(data.stages || []);
  renderStages(data.stages || [], firstOpenOnly);
  renderTogglesPanel();
  renderSummary(data);
  updateProgress();
}

function renderDiagram(stages) {
  const track = document.getElementById("stageDiagram");
  track.innerHTML = "";
  stages.forEach((stage, i) => {
    const node = document.createElement("div");
    node.className = "diagram-node" + (state.completed[i] ? " done" : "");
    node.innerHTML = `<div class="node-dot">${i + 1}</div><div class="node-label">${escapeHtml(stage.name)}</div>`;
    node.addEventListener("click", () => {
      const card = document.getElementById(`stage-${i}`);
      if (card) {
        card.classList.add("open");
        card.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    track.appendChild(node);
    if (i < stages.length - 1) {
      const connector = document.createElement("div");
      connector.className = "diagram-connector";
      track.appendChild(connector);
    }
  });
}

function renderStages(stages, firstOpenOnly) {
  const container = document.getElementById("stagesContainer");
  container.innerHTML = "";
  stages.forEach((stage, i) => {
    container.appendChild(buildStageCard(stage, i, firstOpenOnly && i === 0));
  });
}

function buildStageCard(stage, i, openByDefault) {
  const card = document.createElement("div");
  card.className = "stage-card" + (openByDefault ? " open" : "");
  card.id = `stage-${i}`;

  const isDone = !!state.completed[i];
  const isBookmarked = !!state.bookmarks[i];
  const noteVal = state.notes[i] || "";

  card.innerHTML = `
    <div class="stage-card-head">
      <div class="stage-num">${String(i + 1).padStart(2, "0")}</div>
      <div class="stage-check ${isDone ? "checked" : ""}" data-role="check" title="Mark complete"></div>
      <div class="stage-title-wrap">
        <div class="stage-title">${escapeHtml(stage.name)}</div>
        <div class="stage-meta">${escapeHtml(stage.objective || "")}</div>
      </div>
      <button class="bookmark-btn ${isBookmarked ? "active" : ""}" data-role="bookmark" title="Bookmark this stage">
        <svg viewBox="0 0 24 24" fill="${isBookmarked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      </button>
      <div class="stage-chevron">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>
    <div class="stage-card-body">
      <div class="stage-card-inner">

        <div class="stage-section sec-tasks">
          <div class="stage-section-label">Tasks</div>
          <ul class="task-list">${(stage.tasks || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
        </div>

        <div class="stage-section sec-tools">
          <div class="stage-section-label">Recommended tools</div>
          <div class="tag-list" style="margin-bottom:10px;">
            ${(stage.suggestedTools || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
          </div>
          <p style="font-size:13.5px; color:var(--ink-muted); margin-bottom:12px;">${escapeHtml(stage.whyTheseTools || "")}</p>
          ${buildScoringPanel(stage, i)}
        </div>

        <div class="stage-section sec-prompt">
          <div class="stage-section-label">Prompt example</div>
          <div class="prompt-box">
            <button class="copy-btn" data-role="copy-prompt">Copy</button>
            <span data-role="prompt-text">${escapeHtml(stage.promptExample || "")}</span>
          </div>
        </div>

        <div class="stage-section sec-practices">
          <div class="stage-section-label">Best practices</div>
          <ul class="practice-list good">${(stage.bestPractices || []).map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
          <div class="stage-section-label" style="margin-top:16px;">Common mistakes</div>
          <ul class="practice-list mistakes">${(stage.commonMistakes || []).map((m) => `<li>${escapeHtml(m)}</li>`).join("")}</ul>
        </div>

        <div class="stage-section sec-output">
          <div class="stage-section-label">Expected output</div>
          <p style="font-size:14px; color:var(--ink-muted);">${escapeHtml(stage.expectedOutput || "")}</p>
        </div>

        <div class="stage-section sec-meta">
          <div class="stage-section-label">At a glance</div>
          <div class="meta-row">
            <div class="meta-item"><strong>Time:</strong> ${escapeHtml(stage.timeEstimate || "—")}</div>
            <div class="meta-item"><strong>Efficiency tip:</strong> ${escapeHtml(stage.efficiencyTip || "—")}</div>
          </div>
        </div>

        <div class="stage-section">
          <div class="stage-section-label">Notes</div>
          <textarea class="notes-area" data-role="notes" placeholder="Jot anything down for this stage…">${escapeHtml(noteVal)}</textarea>
        </div>

      </div>
    </div>
  `;

  card.querySelector(".stage-card-head").addEventListener("click", (e) => {
    if (e.target.closest('[data-role="bookmark"]')) return;
    card.classList.toggle("open");
  });

  card.querySelector('[data-role="check"]').addEventListener("click", (e) => {
    e.stopPropagation();
    state.completed[i] = !state.completed[i];
    saveState();
    e.currentTarget.classList.toggle("checked");
    updateProgress();
    renderDiagram(state.workflow.stages);
  });

  card.querySelector('[data-role="bookmark"]').addEventListener("click", (e) => {
    e.stopPropagation();
    state.bookmarks[i] = !state.bookmarks[i];
    saveState();
    e.currentTarget.classList.toggle("active");
    const svg = e.currentTarget.querySelector("svg");
    svg.setAttribute("fill", state.bookmarks[i] ? "currentColor" : "none");
  });

  const notesArea = card.querySelector('[data-role="notes"]');
  let noteTimer;
  notesArea.addEventListener("input", () => {
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      state.notes[i] = notesArea.value;
      saveState();
    }, 400);
  });

  const copyBtn = card.querySelector('[data-role="copy-prompt"]');
  copyBtn.addEventListener("click", () => {
    const text = card.querySelector('[data-role="prompt-text"]').textContent;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1400);
    });
  });

  return card;
}

// ---------------------------------------------------------------------------
// Scoring engine integration
// ---------------------------------------------------------------------------

function buildScoringPanel(stage, stageIndex) {
  const category = matchCategory(stage.toolCategory || stage.name || "", CATEGORY_LABELS);
  if (!category || !state.profile) {
    return `<div class="scoring-panel"><div class="scoring-explain open" style="margin:0;">No scoring match for this stage's tool category — the suggested tools above come straight from the AI's recommendation.</div></div>`;
  }

  const ranked = scoreToolsForCategory(category, state.profile, TOOLS_DB).slice(0, 4);
  if (ranked.length === 0) {
    return `<div class="scoring-panel"><div class="scoring-explain open" style="margin:0;">No tools in this category's reference table yet.</div></div>`;
  }

  const rows = ranked.map((t, idx) => `
    <div class="tool-rank-row">
      <div class="tool-rank-pos">#${idx + 1}</div>
      <div>
        <div class="tool-rank-name">${escapeHtml(t.name)}</div>
        <div class="tool-rank-blurb">${escapeHtml(t.blurb)}</div>
        <div class="score-bar-track"><div class="score-bar-fill" style="width:${t.score}%;"></div></div>
        <div class="breakdown-row">
          <span class="breakdown-chip">budget fit <b>${t.breakdown.budget}</b></span>
          <span class="breakdown-chip">skill fit <b>${t.breakdown.skill}</b></span>
          <span class="breakdown-chip">data handling <b>${t.breakdown.data}</b></span>
          <span class="breakdown-chip">team fit <b>${t.breakdown.team}</b></span>
        </div>
      </div>
      <div class="tool-rank-score">${t.score}</div>
    </div>
  `).join("");

  return `
    <div class="scoring-panel">
      <div class="scoring-head" data-role="scoring-toggle">
        <span class="scoring-head-title">SCORED FOR YOUR PROFILE — ${escapeHtml(CATEGORY_LABELS[category] || category).toUpperCase()}</span>
        <span class="mono" style="font-size:11px; color:var(--ink-muted);">why?</span>
      </div>
      <div class="scoring-explain" data-role="scoring-explain">
        Each tool is scored 0-100 as a weighted sum across four criteria matched to your quick profile: budget fit (30%), skill fit (30%), data handling (25%), team fit (15%). This is a deterministic calculation against a maintained reference table — not an AI guess — so you can see exactly why a tool ranks where it does.
      </div>
      <div class="tool-rank">${rows}</div>
    </div>
  `;
}

// Wire up scoring "why?" toggles after render (event delegation on container)
document.addEventListener("click", (e) => {
  const head = e.target.closest('[data-role="scoring-toggle"]');
  if (head) {
    const explain = head.parentElement.querySelector('[data-role="scoring-explain"]');
    explain.classList.toggle("open");
  }
});

// ---------------------------------------------------------------------------
// Section toggles (customize which sections show)
// ---------------------------------------------------------------------------

function renderTogglesPanel() {
  const panel = document.getElementById("togglesPanel");
  panel.innerHTML = SECTION_DEFS.map((s) => `
    <label class="toggle-item">
      <input type="checkbox" data-section="${s.key}" ${state.sectionToggles[s.key] ? "checked" : ""} />
      ${s.label}
    </label>
  `).join("");

  panel.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      state.sectionToggles[cb.dataset.section] = cb.checked;
      applySectionToggles();
      saveState();
    });
  });
  applySectionToggles();
}

function applySectionToggles() {
  const map = {
    tasks: ".sec-tasks", tools: ".sec-tools", prompt: ".sec-prompt",
    practices: ".sec-practices", output: ".sec-output", meta: ".sec-meta",
  };
  Object.entries(map).forEach(([key, selector]) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.style.display = state.sectionToggles[key] ? "" : "none";
    });
  });
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

function updateProgress() {
  const total = (state.workflow?.stages || []).length;
  const done = Object.values(state.completed).filter(Boolean).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressLabel").textContent = `${done} / ${total} stages complete`;
}

function toggleExpandAll() {
  const cards = document.querySelectorAll(".stage-card");
  const anyClosed = Array.from(cards).some((c) => !c.classList.contains("open"));
  cards.forEach((c) => c.classList.toggle("open", anyClosed));
  document.getElementById("expandAllBtn").textContent = anyClosed ? "Collapse all" : "Expand all";
}

// ---------------------------------------------------------------------------
// Summary / conclusion sections
// ---------------------------------------------------------------------------

function renderSummary(data) {
  const el = document.getElementById("summarySection");
  const cards = [
    { title: "Workflow Summary", idx: "A", type: "p", content: data.summary },
    { title: "Recommended AI Stack", idx: "B", type: "list", content: data.recommendedStack },
    { title: "Learning Resources", idx: "C", type: "list", content: data.learningResources },
    { title: "Communities", idx: "D", type: "list", content: data.communities },
    { title: "Search Keywords", idx: "E", type: "tags", content: data.searchKeywords },
    { title: "Additional AI Prompts", idx: "F", type: "list", content: data.additionalPrompts },
    { title: "Future Automation Opportunities", idx: "G", type: "list", content: data.futureAutomation },
  ];

  el.innerHTML = `
    <div class="section-heading">Wrapping up</div>
    <div class="section-sub">Everything below rounds out the workflow — save it, revisit it, act on it.</div>
    <div class="summary-grid">
      ${cards.map((c) => `
        <div class="summary-card">
          <h3><span class="idx">${c.idx}</span> ${escapeHtml(c.title)}</h3>
          ${renderCardContent(c)}
        </div>
      `).join("")}
    </div>
  `;
}

function renderCardContent(c) {
  if (!c.content) return `<p>—</p>`;
  if (c.type === "p") return `<p>${escapeHtml(c.content)}</p>`;
  if (c.type === "tags") {
    return `<div class="tag-list">${c.content.map((k) => `<span class="tag">${escapeHtml(k)}</span>`).join("")}</div>`;
  }
  return `<ul>${c.content.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Could not save state to localStorage", e);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
    }
  } catch (e) {
    console.warn("Could not load saved state", e);
  }
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

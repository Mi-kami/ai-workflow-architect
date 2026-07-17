# AI Workflow Architect

Describe what you do, in your own words. The app asks 2-3 clarifying questions,
then generates a complete, tailored, end-to-end AI-augmented workflow for
your exact situation — stage by stage, from planning to execution.

Built for Day 41 of the 60-Day Claude AI Mastery Challenge.

## What makes this more than a content generator

Most "AI workflow" tools are static advice dressed up in a nice UI. This one
has two real moving parts:

1. **Live generation.** Nothing is pre-written. Your description and answers
   go to Groq (primary) or Gemini (automatic fallback) at request time, so
   the workflow is actually built around what you typed — not picked from
   a template library.

2. **A deterministic scoring engine** (`scoring.js`). Tool recommendations
   aren't just AI opinion — every tool suggested for a stage gets scored
   0-100 against your budget, technical skill, team size, and data
   sensitivity using a weighted multi-criteria model (the same class of
   method used for vendor-selection scoring). The math is visible in the UI
   ("why?" toggle on every tool ranking), so it's auditable, not a black box.
   This part runs entirely client-side against `tools-data.js`, a maintained
   reference table — no API call, no hallucination risk.

If the AI generation step ever fails outright, the app still shows a clear
error state with a retry rather than crashing silently — informed by a few
sandbox API failures earlier in this challenge.

## File structure

```
index.html                          shell + all screens
style.css                           blueprint/technical-drafting design system
app.js                              screen flow, rendering, persistence
tools-data.js                       curated AI tool reference table
scoring.js                          weighted multi-criteria scoring engine
netlify/functions/generate-workflow.js   serverless function (Groq -> Gemini fallback)
netlify.toml                        Netlify build config (NODE_VERSION=20 for native fetch)
.env.example                        env var names to set in Netlify
```

## Deploy

1. Push this folder to a GitHub repo (or drag-and-drop deploy on Netlify).
2. In Netlify: Site settings → Environment variables → add `GROQ_API_KEY`
   and `GEMINI_API_KEY` (get a free Groq key at console.groq.com, a free
   Gemini key at aistudio.google.com).
3. Deploy. No build command needed — it's static files + one function.

## How the fallback works

The serverless function tries Groq first (fast, generous free tier). If
that call errors, times out (20s), or the key is missing, it automatically
retries the same request against Gemini. Both providers are asked to return
strict JSON directly (`response_format: json_object` / `responseMimeType:
application/json`), with a fallback markdown-fence strip in case a model
ignores that instruction.

## Extending the tool database

`tools-data.js` currently covers 14 categories (~45 tools). To add a tool,
add an entry with `costTier`, `skillFloor`, `dataHandling` (all 1-5) and
`teamFit` (array of `"solo"`/`"small"`/`"large"`) — the scoring engine picks
it up automatically for its category.

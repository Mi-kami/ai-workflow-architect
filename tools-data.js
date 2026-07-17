/* =========================================================================
   TOOLS DATABASE
   Each tool is rated on four axes, all on a 1–5 scale:
     costTier          1 = free/near-free   5 = expensive / enterprise
     skillFloor        1 = zero-setup, GUI  5 = needs technical/coding skill
     dataHandling      1 = public data only 5 = enterprise-grade, on-prem/DPA options
     teamFit           which team sizes it's genuinely built for
   These ratings feed scoring.js — nothing here is AI-generated, it's a
   maintained reference table, same as you'd keep for a vendor comparison.
   ========================================================================= */

const TOOLS_DB = [
  // ---- Writing / Content ----
  { id: "chatgpt", name: "ChatGPT (GPT-5.x)", category: "writing", costTier: 2, skillFloor: 1, dataHandling: 3, teamFit: ["solo","small","large"], blurb: "General-purpose writing and ideation, fastest to start with, huge plugin/GPT ecosystem." },
  { id: "claude", name: "Claude", category: "writing", costTier: 2, skillFloor: 1, dataHandling: 4, teamFit: ["solo","small","large"], blurb: "Strongest at long-form structure, nuance, and following detailed style instructions." },
  { id: "jasper", name: "Jasper", category: "writing", costTier: 4, skillFloor: 2, dataHandling: 3, teamFit: ["small","large"], blurb: "Built for marketing teams needing brand-voice consistency across many writers." },
  { id: "copyai", name: "Copy.ai", category: "writing", costTier: 2, skillFloor: 1, dataHandling: 2, teamFit: ["solo","small"], blurb: "Templated short-form copy (ads, captions) for fast output with little setup." },
  { id: "grammarly", name: "Grammarly", category: "writing", costTier: 2, skillFloor: 1, dataHandling: 3, teamFit: ["solo","small","large"], blurb: "Editing layer that catches tone/clarity issues after a draft already exists." },

  // ---- Image ----
  { id: "midjourney", name: "Midjourney", category: "image", costTier: 2, skillFloor: 2, dataHandling: 2, teamFit: ["solo","small"], blurb: "Best raw aesthetic quality for concept art, mood boards, illustrative work." },
  { id: "gptimage", name: "GPT Image", category: "image", costTier: 2, skillFloor: 1, dataHandling: 3, teamFit: ["solo","small","large"], blurb: "Strong prompt-following and text-in-image accuracy, easiest to iterate conversationally." },
  { id: "canva-magic", name: "Canva Magic Studio", category: "image", costTier: 1, skillFloor: 1, dataHandling: 2, teamFit: ["solo","small"], blurb: "Fastest path from idea to a finished, on-brand graphic with zero design skill." },
  { id: "figma-ai", name: "Figma AI", category: "image", costTier: 3, skillFloor: 3, dataHandling: 3, teamFit: ["small","large"], blurb: "Generates and edits inside real design files, best when output feeds a design system." },

  // ---- Video ----
  { id: "runway", name: "Runway", category: "video", costTier: 3, skillFloor: 2, dataHandling: 2, teamFit: ["solo","small"], blurb: "Most flexible generative video editing (green screen, motion brush, gen-to-video)." },
  { id: "heygen", name: "HeyGen", category: "video", costTier: 3, skillFloor: 1, dataHandling: 3, teamFit: ["solo","small","large"], blurb: "Talking-avatar videos from a script, fastest way to produce explainer/training video." },
  { id: "synthesia", name: "Synthesia", category: "video", costTier: 4, skillFloor: 1, dataHandling: 4, teamFit: ["small","large"], blurb: "Enterprise-grade avatar video with brand kits, multi-language, admin controls." },
  { id: "capcut", name: "CapCut", category: "video", costTier: 1, skillFloor: 1, dataHandling: 2, teamFit: ["solo","small"], blurb: "Free auto-captioning and editing, best for short-form social video." },

  // ---- Audio / Voice ----
  { id: "elevenlabs", name: "ElevenLabs", category: "audio", costTier: 2, skillFloor: 1, dataHandling: 3, teamFit: ["solo","small","large"], blurb: "Highest quality voice cloning/TTS, used for voiceover and dubbing." },
  { id: "descript", name: "Descript", category: "audio", costTier: 2, skillFloor: 1, dataHandling: 3, teamFit: ["solo","small"], blurb: "Edit audio/video by editing a transcript, best for podcast and interview cleanup." },

  // ---- Coding / Dev ----
  { id: "copilot", name: "GitHub Copilot", category: "coding", costTier: 2, skillFloor: 3, dataHandling: 3, teamFit: ["solo","small","large"], blurb: "In-editor autocomplete, lowest friction way to speed up code you already understand." },
  { id: "cursor", name: "Cursor", category: "coding", costTier: 2, skillFloor: 3, dataHandling: 3, teamFit: ["solo","small"], blurb: "AI-native editor for larger multi-file changes and codebase-aware refactors." },
  { id: "claude-code", name: "Claude Code", category: "coding", costTier: 3, skillFloor: 3, dataHandling: 4, teamFit: ["solo","small","large"], blurb: "Agentic terminal coding for end-to-end tasks: build, test, debug, ship." },
  { id: "v0", name: "v0", category: "coding", costTier: 2, skillFloor: 2, dataHandling: 2, teamFit: ["solo","small"], blurb: "Generates working UI components from a text description, fastest prototype-to-code." },

  // ---- Data / Analysis ----
  { id: "code-interpreter", name: "ChatGPT Data Analysis", category: "data", costTier: 2, skillFloor: 1, dataHandling: 2, teamFit: ["solo","small"], blurb: "Upload a spreadsheet, get charts and analysis conversationally, no code needed." },
  { id: "julius", name: "Julius AI", category: "data", costTier: 2, skillFloor: 1, dataHandling: 2, teamFit: ["solo","small"], blurb: "Purpose-built for conversational data analysis and chart generation." },
  { id: "excel-copilot", name: "Copilot in Excel", category: "data", costTier: 3, skillFloor: 1, dataHandling: 4, teamFit: ["small","large"], blurb: "Formula help and analysis directly inside spreadsheets people already use at work." },

  // ---- Automation / No-code ----
  { id: "zapier", name: "Zapier", category: "automation", costTier: 3, skillFloor: 1, dataHandling: 3, teamFit: ["solo","small","large"], blurb: "Largest app library, easiest way to connect two tools without writing code." },
  { id: "make", name: "Make", category: "automation", costTier: 2, skillFloor: 2, dataHandling: 3, teamFit: ["solo","small"], blurb: "Visual, branching automations for more complex logic than Zapier handles cleanly." },
  { id: "n8n", name: "n8n", category: "automation", costTier: 1, skillFloor: 4, dataHandling: 5, teamFit: ["small","large"], blurb: "Self-hostable, full control over data residency, needs technical setup." },

  // ---- Research ----
  { id: "perplexity", name: "Perplexity", category: "research", costTier: 2, skillFloor: 1, dataHandling: 2, teamFit: ["solo","small","large"], blurb: "Cited, current-web answers, fastest way to research a topic with sources attached." },
  { id: "elicit", name: "Elicit", category: "research", costTier: 2, skillFloor: 2, dataHandling: 2, teamFit: ["solo","small"], blurb: "Built for academic literature review, extracts findings across many papers at once." },
  { id: "notebooklm", name: "NotebookLM", category: "research", costTier: 1, skillFloor: 1, dataHandling: 3, teamFit: ["solo","small"], blurb: "Grounds answers only in documents you upload, good for source-locked research." },

  // ---- Presentations / Docs ----
  { id: "gamma", name: "Gamma", category: "presentation", costTier: 2, skillFloor: 1, dataHandling: 2, teamFit: ["solo","small"], blurb: "Text-to-deck in minutes with decent default design, fastest first draft." },
  { id: "notion-ai", name: "Notion AI", category: "presentation", costTier: 2, skillFloor: 1, dataHandling: 3, teamFit: ["solo","small","large"], blurb: "Writing and summarizing inside docs a team already lives in." },

  // ---- Project / Task Management ----
  { id: "motion", name: "Motion", category: "productivity", costTier: 3, skillFloor: 1, dataHandling: 3, teamFit: ["solo","small"], blurb: "Auto-schedules your tasks around your calendar, good for solo operators drowning in to-dos." },
  { id: "clickup-ai", name: "ClickUp AI", category: "productivity", costTier: 3, skillFloor: 2, dataHandling: 3, teamFit: ["small","large"], blurb: "AI layered on a full project-management suite, good when the team already lives there." },
  { id: "reclaim", name: "Reclaim.ai", category: "productivity", costTier: 2, skillFloor: 1, dataHandling: 3, teamFit: ["solo","small"], blurb: "Calendar-focused scheduling automation, lighter than Motion." },

  // ---- Customer Support ----
  { id: "intercom-fin", name: "Intercom Fin", category: "support", costTier: 4, skillFloor: 2, dataHandling: 4, teamFit: ["small","large"], blurb: "Resolves support tickets autonomously against your help docs, enterprise-ready." },
  { id: "zendesk-ai", name: "Zendesk AI", category: "support", costTier: 4, skillFloor: 2, dataHandling: 4, teamFit: ["small","large"], blurb: "AI triage and drafting layered on a support suite teams already use." },

  // ---- Meetings / Transcription ----
  { id: "otter", name: "Otter.ai", category: "meetings", costTier: 1, skillFloor: 1, dataHandling: 3, teamFit: ["solo","small","large"], blurb: "Live transcription and meeting summaries, easiest entry point." },
  { id: "fireflies", name: "Fireflies.ai", category: "meetings", costTier: 2, skillFloor: 1, dataHandling: 3, teamFit: ["small","large"], blurb: "Records across most video platforms and pushes notes into your CRM/PM tool." },

  // ---- Sales / CRM ----
  { id: "hubspot-ai", name: "HubSpot AI", category: "sales", costTier: 3, skillFloor: 2, dataHandling: 4, teamFit: ["small","large"], blurb: "AI drafting and lead scoring built into a CRM many small teams already run on." },
  { id: "einstein", name: "Salesforce Einstein", category: "sales", costTier: 5, skillFloor: 4, dataHandling: 5, teamFit: ["large"], blurb: "Deep enterprise CRM AI, overkill unless you're already on Salesforce." },

  // ---- SEO / Marketing Ops ----
  { id: "surfer", name: "Surfer SEO", category: "seo", costTier: 3, skillFloor: 2, dataHandling: 2, teamFit: ["solo","small"], blurb: "Content-to-SERP scoring, best for teams publishing search-driven content regularly." },
  { id: "semrush-ai", name: "Semrush AI", category: "seo", costTier: 4, skillFloor: 3, dataHandling: 3, teamFit: ["small","large"], blurb: "Full-suite SEO/competitive research with AI layered across it." },
];

const CATEGORY_LABELS = {
  writing: "Writing & Content",
  image: "Image Generation",
  video: "Video",
  audio: "Audio & Voice",
  coding: "Coding & Development",
  data: "Data & Analysis",
  automation: "Automation & No-code",
  research: "Research",
  presentation: "Presentations & Docs",
  productivity: "Task & Time Management",
  support: "Customer Support",
  meetings: "Meetings & Transcription",
  sales: "Sales & CRM",
  seo: "SEO & Marketing Ops",
};

if (typeof module !== "undefined") module.exports = { TOOLS_DB, CATEGORY_LABELS };

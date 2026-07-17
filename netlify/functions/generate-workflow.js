/* =========================================================================
   generate-workflow.js
   Netlify serverless function. Keeps GROQ_API_KEY / GEMINI_API_KEY server
   side (set them in Netlify: Site settings → Environment variables).

   Strategy: try Groq first (fast, generous free tier), fall back to
   Gemini automatically if Groq errors, times out, or rate-limits.

   Two modes, sent in the request body as { mode, ...payload }:
     mode: "clarify"  -> returns 2-3 short clarifying questions
     mode: "generate" -> returns the full structured workflow JSON
   ========================================================================= */

const GROQ_MODEL = "openai/gpt-oss-120b"; // current Groq flagship general model, July 2026
const GEMINI_MODEL = "gemini-2.5-flash";  // current stable Gemini fast model, July 2026

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { mode } = body;
  if (mode !== "clarify" && mode !== "generate") {
    return { statusCode: 400, body: JSON.stringify({ error: "mode must be 'clarify' or 'generate'" }) };
  }

  const { systemPrompt, userPrompt } = buildPrompts(mode, body);

  try {
    const raw = await callWithFallback(systemPrompt, userPrompt);
    const parsed = safeParseJson(raw);
    if (!parsed) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "AI response could not be parsed as JSON", raw }),
      };
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Both Groq and Gemini failed", detail: String(err) }),
    };
  }
};

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function buildPrompts(mode, body) {
  if (mode === "clarify") {
    const { description } = body;
    const systemPrompt = `You are a workflow-design analyst. A user will describe what they do for work in their own words. Your only job is to ask 2 to 3 short clarifying questions that would let you build them a genuinely tailored, end-to-end AI-augmented workflow afterward — not generic advice.

Ask about things like: the specific outcome/objective they want, team size, technical comfort level, budget appetite, or how sensitive their data is — whichever 2-3 matter most given what they described. Do not ask more than 3.

Respond with ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{"questions": [{"id": "q1", "question": "..."}, {"id": "q2", "question": "..."}, {"id": "q3", "question": "..."}]}`;
    const userPrompt = `Here's what I do: ${description}`;
    return { systemPrompt, userPrompt };
  }

  // mode === "generate"
  const { description, answers, profile } = body;
  const answersText = (answers || [])
    .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");

  const systemPrompt = `You are a senior workflow architect and AI-adoption strategist. Given a user's description of their work and answers to clarifying questions, design a complete, end-to-end, realistic workflow broken into logical stages from planning to execution — specific to THEIR situation, not generic industry advice.

Respond with ONLY valid JSON, no markdown fences, no preamble, in exactly this shape:

{
  "title": "short workflow title specific to their work",
  "overview": "2-3 sentence framing of what this workflow accomplishes and for whom",
  "stages": [
    {
      "name": "stage name",
      "objective": "what this stage accomplishes",
      "tasks": ["task 1", "task 2", "task 3"],
      "toolCategory": "one short free-text category label like 'writing' or 'video editing' or 'data analysis' describing the KIND of AI tool this stage needs",
      "suggestedTools": ["tool name 1", "tool name 2"],
      "whyTheseTools": "1-2 sentences on why this class of tool fits this stage",
      "promptExample": "one realistic example prompt someone would type into an AI tool for this stage",
      "bestPractices": ["practice 1", "practice 2"],
      "commonMistakes": ["mistake 1", "mistake 2"],
      "expectedOutput": "what a finished output from this stage looks like",
      "timeEstimate": "e.g. '30-45 minutes' or '1-2 days'",
      "efficiencyTip": "one concrete tip to move faster at this stage"
    }
  ],
  "summary": "3-4 sentence wrap-up of the whole workflow",
  "recommendedStack": ["tool 1", "tool 2", "tool 3", "tool 4"],
  "learningResources": ["resource 1 with brief context", "resource 2 with brief context"],
  "communities": ["community 1", "community 2"],
  "searchKeywords": ["keyword phrase 1", "keyword phrase 2", "keyword phrase 3"],
  "additionalPrompts": ["bonus prompt 1", "bonus prompt 2"],
  "futureAutomation": ["automation opportunity 1", "automation opportunity 2"]
}

Produce 4 to 7 stages depending on the real complexity of what they described. Be concrete and specific to their actual situation, never generic filler. Every array needs at least 2 items unless noted otherwise.`;

  const userPrompt = `What I do: ${description}

Clarifying answers:
${answersText}

User profile — budget appetite: ${profile?.budget || "unspecified"}/5, technical skill: ${profile?.skill || "unspecified"}/5, team size: ${profile?.teamSize || "unspecified"}, data sensitivity: ${profile?.dataSensitivity || "unspecified"}/5.

Build the full workflow JSON now.`;

  return { systemPrompt, userPrompt };
}

// ---------------------------------------------------------------------------
// Provider calls with fallback
// ---------------------------------------------------------------------------

async function callWithFallback(systemPrompt, userPrompt) {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (groqKey) {
    try {
      return await callGroq(systemPrompt, userPrompt, groqKey);
    } catch (err) {
      console.error("Groq failed, falling back to Gemini:", err.message);
    }
  }

  if (geminiKey) {
    return await callGemini(systemPrompt, userPrompt, geminiKey);
  }

  throw new Error("No API keys configured and/or both providers failed");
}

async function callGroq(systemPrompt, userPrompt, apiKey) {
  const res = await fetchWithTimeout(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  }, 20000);

  if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned no content");
  return text;
}

async function callGemini(systemPrompt, userPrompt, apiKey) {
  const res = await fetchWithTimeout(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    }),
  }, 20000);

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return text;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Strip accidental markdown fences and retry once
    const cleaned = text.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

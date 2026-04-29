#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const TARGET = path.join(
  REPO_ROOT,
  "apps/app/src/lib/icebreaker-questions.json",
);

const PROMPT = `\
You are generating icebreaker questions for a software engineering team that uses SprintJam, a sprint planning and estimation tool.

Generate exactly 30 fresh icebreaker questions to replace the team's existing set. The questions should:
- Be conversational and light — suitable for the opening of a sprint planning meeting
- Cover a mix of: tech opinions, personal productivity, fun hypotheticals, recent wins/learnings, team culture, and life outside work
- Each be concise — under 15 words
- Use British English spelling where it applies (e.g. "favourite", "colour")
- Feel natural when read aloud by a facilitator

Avoid generic or clichéd questions. Prioritise questions that spark genuine, short answers rather than long monologues.

Return a JSON object with a single key "questions" whose value is an array of exactly 30 strings. No other keys. No markdown. No explanation.`;

async function main() {
  const apiKey = process.env.POLYCHAT_API_KEY;
  if (!apiKey) {
    console.error("Error: POLYCHAT_API_KEY is not set.");
    process.exit(1);
  }

  const model = process.env.POLYCHAT_MODEL ?? "mistral-large";

  const res = await fetch("https://api.polychat.app/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "sprintjam-icebreaker-refresh/1.0",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: PROMPT }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "icebreaker_questions",
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: { type: "string" },
                minItems: 30,
                maxItems: 30,
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
      temperature: 0.9,
    }),
  });

  if (!res.ok) {
    console.error(`API request failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content;

  if (typeof raw !== "string") {
    console.error("Unexpected API response shape — missing message content.");
    process.exit(1);
  }

  // Strip markdown code fences if the model wraps its output despite the schema
  const json = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    console.error("Response content is not valid JSON.");
    process.exit(1);
  }

  const questions = parsed?.questions;

  if (!Array.isArray(questions)) {
    console.error('Parsed JSON is missing a "questions" array.');
    process.exit(1);
  }

  if (questions.length !== 30) {
    console.error(`Expected 30 questions, got ${questions.length}.`);
    process.exit(1);
  }

  for (const q of questions) {
    if (typeof q !== "string" || q.trim() === "") {
      console.error("One or more questions are not non-empty strings.");
      process.exit(1);
    }
  }

  writeFileSync(TARGET, JSON.stringify(questions, null, 2) + "\n", "utf8");
  console.log(`Written: ${TARGET}`);
}

main();

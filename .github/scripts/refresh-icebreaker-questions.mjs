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

const EXPECTED_QUESTION_COUNT = 30;
const MAX_QUESTION_WORDS = 15;

function getResponseContent(message) {
  if (typeof message?.content === "string" && message.content.trim() !== "") {
    return message.content;
  }

  if (!Array.isArray(message?.parts)) {
    return undefined;
  }

  const textPart = message.parts.find(
    (part) => part?.type === "text" && typeof part.text === "string",
  );

  return textPart?.text;
}

function countWords(value) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function validateQuestions(questions) {
  const errors = [];

  if (!Array.isArray(questions)) {
    return ['Parsed JSON is missing a "questions" array.'];
  }

  if (questions.length !== EXPECTED_QUESTION_COUNT) {
    errors.push(
      `Expected ${EXPECTED_QUESTION_COUNT} questions, got ${questions.length}.`,
    );
  }

  const seen = new Set();

  questions.forEach((question, index) => {
    if (typeof question !== "string" || question.trim() === "") {
      errors.push(`Question ${index + 1} is not a non-empty string.`);
      return;
    }

    const normalized = question.trim().toLowerCase();

    if (seen.has(normalized)) {
      errors.push(`Question ${index + 1} duplicates an earlier question.`);
    }
    seen.add(normalized);

    if (countWords(question) > MAX_QUESTION_WORDS) {
      errors.push(
        `Question ${index + 1} is longer than ${MAX_QUESTION_WORDS} words.`,
      );
    }
  });

  return errors;
}

async function main() {
  const apiKey = process.env.POLYCHAT_API_KEY;
  if (!apiKey) {
    console.error("Error: POLYCHAT_API_KEY is not set.");
    process.exit(1);
  }

  const model = process.env.POLYCHAT_MODEL?.trim();
  if (!model) {
    console.error("Error: POLYCHAT_MODEL is not set.");
    process.exit(1);
  }

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
    try {
      const errorBody = (await res.text()).trim();
      if (errorBody) {
        console.error(`API response body: ${errorBody}`);
      }
    } catch {
      console.error("API response body could not be read.");
    }
    process.exit(1);
  }

  const data = await res.json();
  const raw = getResponseContent(data?.choices?.[0]?.message);

  if (typeof raw !== "string") {
    console.error(
      "Unexpected API response shape — missing message content or text part.",
    );
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
  const validationErrors = validateQuestions(questions);

  if (validationErrors.length > 0) {
    validationErrors.forEach((error) => console.error(error));
    process.exit(1);
  }

  writeFileSync(TARGET, JSON.stringify(questions, null, 2) + "\n", "utf8");
  console.log(`Written: ${TARGET}`);
}

main();

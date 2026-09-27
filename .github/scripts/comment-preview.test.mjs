import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./comment-preview.sh", import.meta.url));
const marker = "<!-- sprintjam-preview -->";
const preview = {
  type: "preview",
  preview_name: "pr-189",
  preview_urls: ["https://pr-189.previews.sprintjam.co.uk"],
};

function runPreviewComment(
  t,
  { comments = [[]], records = [preview], failListing = false } = {},
) {
  const directory = mkdtempSync(path.join(tmpdir(), "preview-comment-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const outputFile = path.join(directory, "preview.jsonl");
  const callsFile = path.join(directory, "calls.jsonl");
  writeFileSync(
    outputFile,
    records.map((record) => JSON.stringify(record)).join("\n"),
  );
  writeFileSync(callsFile, "");
  writeFileSync(
    path.join(directory, "gh"),
    `#!${process.execPath}
const fs = require("node:fs");
const args = process.argv.slice(2);
const bodyArg = args.find((arg) => arg.startsWith("body=@"));
const body = bodyArg ? fs.readFileSync(bodyArg.slice(6), "utf8") : undefined;
fs.appendFileSync(process.env.CALLS_FILE, JSON.stringify({ args, body }) + "\\n");
if (!args.includes("--method")) {
  if (process.env.FAIL_LISTING === "true") process.exit(1);
  process.stdout.write(process.env.COMMENTS);
}
`,
    { mode: 0o755 },
  );

  const result = spawnSync("bash", [script], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${directory}${path.delimiter}${process.env.PATH}`,
      WRANGLER_OUTPUT_FILE_PATH: outputFile,
      GITHUB_REPOSITORY: "nicholasgriffintn/sprintjam.co.uk",
      PR_NUMBER: "189",
      PR_HEAD_SHA: "abcdef123456",
      CALLS_FILE: callsFile,
      COMMENTS: JSON.stringify(comments),
      FAIL_LISTING: String(failListing),
    },
  });
  const calls = readFileSync(callsFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return { ...result, calls };
}

test("creates a preview comment without editing unrelated or copied comments", (t) => {
  const result = runPreviewComment(t, {
    comments: [
      [
        {
          id: 1,
          user: { login: "github-actions[bot]" },
          body: "Coverage report",
        },
        { id: 2, user: { login: "reviewer" }, body: marker },
      ],
    ],
    records: [
      { type: "deploy", deployment_urls: ["https://unrelated.example.com"] },
      { ...preview, preview_urls: ["https://old.example.com"] },
      preview,
    ],
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.length, 2);
  assert.ok(result.calls[1].args.includes("POST"));
  assert.ok(
    result.calls[1].args.includes(
      "repos/nicholasgriffintn/sprintjam.co.uk/issues/189/comments",
    ),
  );
  assert.equal(
    result.calls[1].body,
    `${marker}\n\nPreview deployed: <${preview.preview_urls[0]}>\n\nCommit: \`abcdef123456\`\n`,
  );
});

test("updates the marked workflow comment from a later page without duplicating it", (t) => {
  const result = runPreviewComment(t, {
    comments: [
      [{ id: 1, user: { login: "github-actions[bot]" }, body: "Other report" }],
      [
        {
          id: 42,
          user: { login: "github-actions[bot]" },
          body: `${marker}\nOld deployment`,
        },
      ],
    ],
  });

  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.calls[0].args.includes("--paginate"));
  assert.ok(result.calls[0].args.includes("--slurp"));
  assert.equal(result.calls.length, 2);
  assert.ok(result.calls[1].args.includes("PATCH"));
  assert.ok(
    result.calls[1].args.includes(
      "repos/nicholasgriffintn/sprintjam.co.uk/issues/comments/42",
    ),
  );
  assert.ok(result.calls[1].body.includes(preview.preview_urls[0]));
});

for (const [name, records] of [
  ["missing URL", [{ ...preview, preview_urls: [] }]],
  ["another PR", [{ ...preview, preview_name: "pr-190" }]],
  ["unsafe URL", [{ ...preview, preview_urls: ["javascript:alert(1)"] }]],
]) {
  test(`refuses to comment with ${name}`, (t) => {
    const result = runPreviewComment(t, { records });
    assert.notEqual(result.status, 0);
    assert.deepEqual(result.calls, []);
  });
}

test("does not create a duplicate when listing existing comments fails", (t) => {
  const result = runPreviewComment(t, { failListing: true });
  assert.notEqual(result.status, 0);
  assert.equal(result.calls.length, 1);
});

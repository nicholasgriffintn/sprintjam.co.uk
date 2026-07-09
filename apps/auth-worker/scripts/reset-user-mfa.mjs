#!/usr/bin/env node

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const ENVIRONMENTS = {
  local: {
    database: "sprintjam-workspaces-staging",
    flags: ["--local", "--persist-to", "../../.data", "--env", "development"],
  },
  staging: {
    database: "sprintjam-workspaces-staging",
    flags: ["--remote", "--env", "staging"],
  },
  live: {
    database: "sprintjam-workspaces",
    flags: ["--remote"],
  },
};

const USAGE = `Usage: pnpm mfa:reset -- <user-id> --env <local|staging|live> [--yes]

Completely resets a user's MFA configuration by deleting credentials, recovery
codes, and setup/verification challenges. The user and active sessions remain.

Options:
  --env <environment>  Required database environment
  --yes                Skip the typed confirmation
  --help, -h            Show this help
`;

export function parseArgs(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { help: true };
  }

  let userIdValue;
  let environment;
  let yes = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--" && index === 0) {
      continue;
    }
    if (value === "--env") {
      if (environment !== undefined) {
        throw new Error("--env may only be specified once");
      }
      environment = argv[index + 1];
      index += 1;
      continue;
    }
    if (value === "--yes") {
      yes = true;
      continue;
    }
    if (value.startsWith("-")) {
      throw new Error(`Unknown option: ${value}`);
    }
    if (userIdValue !== undefined) {
      throw new Error(`Unexpected argument: ${value}`);
    }
    userIdValue = value;
  }

  if (!userIdValue || !/^[1-9]\d*$/.test(userIdValue)) {
    throw new Error("User ID must be a positive integer");
  }
  const userId = Number(userIdValue);
  if (!Number.isSafeInteger(userId)) {
    throw new Error("User ID must be a positive safe integer");
  }
  if (!environment || !(environment in ENVIRONMENTS)) {
    throw new Error("--env must be one of: local, staging, live");
  }

  return {
    help: false,
    userId,
    environment,
    yes,
  };
}

function sqlForInspection(userId) {
  return `SELECT
  users.id,
  users.email,
  (SELECT COUNT(*) FROM mfa_credentials WHERE user_id = users.id) AS credential_count,
  (SELECT COUNT(*) FROM mfa_recovery_codes WHERE user_id = users.id) AS recovery_code_count,
  (SELECT COUNT(*) FROM auth_challenges WHERE user_id = users.id AND type IN ('setup', 'verify')) AS challenge_count
FROM users
WHERE users.id = ${userId};`;
}

function sqlForReset(userId, environment, now) {
  return `DELETE FROM mfa_recovery_codes WHERE user_id = ${userId};
DELETE FROM mfa_credentials WHERE user_id = ${userId};
DELETE FROM auth_challenges WHERE user_id = ${userId} AND type IN ('setup', 'verify');
INSERT INTO login_audit_logs (user_id, email, event, status, reason, created_at)
SELECT id, email, 'mfa_admin_reset', 'success', 'script:${environment}', ${now}
FROM users WHERE id = ${userId};`;
}

export function buildWranglerArgs(environment, sql) {
  const target = ENVIRONMENTS[environment];
  if (!target) throw new Error(`Unsupported environment: ${environment}`);
  return [
    "d1",
    "execute",
    target.database,
    ...target.flags,
    "--command",
    sql,
    "--json",
    "--yes",
  ];
}

function parseD1Result(value) {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  const resultSets = Array.isArray(parsed) ? parsed : [parsed];
  const failed = resultSets.find((resultSet) => resultSet?.success === false);
  if (failed) {
    throw new Error(`D1 command failed: ${failed.error ?? "unknown error"}`);
  }
  return resultSets;
}

function firstResultRow(value) {
  const resultSets = parseD1Result(value);
  for (const resultSet of resultSets) {
    if (Array.isArray(resultSet?.results) && resultSet.results.length > 0) {
      return resultSet.results[0];
    }
  }
  return undefined;
}

async function defaultRunWrangler(args) {
  return await new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "wrangler", ...args], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    let output = "";
    let errorOutput = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      errorOutput += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            errorOutput.trim() || `Wrangler exited with status ${String(code)}`,
          ),
        );
        return;
      }
      try {
        resolve(JSON.parse(output));
      } catch {
        reject(new Error(`Wrangler returned invalid JSON: ${output.trim()}`));
      }
    });
  });
}

async function defaultConfirm(expected) {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error(
      "Confirmation requires an interactive terminal; use --yes to proceed",
    );
  }
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await prompt.question(`Type ${expected} to continue: `);
    return answer === expected;
  } finally {
    prompt.close();
  }
}

export async function runResetMfa(argv, dependencies = {}) {
  const options = parseArgs(argv);
  const write =
    dependencies.write ?? ((message) => stdout.write(`${message}\n`));
  if (options.help) {
    write(USAGE.trimEnd());
    return { help: true };
  }

  const runWrangler = dependencies.runWrangler ?? defaultRunWrangler;
  const confirm = dependencies.confirm ?? defaultConfirm;
  const now = dependencies.now ?? Date.now;
  const inspectArgs = buildWranglerArgs(
    options.environment,
    sqlForInspection(options.userId),
  );
  const before = firstResultRow(await runWrangler(inspectArgs));
  if (!before) {
    throw new Error(
      `User ${options.userId} was not found in the ${options.environment} database`,
    );
  }

  write(
    `User ${before.id}: ${before.email} (${before.credential_count} credentials, ${before.recovery_code_count} recovery codes, ${before.challenge_count} challenges)`,
  );

  const expectedConfirmation = `RESET ${options.userId} IN ${options.environment}`;
  if (!options.yes && !(await confirm(expectedConfirmation))) {
    throw new Error("MFA reset cancelled; no data was changed");
  }

  const resetResult = await runWrangler(
    buildWranglerArgs(
      options.environment,
      sqlForReset(options.userId, options.environment, now()),
    ),
  );
  parseD1Result(resetResult);

  const after = firstResultRow(await runWrangler(inspectArgs));
  if (
    !after ||
    Number(after.credential_count) !== 0 ||
    Number(after.recovery_code_count) !== 0 ||
    Number(after.challenge_count) !== 0
  ) {
    throw new Error("MFA reset could not be verified");
  }

  const result = {
    userId: options.userId,
    email: before.email,
    environment: options.environment,
    deleted: {
      credentials: Number(before.credential_count),
      recoveryCodes: Number(before.recovery_code_count),
      challenges: Number(before.challenge_count),
    },
  };
  write(
    `MFA reset complete for user ${options.userId} in ${options.environment}. Active sessions were preserved.`,
  );
  return result;
}

async function main() {
  try {
    await runResetMfa(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n\n${USAGE}`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}

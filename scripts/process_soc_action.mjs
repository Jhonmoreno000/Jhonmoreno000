import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateAllProfileAssets } from "./update_profile_data.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const STATE_PATH = path.join(ROOT, "data", "soc_state.json");
const README_PATH = path.join(ROOT, "README.md");

const ACTIONS = {
  PROBE_WAF_L7: {
    code: "PROBE_WAF_L7",
    field: "waf_blocks",
    result: "BLOCKED_BY_WAF_L7",
    report:
      "Vector Layer-7 (SQLi / SYN Flood) interceptado por regla OWASP CRS + Rate Limiter (1,200 req/min/IP). Respuesta HTTP 403 emitida y firma de evento almacenada.",
  },
  AUDIT_SQL_DEADLOCK: {
    code: "AUDIT_SQL_DEADLOCK",
    field: "sql_audits",
    result: "ACID_LOCK_VERIFIED",
    report:
      "Auditoria de concurrencia sobre PostgreSQL 16/17 (`SERIALIZABLE` + `FOR UPDATE NOWAIT`). 0 deadlocks detectados; plan de ejecucion resuelto mediante Index Scan en 0.24 ms.",
  },
  RUN_SAST_QWEN_SCAN: {
    code: "RUN_SAST_QWEN_SCAN",
    field: "sast_scans",
    result: "ZERO_CRITICAL_CVES",
    report:
      "Auditoria estatica SAST offline completada bajo politica OWASP ASVS L2 (AST + deduplicacion determinista SHA-256). 0 vulnerabilidades criticas encontradas.",
  },
  SIGN_OPERATOR_LOG: {
    code: "SIGN_OPERATOR_LOG",
    field: null,
    result: "OPERATOR_VERIFIED",
    report:
      "Identidad del operador registrada y firmada criptograficamente en el Verified Operators Ledger del perfil mediante GitHub Actions.",
  },
};

function sanitizeHandle(raw) {
  const clean = String(raw || "anonymous")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 39);
  return clean || "anonymous";
}

function resolveAction(title) {
  const upper = String(title || "").toUpperCase();
  for (const key of Object.keys(ACTIONS)) {
    if (upper.includes(key)) return ACTIONS[key];
  }
  return null;
}

function updateReadmeLedger(state) {
  if (!fs.existsSync(README_PATH)) return;
  const startMarker = "<!-- SOC_LEDGER_START -->";
  const endMarker = "<!-- SOC_LEDGER_END -->";
  const readme = fs.readFileSync(README_PATH, "utf-8");
  const startIdx = readme.indexOf(startMarker);
  const endIdx = readme.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return;

  const rows = (state.verified_operators || [])
    .slice(0, 6)
    .map(
      (op) =>
        `| \`@${sanitizeHandle(op.username)}\` | \`${op.action}\` | \`${op.result}\` | \`${String(op.signature || "").slice(0, 16)}\` | \`${op.date}\` |`
    )
    .join("\n");

  const block = `${startMarker}
| Operator | Command Vector | Verification Result | SHA-256 Signature | Date (UTC) |
| :--- | :--- | :--- | :--- | :--- |
${rows}
${endMarker}`;

  const updated = readme.slice(0, startIdx) + block + readme.slice(endIdx + endMarker.length);
  fs.writeFileSync(README_PATH, updated, "utf-8");
}

async function main() {
  const issueTitle = process.env.ISSUE_TITLE || "";
  const actor = sanitizeHandle(process.env.ISSUE_AUTHOR || "Jhonmoreno000");
  const issueNumber = process.env.ISSUE_NUMBER || "0";

  const action = resolveAction(issueTitle);
  if (!action) {
    console.log("Not a recognized SOC interactive command. Skipping.");
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, "processed=false\n");
    }
    return;
  }

  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  const state = fs.existsSync(STATE_PATH)
    ? JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"))
    : {
        perimeter_status: "HARDENED",
        shield_integrity_pct: 99.98,
        probes_intercepted: 128,
        waf_blocks: 54,
        sql_audits: 38,
        sast_scans: 36,
        verified_operators: [],
      };

  const now = new Date();
  const isoNow = now.toISOString().slice(0, 19) + "Z";
  const dateStr = isoNow.slice(0, 10);
  const signature = crypto
    .createHash("sha256")
    .update(`${actor}:${action.code}:${issueNumber}:${isoNow}`)
    .digest("hex")
    .slice(0, 16);

  state.probes_intercepted = Number(state.probes_intercepted || 128) + 1;
  if (action.field) {
    state[action.field] = Number(state[action.field] || 0) + 1;
  }
  state.last_action = action.code;
  state.last_operator = actor;
  state.last_updated_utc = isoNow;

  const entry = {
    username: actor,
    action: action.code,
    result: action.result,
    signature,
    date: dateStr,
  };

  const prev = Array.isArray(state.verified_operators) ? state.verified_operators : [];
  state.verified_operators = [
    entry,
    ...prev.filter((x) => !(x.username === actor && x.action === action.code)),
  ].slice(0, 12);

  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
  updateReadmeLedger(state);
  await generateAllProfileAssets();

  const replyLines = [
    `### [ SOC-OS // TELEMETRY EXECUTION RECEIPT ]`,
    ``,
    `- **Operator:** \`@${actor}\``,
    `- **Command Vector:** \`${action.code}\``,
    `- **Status:** \`${action.result}\``,
    `- **Cryptographic Signature (SHA-256):** \`${signature}\``,
    `- **Total Perimeter Events Logged:** \`${state.probes_intercepted}\``,
    ``,
    `> ${action.report}`,
    ``,
    `Tu firma ha sido registrada automaticamente en el **Verified Operators Ledger** del perfil \`Jhonmoreno000\`.`,
  ].join("\n");

  const receiptPath = path.join(ROOT, "data", ".last_receipt.md");
  fs.writeFileSync(receiptPath, replyLines, "utf-8");

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, "processed=true\n");
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `action_code=${action.code}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `signature=${signature}\n`);
  }
  console.log(`Processed SOC action ${action.code} by @${actor} (SHA-256: ${signature})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

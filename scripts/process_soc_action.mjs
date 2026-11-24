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
    field: "waf_runs",
    result: "DEMO_WAF_VERIFIED",
    report:
      "Ejecucion de prueba sobre el flujo interactivo de GitHub Actions (simulacion de regla WAF L7 / Rate Limiting). Firma SHA-256 registrada correctamente.",
  },
  AUDIT_SQL_DEADLOCK: {
    code: "AUDIT_SQL_DEADLOCK",
    field: "sql_runs",
    result: "DEMO_SQL_VERIFIED",
    report:
      "Ejecucion de prueba de laboratorio SQL (referencia a practicas de PostgreSQL SERIALIZABLE y FOR UPDATE NOWAIT en NEXUS). Firma SHA-256 registrada.",
  },
  RUN_SAST_QWEN_SCAN: {
    code: "RUN_SAST_QWEN_SCAN",
    field: "sast_runs",
    result: "DEMO_SAST_VERIFIED",
    report:
      "Ejecucion de prueba del flujo automatizado SAST / CI (referencia al laboratorio secdev). Firma SHA-256 generada y almacenada en el registro.",
  },
  SIGN_OPERATOR_LOG: {
    code: "SIGN_OPERATOR_LOG",
    field: null,
    result: "VISITOR_SIGNED",
    report:
      "Tu visita ha sido registrada y firmada con SHA-256 automaticamente en el perfil de Jhonmoreno000 mediante GitHub Actions.",
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
        perimeter_status: "ONLINE",
        events_logged: 1,
        waf_runs: 0,
        sql_runs: 0,
        sast_runs: 0,
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

  state.events_logged = Number(state.events_logged ?? 0) + 1;
  if (action.field) {
    state[action.field] = Number(state[action.field] ?? 0) + 1;
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
    `### [ LINUX LAB // GITHUB ACTIONS RECEIPT ]`,
    ``,
    `- **Usuario:** \`@${actor}\``,
    `- **Comando:** \`${action.code}\``,
    `- **Estado:** \`${action.result}\``,
    `- **Firma SHA-256:** \`${signature}\``,
    `- **Eventos Reales Registrados:** \`${state.events_logged}\``,
    ``,
    `> ${action.report}`,
    ``,
    `Tu firma ha sido agregada automaticamente al **Registro de Visitantes** del perfil \`Jhonmoreno000\`.`,
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

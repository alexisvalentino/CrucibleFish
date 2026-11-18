const EVIDENCE_KEY = "cruciblefish-evidence-v1";
const MAX_ENTRIES = 52;

const optionalNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export function normalizeEntry(raw = {}) {
  const source = String(raw.source || "MEASURED").toUpperCase();
  return {
    id: String(raw.id || `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).slice(0, 80),
    weekEnding: String(raw.weekEnding || "").slice(0, 10),
    cohortSize: optionalNumber(raw.cohortSize),
    source: source === "ESTIMATED" ? "ESTIMATED" : "MEASURED",
    runId: String(raw.runId || "").slice(0, 80),
    hypothesis: String(raw.hypothesis || "").slice(0, 200),
    interviews: optionalNumber(raw.interviews),
    active: optionalNumber(raw.active),
    churned: optionalNumber(raw.churned),
    paid: optionalNumber(raw.paid),
    gmv: optionalNumber(raw.gmv),
    note: String(raw.note || "").slice(0, 2000),
    createdAt: String(raw.createdAt || new Date().toISOString()).slice(0, 40),
  };
}

export function loadEvidence(storage = localStorage) {
  let entries;
  try { entries = JSON.parse(storage.getItem(EVIDENCE_KEY) || "[]"); } catch { entries = []; }
  if (!Array.isArray(entries)) entries = [];
  return entries.slice(0, MAX_ENTRIES).map(normalizeEntry).sort((a, b) => b.weekEnding.localeCompare(a.weekEnding));
}

export function saveEvidence(entries, storage = localStorage) {
  const clean = (Array.isArray(entries) ? entries : []).slice(0, MAX_ENTRIES).map(normalizeEntry);
  try { storage.setItem(EVIDENCE_KEY, JSON.stringify(clean)); } catch { /* local persistence is optional */ }
  return clean;
}

export function evidenceDigest(entries = [], limit = 8) {
  const rows = (Array.isArray(entries) ? entries : []).slice(0, limit).map((entry) => {
    const parts = [`week ending ${entry.weekEnding || "unknown date"}`];
    if (entry.cohortSize !== null && entry.cohortSize !== undefined) parts.push(`cohort ${entry.cohortSize}`);
    parts.push(`${entry.source === "ESTIMATED" ? "estimated" : "measured"} by the founder`);
    if (entry.runId) parts.push(`tests run ${entry.runId}`);
    for (const [key, label] of [["interviews", "interviews"], ["active", "active customers"], ["churned", "churned"], ["paid", "paid conversions"]]) {
      if (entry[key] !== null && entry[key] !== undefined) parts.push(`${entry[key]} ${label}`);
    }
    if (entry.gmv !== null && entry.gmv !== undefined) parts.push(`$${entry.gmv} observed GMV`);
    const note = String(entry.note || "none recorded").replace(/\s+/g, " ").slice(0, 280);
    const hypothesis = entry.hypothesis ? ` Hypothesis: ${String(entry.hypothesis).replace(/\s+/g, " ").slice(0, 160)}.` : "";
    return `- ${parts.join("; ")}.${hypothesis} Observation: ${note}`;
  });
  return rows.length ? `REAL OBSERVED EVIDENCE entered by the founder (do NOT treat this as simulated):\n${rows.join("\n")}` : "";
}

const csvCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function evidenceCsv(entries = []) {
  const columns = ["weekEnding", "cohortSize", "source", "runId", "hypothesis", "interviews", "active", "churned", "paid", "gmv", "note", "createdAt"];
  const rows = (Array.isArray(entries) ? entries : []).map((entry) => columns.map((key) => csvCell(entry[key])).join(","));
  return [columns.join(","), ...rows].join("\r\n");
}

const EVIDENCE_KEY = "cruciblefish-evidence-v1";
const MAX_ENTRIES = 52;

const optionalNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

export function normalizeEntry(raw = {}) {
  return {
    id: String(raw.id || `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).slice(0, 80),
    weekEnding: String(raw.weekEnding || "").slice(0, 10),
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
    for (const [key, label] of [["interviews", "interviews"], ["active", "active customers"], ["churned", "churned"], ["paid", "paid conversions"]]) {
      if (entry[key] !== null && entry[key] !== undefined) parts.push(`${entry[key]} ${label}`);
    }
    if (entry.gmv !== null && entry.gmv !== undefined) parts.push(`$${entry.gmv} observed GMV`);
    const note = String(entry.note || "none recorded").replace(/\s+/g, " ").slice(0, 280);
    return `- ${parts.join("; ")}. Observation: ${note}`;
  });
  return rows.length ? `REAL OBSERVED EVIDENCE entered by the founder (do NOT treat this as simulated):\n${rows.join("\n")}` : "";
}

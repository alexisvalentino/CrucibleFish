import dns from "node:dns/promises";
import net from "node:net";
import https from "node:https";

const TLS_FALLBACK_CODES = ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN"];

async function relaxedFetch(url, options = {}) {
  try { return await fetch(url, options); }
  catch (error) {
    if (!TLS_FALLBACK_CODES.includes(error?.cause?.code)) throw error;
    return new Promise((resolve, reject) => {
      const request = https.get(url, {
        headers: options.headers, rejectUnauthorized: false, timeout: 8000,
      }, (response) => {
        const headers = { get: (name) => response.headers[String(name).toLowerCase()] };
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve({
          status: response.statusCode, ok: response.statusCode >= 200 && response.statusCode < 300,
          headers, text: async () => Buffer.concat(chunks).toString("utf8"),
        }));
      });
      request.on("error", reject);
      request.on("timeout", () => request.destroy(new Error("The website request timed out.")));
    });
  }
}

const MAX_HTML = 500000;
const LIMITS = {
  startupName: 100, oneLinePitch: 1200, targetCustomer: 200, targetGeography: 120,
  businessModel: 800, proposedPricing: 200, currentTraction: 1200, unfairAdvantages: 1200,
};

const clean = (value, max) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, max || 200);
const decode = (value) => String(value || "")
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");

function isPrivateAddress(ip) {
  const value = String(ip || "").toLowerCase();
  if (value.includes(":")) {
    return value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80") || value.startsWith("::ffff:127");
  }
  const [a, b] = value.split(".").map(Number);
  if (!Number.isInteger(a) || !Number.isInteger(b)) return true;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

async function safeUrl(raw, lookup = dns.lookup) {
  let url;
  try { url = new URL(String(raw || "").trim()); } catch { throw new Error("Enter a valid website URL, including https://."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http and https websites can be read.");
  if (url.username || url.password) throw new Error("Website URLs with login details are not supported.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Local or internal addresses cannot be read.");
  if (net.isIP(host) && isPrivateAddress(host)) throw new Error("Private network addresses cannot be read.");
  const addresses = await lookup(host, { all: true }).catch(() => []);
  if (addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error("This address is not reachable from the server.");
  return url;
}

async function fetchPage(rawUrl, fetchImpl, lookup, hops = 0) {
  if (hops > 3) throw new Error("The website redirected too many times.");
  const url = await safeUrl(rawUrl, lookup);
  const response = await fetchImpl(url.toString(), {
    headers: { "user-agent": "CrucibleFish intake discovery", accept: "text/html,application/xhtml+xml" },
    redirect: "manual", signal: AbortSignal.timeout(8000),
  });
  if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.get("location")) {
    return fetchPage(new URL(response.headers.get("location"), url).toString(), fetchImpl, lookup, hops + 1);
  }
  if (!response.ok) throw new Error(`The website returned HTTP ${response.status}.`);
  const type = response.headers.get("content-type") || "";
  if (!/html|text\//i.test(type)) throw new Error("That link is not a readable web page.");
  return String(await response.text()).slice(0, MAX_HTML);
}

function metaContent(html, names) {
  for (const name of names) {
    const pattern = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i");
    const match = html.match(pattern) || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, "i"));
    if (match) return decode(match[1]);
  }
  return "";
}

function jsonLdObjects(html) {
  const found = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : parsed?.["@graph"] || [parsed];
      found.push(...items.filter((item) => item && typeof item === "object"));
    } catch { /* ignore invalid JSON-LD blocks */ }
  }
  return found;
}

export function htmlToText(html = "") {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ").trim().slice(0, 20000);
}

export function mergeDiscoveredFields(deterministic = {}, suggested = {}) {
  const cleanSuggested = {};
  for (const [key, limit] of Object.entries(LIMITS)) {
    const value = clean(suggested?.[key], limit);
    if (value && !/^(not (explicitly )?stated|not available|not specified|n\/a|unknown|none|no information)$/i.test(value)) cleanSuggested[key] = value;
  }
  return { ...cleanSuggested, ...deterministic };
}

export function extractIntake(html = {}, providedName = "") {
  const source = typeof html === "string" ? html : "";
  const title = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const objects = jsonLdObjects(source);
  const pick = (key) => {
    for (const object of objects) if (object[key]) return object[key];
    return "";
  };
  const offer = objects.map((object) => object.offers).find(Boolean);
  const price = offer && (offer.price || offer.lowPrice);
  const currency = offer && (offer.priceCurrency || offer.currency);
  const fields = {};
  const set = (key, value, fallback = "") => {
    const result = clean(value || fallback, LIMITS[key]);
    if (result) fields[key] = result;
  };
  const rawTitle = clean(decode(title), LIMITS.startupName).split(/\s+[|–—-]\s+/)[0];
  const usableTitle = rawTitle.length >= 4 && !/^(home|homepage|index|welcome|untitled|start|home page)$/i.test(rawTitle) ? rawTitle : "";
  const siteName = metaContent(source, ["og:site_name"]);
  if (!String(providedName || "").trim()) set("startupName", siteName || usableTitle);
  const description = metaContent(source, ["og:description", "description", "twitter:description"]);
  set("oneLinePitch", description);
  const location = pick("areaServed") || pick("address");
  if (location) set("targetGeography", typeof location === "string" ? location : [location.name, location.addressLocality, location.addressCountry].filter(Boolean).join(", "));
  if (price !== undefined && price !== "") set("proposedPricing", `${currency || ""} ${price}`.trim());
  const matched = Object.keys(fields);
  return { fields, matched, notes: matched.length ? `Found ${matched.length} field${matched.length === 1 ? "" : "s"} on the page. Check them before running.` : "Nothing usable found on the page. Fill the form manually." };
}

export async function discoverIntake({ name = "", websiteUrl = "" } = {}, { fetchImpl = relaxedFetch, lookup = dns.lookup, enrich = null } = {}) {
  if (!String(websiteUrl || "").trim()) throw new Error("Add a website URL first, then try auto-fill.");
  const html = await fetchPage(String(websiteUrl).trim(), fetchImpl, lookup);
  const base = extractIntake(html, name);
  let fields = base.fields;
  let usedAI = false;
  if (typeof enrich === "function" && Object.keys(fields).length < 4) {
    const suggested = await enrich(htmlToText(html)).catch(() => null);
    if (suggested && typeof suggested === "object") {
      fields = mergeDiscoveredFields(fields, suggested);
      usedAI = true;
    }
  }
  const matched = Object.keys(fields);
  const notes = matched.length
    ? `Found ${matched.length} field${matched.length === 1 ? "" : "s"} on the page${usedAI ? " with AI help" : ""}. Check them before running.`
    : "Nothing usable found on the page. Fill the form manually.";
  return { fields, matched, notes, usedAI, source: String(websiteUrl).trim().slice(0, 600) };
}

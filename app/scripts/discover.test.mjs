import "./test-env.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";
import { discoverIntake, extractIntake, htmlToText, mergeDiscoveredFields } from "../lib/discover.mjs";

const html = `<html><head>
<title>OrbitTools — Home</title>
<meta property="og:site_name" content="OrbitTools">
<meta property="og:description" content="A planning workspace that turns messy team notes into a clear weekly decision.">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"OrbitTools","areaServed":"Metro Manila","offers":{"price":"499","priceCurrency":"PHP"}}</script>
</head><body>Hello</body></html>`;

const lookup = async () => [{ address: "93.184.216.34", family: 4 }];
const fetchImpl = async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } });

test("extraction fills only fields the page actually provides", () => {
  const result = extractIntake(html);
  assert.equal(result.fields.startupName, "OrbitTools");
  assert.match(result.fields.oneLinePitch, /planning workspace/);
  assert.equal(result.fields.targetGeography, "Metro Manila");
  assert.equal(result.fields.proposedPricing, "PHP 499");
  assert.equal(result.fields.businessModel, undefined);
  assert.ok(result.matched.length >= 4);
});

test("empty or unhelpful pages return no fields", () => {
  const result = extractIntake("<html><head><title>Home</title></head></html>");
  assert.deepEqual(result.fields, {});
  assert.match(result.notes, /Fill the form manually/);
});

test("discovery uses injected fetch and lookup", async () => {
  const result = await discoverIntake({ name: "OrbitTools", websiteUrl: "https://example.com" }, { fetchImpl, lookup });
  assert.equal(result.fields.startupName, undefined);
  assert.match(result.fields.oneLinePitch, /planning workspace/);
  assert.equal(result.source, "https://example.com");
});

test("HTML text and AI suggestions fill gaps without overwriting known fields", () => {
  assert.match(htmlToText("<html><script>bad()</script><body>Hello <b>world</b></body></html>"), /Hello world/);
  const merged = mergeDiscoveredFields({ oneLinePitch: "Known pitch" }, { oneLinePitch: "Guessed pitch", targetGeography: "Metro Manila" });
  assert.equal(merged.oneLinePitch, "Known pitch");
  assert.equal(merged.targetGeography, "Metro Manila");
});

test("thin pages use the AI enricher", async () => {
  const fetchThin = async () => new Response("<html><body>Acme helps clinics manage intake.</body></html>", { status: 200, headers: { "content-type": "text/html" } });
  const result = await discoverIntake({ name: "", websiteUrl: "https://example.org" }, {
    fetchImpl: fetchThin, lookup,
    enrich: async (text) => {
      assert.match(text, /Acme helps clinics/);
      return { startupName: "Acme", oneLinePitch: "Acme helps clinics manage intake.", targetGeography: "Metro Manila", businessModel: "", proposedPricing: "", currentTraction: "", unfairAdvantages: "", targetCustomer: "" };
    },
  });
  assert.equal(result.usedAI, true);
  assert.equal(result.fields.startupName, "Acme");
  assert.equal(result.fields.targetGeography, "Metro Manila");
});

test("private and malformed addresses are rejected", async () => {
  await assert.rejects(() => discoverIntake({ websiteUrl: "http://127.0.0.1/admin" }, { fetchImpl, lookup }), /Private network/);
  await assert.rejects(() => discoverIntake({ websiteUrl: "not-a-url" }, { fetchImpl, lookup }), /valid website URL/);
  await assert.rejects(() => discoverIntake({ websiteUrl: "file:///etc/passwd" }, { fetchImpl, lookup }), /http and https/);
  await assert.rejects(() => discoverIntake({}, { fetchImpl, lookup }), /website URL first/);
});

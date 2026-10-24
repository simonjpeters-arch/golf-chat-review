/**
 * Node parser smoke test. Run: node pwa/js/test-parser.mjs
 * Optionally pass the real Downloads export path as argv[2] (read-only).
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(here, "parse-whatsapp.js"), "utf8");
const ctx = { window: {}, console };
ctx.window = ctx;
vm.runInNewContext(code, ctx);
const GP = ctx.GolfParse;

const fixture = fs.readFileSync(path.join(here, "..", "fixtures", "sample-chat.txt"), "utf8");
const msgs = GP.parseExportText(fixture);
if (msgs.length < 6) {
  console.error("FAIL: expected several parsed messages, got", msgs.length);
  process.exit(1);
}
const senders = new Set(msgs.map((m) => GP.senderRole(m.sender)));
if (!senders.has("Simon") || !senders.has("Gaythan")) {
  console.error("FAIL: expected Simon and Gaythan, got", [...senders], msgs.map((m) => m.sender));
  process.exit(1);
}
const bail = msgs.find((m) => /bailing on golf/i.test(m.text));
if (!bail) {
  console.error("FAIL: missing bailing on golf line");
  process.exit(1);
}
console.log("fixture ok:", msgs.length, "messages; sample senders", [...new Set(msgs.map((m) => m.sender))]);

const realPath = process.argv[2] || "C:\\Users\\simon\\Downloads\\WhatsApp Chat with Gaythan Sandridge.txt";
if (fs.existsSync(realPath)) {
  const st = fs.statSync(realPath);
  const text = fs.readFileSync(realPath, "utf8");
  const all = GP.parseExportText(text);
  const golf = all.filter((m) => /golf/i.test(m.text)).length;
  console.log(
    "real export ok: size",
    st.size,
    "parsed",
    all.length,
    "golf mentions",
    golf,
    "range",
    GP.dateKey(all[0].dt),
    "→",
    GP.dateKey(all[all.length - 1].dt)
  );
  if (all.length < 1000) {
    console.error("FAIL: expected tens of thousands of messages");
    process.exit(1);
  }
} else {
  console.log("real export not found (skip):", realPath);
}

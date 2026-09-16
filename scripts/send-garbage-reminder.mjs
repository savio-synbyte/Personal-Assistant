#!/usr/bin/env node
// Sends a Telegram reminder the night before any Peekskill collection day.
// Usage:
//   node scripts/send-garbage-reminder.mjs [--dry-run]
// Env:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID  - required unless --dry-run
//   FAKE_TODAY=YYYY-MM-DD                 - override "today" for testing
//   SKIP_TIME_WINDOW_CHECK=1              - bypass the ~9pm ET guard (used by manual runs)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NY_TIME_ZONE = "America/New_York";
const TARGET_HOUR_24 = 21; // 9 PM local
const HOUR_WINDOW = 1; // tolerate the hour on either side of the target

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

function nyDateParts(date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
  };
}

function ymd(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(year, month, day, delta) {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + delta);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

let today;
if (process.env.FAKE_TODAY) {
  const [y, m, d] = process.env.FAKE_TODAY.split("-").map(Number);
  today = { year: y, month: m, day: d, hour: TARGET_HOUR_24 };
} else {
  today = nyDateParts(new Date());
}

const skipWindowCheck = dryRun || process.env.FAKE_TODAY || process.env.SKIP_TIME_WINDOW_CHECK === "1";
if (!skipWindowCheck && Math.abs(today.hour - TARGET_HOUR_24) > HOUR_WINDOW) {
  console.log(
    `Current NY hour (${today.hour}) is outside the ~${TARGET_HOUR_24}:00 send window; exiting quietly.`
  );
  process.exit(0);
}

const tomorrow = addDays(today.year, today.month, today.day, 1);
const tomorrowKey = ymd(tomorrow.year, tomorrow.month, tomorrow.day);
const tomorrowLabel = new Date(Date.UTC(tomorrow.year, tomorrow.month - 1, tomorrow.day)).toLocaleDateString(
  "en-US",
  { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }
);

const dataPath = path.join(__dirname, "..", "data", `garbage-schedule-${tomorrow.year}.json`);
let dataset;
try {
  dataset = JSON.parse(readFileSync(dataPath, "utf8"));
} catch (err) {
  console.error(`No schedule file found for ${tomorrow.year} at ${dataPath}.`);
  console.error("Transcribe next year's city calendar into that file before this date arrives.");
  process.exit(1);
}

const codes = (dataset.schedule[tomorrowKey] || []).filter((code) => code !== "H");

if (codes.length === 0) {
  console.log(`Nothing scheduled for ${tomorrowKey}; no reminder needed.`);
  process.exit(0);
}

const labels = codes.map((code) => dataset._legend[code] || code);
const message = `🗑️ Garbage reminder: tomorrow (${tomorrowLabel}) put out — ${labels.join(", ")}`;

if (dryRun) {
  console.log("[dry run] would send:", message);
  process.exit(0);
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
if (!token || !chatId) {
  console.error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set to send a real reminder.");
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ chat_id: chatId, text: message }),
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Telegram API error (${response.status}): ${body}`);
  process.exit(1);
}

console.log("Sent:", message);

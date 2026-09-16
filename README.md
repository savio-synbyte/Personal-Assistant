# Personal Assistant

Starting point: a nightly Telegram reminder for Peekskill curbside collection
days (household garbage, commingle recycling, newspaper/cardboard, bulk
trash, bagged leaves, Saturday drop-off). More assistant features (bills,
tasks) can be added later following the same pattern.

## How it works

- `data/garbage-schedule-2026.json` is the full 2026 collection calendar,
  transcribed from the City of Peekskill's PDF, as a date → collection-code
  lookup.
- `scripts/send-garbage-reminder.mjs` checks tomorrow's date against that
  file and, if something is scheduled, sends a Telegram message.
- `.github/workflows/garbage-reminder.yml` runs that script nightly around
  9:00 PM America/New_York via GitHub Actions (no server to host).

## One-time setup

1. **Create a Telegram bot**
   - Open Telegram, message **@BotFather**, send `/newbot`, and follow the
     prompts. It gives you a **bot token** like `123456:ABC-DEF...`.
2. **Get your chat ID**
   - Send any message to your new bot from your own Telegram account.
   - Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser
     (replace `<YOUR_TOKEN>`) and find `"chat":{"id":123456789,...}` in the
     response — that number is your chat ID.
3. **Add repo secrets**
   - In GitHub: Settings → Secrets and variables → Actions → New repository
     secret.
   - Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` with the values above.
4. **Test it**
   - Go to the Actions tab → "Garbage day reminder" → "Run workflow".
   - Tick `dry_run` first to confirm it logs the right message without
     sending.
   - Run it again with `dry_run` unchecked to confirm a real Telegram
     message arrives.
   - Use `date_override` (e.g. `2026-01-19`) to test a specific date without
     waiting for it.

Once secrets are set, no further action is needed — it runs automatically
every night.

## Known limitations

- **The schedule only covers 2026.** When the city publishes next year's
  calendar, transcribe it the same way into
  `data/garbage-schedule-2027.json` (same `schedule`/`_legend` shape) — the
  script automatically picks the file matching the current year.
- **A few dates were harder to pin down exactly** from the source PDF: the
  precise day for **Bagged Leaves (B/L)** and **Bulk Trash (B/T)** in a
  couple of weeks (early April, mid-November, mid-December), and one
  **Newspaper/Cardboard (N/C)** entry on Oct 1. These are minor,
  infrequent categories — worth a quick double-check against the city
  calendar the first time each comes up. The weekly Household Garbage (G),
  Commingle (C), and Saturday Drop-off (S/D) dates are solid.
- iMessage isn't used here: it can only be sent from macOS/iOS, and this
  runs from GitHub's cloud runners. Telegram was chosen instead since it
  has an open API and delivers to your phone just as fast.

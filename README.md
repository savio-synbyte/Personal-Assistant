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
- `.github/workflows/garbage-reminder.yml` runs that script nightly, targeting
  5:00 PM America/New_York, via GitHub Actions (no server to host).
  GitHub doesn't guarantee scheduled workflows fire at the exact minute (it
  can run late, sometimes by hours, especially under load), so exact
  delivery time can vary — the cron time was chosen with a wide buffer
  before midnight NY time so "tomorrow" is still calculated correctly even
  when that happens.

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

## Adding another recipient

The same bot can message multiple people — no need to create a second bot.

1. Have the other person open Telegram, search for your bot's exact
   username, open it, and send it any message (e.g. `hi`).
2. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` again — their
   chat should now show up too, with their own `"chat":{"id":...}`.
3. Edit the `TELEGRAM_CHAT_ID` repo secret to hold **both** IDs separated by
   a comma, e.g. `111111111,222222222` (Settings → Secrets and variables →
   Actions → click `TELEGRAM_CHAT_ID` → Update).
4. Test with `workflow_dispatch` (`dry_run` unchecked) to confirm both
   people receive the message.

Repeat for as many people as you want on the list.

## Known limitations

- **The schedule only covers 2026.** When the city publishes next year's
  calendar, transcribe it the same way into
  `data/garbage-schedule-2027.json` (same `schedule`/`_legend` shape) — the
  script automatically picks the file matching the current year.
- Every date in `data/garbage-schedule-2026.json` was cross-checked directly
  against the city's color-coded calendar image (not just the flattened PDF
  text), including every holiday-adjacent week where a route shifts a day
  (e.g. Election Day, Nov 3, bumps that week's Household Garbage from
  Tuesday to Wednesday).
- iMessage isn't used here: it can only be sent from macOS/iOS, and this
  runs from GitHub's cloud runners. Telegram was chosen instead since it
  has an open API and delivers to your phone just as fast.

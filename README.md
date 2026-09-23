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
- `.github/workflows/garbage-reminder.yml` runs that script via GitHub
  Actions (no server to host) — but only on-demand (`workflow_dispatch`),
  not on GitHub's own `schedule:` trigger. GitHub's scheduled-workflow timer
  proved unreliable for this repo (observed delays of 4+ hours, sometimes
  not firing at all within a day), while manually/API-triggered runs have
  been fast and reliable every time. So the *scheduling* is handled by
  `api/trigger-reminder.js`, a small Vercel serverless function on a
  Vercel Cron Job (see setup step 5 below) that simply calls this
  workflow's `workflow_dispatch` REST endpoint once a day — GitHub Actions
  is only responsible for *executing* the job, not deciding when.

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
4. **Test it manually first**
   - Go to the Actions tab → "Garbage day reminder" → "Run workflow".
   - Tick `dry_run` first to confirm it logs the right message without
     sending.
   - Run it again with `dry_run` unchecked to confirm a real Telegram
     message arrives.
   - Use `date_override` (e.g. `2026-01-19`) to test a specific date without
     waiting for it.
5. **Set up the Vercel-hosted daily trigger** (this is what actually makes
   it run automatically every night — GitHub's own scheduler is
   intentionally not used, see above):
   - Create a GitHub **fine-grained personal access token**: GitHub →
     Settings → Developer settings → Personal access tokens → Fine-grained
     tokens → Generate new token. Scope it to **only** this repository
     (`savio-synbyte/Personal-Assistant`), and under Repository permissions
     grant **Actions: Read and write**. Copy the token — this is the only
     part of this whole setup that has to be done by hand, since generating
     it requires your own GitHub login.
   - A Vercel project (`personal-assistant-reminders`, free Hobby tier) is
     already created and linked to this repo, and deploys automatically on
     every push to this branch. It hosts `api/trigger-reminder.js`, which
     `vercel.json` schedules via a Vercel Cron Job at `0 21 * * *` UTC
     (5pm EDT / 4pm EST — Vercel Cron, like GitHub's, is UTC-only with no
     timezone support, so unlike the Telegram-side timing this one *does*
     need a manual 1-hour nudge in `vercel.json` around early
     November/March for daylight saving).
   - Add the token from the first step as a Vercel project environment
     variable named `GITHUB_DISPATCH_TOKEN` (Production target) — either
     hand it to Claude to set via the Vercel API, or add it yourself in the
     Vercel dashboard → this project → Settings → Environment Variables.
   - Redeploy (or wait for the next push) so the function picks up the new
     env var, then hit the deployed `/api/trigger-reminder` URL directly (or
     use Vercel's dashboard "Run" button on the cron job) to confirm it
     dispatches the GitHub workflow and a Telegram message arrives.

Once secrets, the token, and the Vercel env var are all set, no further
action is needed — it runs automatically every night, independent of GitHub's
own (unreliable) scheduler and independent of this chat.

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

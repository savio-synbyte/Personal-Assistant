// Vercel Cron target: fires the GitHub Actions "Garbage day reminder"
// workflow via workflow_dispatch. GitHub's own `schedule:` trigger proved
// unreliable for this repo (see README), so Vercel Cron Jobs own the
// "when" instead, and GitHub Actions only "executes" on demand - the path
// that's actually been fast and reliable.

const OWNER = "savio-synbyte";
const REPO = "Personal-Assistant";
const WORKFLOW_FILE = "garbage-reminder.yml";
const REF = "claude/garbage-day-reminders-37x3wp";

export default async function handler(req, res) {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    res.status(500).json({ ok: false, error: "GITHUB_DISPATCH_TOKEN is not set" });
    return;
  }

  const response = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: REF }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    res.status(502).json({ ok: false, status: response.status, body });
    return;
  }

  res.status(200).json({ ok: true, dispatched: true, ref: REF, at: new Date().toISOString() });
}

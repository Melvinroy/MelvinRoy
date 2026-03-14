import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const token = process.env.PROFILE_STATS_TOKEN || process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_REPOSITORY_OWNER || "Melvinroy";
const assetsDir = path.join(process.cwd(), "assets");
const workCardFile = path.join(assetsDir, "github-work-card.svg");
const activityCardFile = path.join(assetsDir, "github-activity-overview.svg");

const now = new Date();
const year = now.getUTCFullYear();
const from = new Date(Date.UTC(year, 0, 1)).toISOString();
const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();

if (!token) {
  throw new Error("Missing PROFILE_STATS_TOKEN or GITHUB_TOKEN.");
}

const query = `
  query($from: DateTime!, $to: DateTime!) {
    viewer {
      login
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
        }
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalRepositoryContributions
        restrictedContributionsCount
      }
    }
  }
`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "MelvinRoy-profile-card-generator",
  },
  body: JSON.stringify({
    query,
    variables: { from, to },
  }),
});

if (!response.ok) {
  throw new Error(`GitHub GraphQL request failed: ${response.status}`);
}

const payload = await response.json();

if (payload.errors?.length) {
  throw new Error(payload.errors.map((error) => error.message).join("; "));
}

const data = payload.data.viewer.contributionsCollection;
const updatedAt = now.toISOString().slice(0, 10);

const workMetrics = [
  { label: "Total Contributions", value: data.contributionCalendar.totalContributions, accent: "#7c3aed" },
  { label: "Commit Activity", value: data.totalCommitContributions, accent: "#2563eb" },
  { label: "Repository Touches", value: data.totalRepositoryContributions, accent: "#0f766e" },
  { label: "Private Work", value: data.restrictedContributionsCount, accent: "#c2410c" },
];

const activityMetrics = [
  { label: "Commits", value: data.totalCommitContributions, accent: "#60a5fa" },
  { label: "Pull Requests", value: data.totalPullRequestContributions, accent: "#a78bfa" },
  { label: "Code Reviews", value: data.totalPullRequestReviewContributions, accent: "#34d399" },
  { label: "Issues", value: data.totalIssueContributions, accent: "#f59e0b" },
  { label: "Private", value: data.restrictedContributionsCount, accent: "#f97316" },
];

await mkdir(assetsDir, { recursive: true });
await writeFile(
  workCardFile,
  renderWorkCard({ owner, year, updatedAt, metrics: workMetrics }),
  "utf8",
);
await writeFile(
  activityCardFile,
  renderActivityCard({ owner, year, updatedAt, metrics: activityMetrics }),
  "utf8",
);

function renderWorkCard({ owner, year, updatedAt, metrics }) {
  const tiles = metrics
    .map((metric, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 30 + col * 255;
      const y = 104 + row * 88;
      return `
        <g transform="translate(${x} ${y})">
          <rect width="225" height="66" rx="16" fill="#0b1324" stroke="#22314a" />
          <rect x="0" y="0" width="6" height="66" rx="6" fill="${metric.accent}" />
          <text x="18" y="26" fill="#94a3b8" font-size="13" font-family="Segoe UI, Arial, sans-serif">${escapeXml(metric.label)}</text>
          <text x="18" y="50" fill="#f8fafc" font-size="28" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${escapeXml(String(metric.value))}</text>
        </g>
      `;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="270" viewBox="0 0 540 270" role="img" aria-label="GitHub work snapshot for ${escapeXml(owner)}">
  <defs>
    <linearGradient id="work-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
  </defs>
  <rect width="540" height="270" rx="22" fill="url(#work-bg)" />
  <rect x="1" y="1" width="538" height="268" rx="21" fill="none" stroke="#243244" />
  <text x="30" y="42" fill="#f8fafc" font-size="24" font-weight="700" font-family="Segoe UI, Arial, sans-serif">GitHub Work Snapshot</text>
  <text x="30" y="66" fill="#93c5fd" font-size="13" font-family="Segoe UI, Arial, sans-serif">Authenticated contribution totals for ${year}</text>
  <text x="30" y="86" fill="#94a3b8" font-size="12" font-family="Segoe UI, Arial, sans-serif">Private activity is included when visible to your token.</text>
  ${tiles}
  <text x="398" y="247" fill="#64748b" font-size="12" font-family="Segoe UI, Arial, sans-serif">Updated ${updatedAt}</text>
</svg>`;
}

function renderActivityCard({ owner, year, updatedAt, metrics }) {
  const maxValue = Math.max(...metrics.map((metric) => metric.value), 1);
  const bars = metrics
    .map((metric, index) => {
      const y = 76 + index * 34;
      const width = Math.max(6, Math.round((metric.value / maxValue) * 250));
      return `
        <text x="28" y="${y + 14}" fill="#cbd5e1" font-size="13" font-family="Segoe UI, Arial, sans-serif">${escapeXml(metric.label)}</text>
        <rect x="156" y="${y}" width="250" height="16" rx="8" fill="#132033" />
        <rect x="156" y="${y}" width="${width}" height="16" rx="8" fill="${metric.accent}" />
        <text x="422" y="${y + 14}" fill="#f8fafc" font-size="13" text-anchor="end" font-family="Segoe UI, Arial, sans-serif">${escapeXml(String(metric.value))}</text>
      `;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="260" viewBox="0 0 540 260" role="img" aria-label="GitHub activity overview for ${escapeXml(owner)}">
  <defs>
    <linearGradient id="activity-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827" />
      <stop offset="100%" stop-color="#0b1220" />
    </linearGradient>
  </defs>
  <rect width="540" height="260" rx="22" fill="url(#activity-bg)" />
  <rect x="1" y="1" width="538" height="258" rx="21" fill="none" stroke="#243244" />
  <text x="28" y="40" fill="#f8fafc" font-size="24" font-weight="700" font-family="Segoe UI, Arial, sans-serif">Activity Overview</text>
  <text x="28" y="62" fill="#94a3b8" font-size="13" font-family="Segoe UI, Arial, sans-serif">Commit, PR, review, issue, and private contribution mix for ${year}</text>
  ${bars}
  <text x="386" y="236" fill="#64748b" font-size="12" font-family="Segoe UI, Arial, sans-serif">Updated ${updatedAt}</text>
</svg>`;
}

function escapeXml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

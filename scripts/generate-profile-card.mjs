import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const token = process.env.PROFILE_STATS_TOKEN || process.env.GITHUB_TOKEN;
const owner = process.env.GITHUB_REPOSITORY_OWNER || "Melvinroy";
const outFile = path.join(process.cwd(), "assets", "github-work-card.svg");

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
const metrics = [
  { label: "Total", value: data.contributionCalendar.totalContributions },
  { label: "Commits", value: data.totalCommitContributions },
  { label: "Repos", value: data.totalRepositoryContributions },
  { label: "Private", value: data.restrictedContributionsCount },
  { label: "PRs", value: data.totalPullRequestContributions },
  { label: "Issues", value: data.totalIssueContributions },
];

const updatedAt = now.toISOString().slice(0, 10);
const card = renderSvg({
  owner,
  year,
  updatedAt,
  metrics,
});

await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, card, "utf8");

function renderSvg({ owner, year, updatedAt, metrics }) {
  const tiles = metrics
    .map((metric, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 28 + col * 156;
      const y = 82 + row * 74;
      return `
        <g transform="translate(${x} ${y})">
          <rect width="132" height="54" rx="12" fill="#111827" stroke="#243041" />
          <text x="14" y="21" fill="#8fb7ff" font-size="12" font-family="Segoe UI, Arial, sans-serif">${escapeXml(metric.label)}</text>
          <text x="14" y="42" fill="#f8fafc" font-size="24" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${escapeXml(String(metric.value))}</text>
        </g>
      `;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="245" viewBox="0 0 520 245" role="img" aria-label="GitHub work card for ${escapeXml(owner)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
  </defs>
  <rect width="520" height="245" rx="18" fill="url(#bg)" />
  <rect x="1" y="1" width="518" height="243" rx="17" fill="none" stroke="#233045" />
  <text x="28" y="38" fill="#f8fafc" font-size="22" font-weight="700" font-family="Segoe UI, Arial, sans-serif">GitHub Work Snapshot</text>
  <text x="28" y="59" fill="#9ca3af" font-size="13" font-family="Segoe UI, Arial, sans-serif">${year} contributions fetched with authenticated GitHub API</text>
  ${tiles}
  <text x="28" y="223" fill="#7dd3fc" font-size="12" font-family="Segoe UI, Arial, sans-serif">Includes private activity visible to your token</text>
  <text x="360" y="223" fill="#9ca3af" font-size="12" font-family="Segoe UI, Arial, sans-serif">Updated ${updatedAt}</text>
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

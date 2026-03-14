import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const token = process.env.PROFILE_STATS_TOKEN || process.env.GITHUB_TOKEN;
const assetsDir = path.join(process.cwd(), "assets");
const configFile = path.join(process.cwd(), "config", "agentic-cards.json");
const legacyFiles = [
  "github-work-card.svg",
  "github-activity-overview.svg",
];

const now = new Date();
const year = now.getUTCFullYear();
const from = new Date(Date.UTC(year, 0, 1)).toISOString();
const to = new Date(Date.UTC(year, 11, 31, 23, 59, 59)).toISOString();

if (!token) {
  throw new Error("Missing PROFILE_STATS_TOKEN or GITHUB_TOKEN.");
}

const config = JSON.parse(await readFile(configFile, "utf8"));
const githubMetrics = await fetchGithubMetrics({ token, from, to });

await mkdir(assetsDir, { recursive: true });

for (const card of config.cards) {
  const metric = resolveMetric(card, githubMetrics);
  const svg = renderCard({
    card,
    metric,
    updatedAt: now.toISOString().slice(0, 10),
    year,
  });
  await writeFile(path.join(assetsDir, `agentic-${card.id}-card.svg`), svg, "utf8");
}

for (const file of legacyFiles) {
  await rm(path.join(assetsDir, file), { force: true });
}

async function fetchGithubMetrics({ token, from, to }) {
  const query = `
    query($from: DateTime!, $to: DateTime!) {
      viewer {
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
      "User-Agent": "MelvinRoy-agentic-cards",
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

  const contributions = payload.data.viewer.contributionsCollection;
  return {
    totalContributions: contributions.contributionCalendar.totalContributions,
    totalCommitContributions: contributions.totalCommitContributions,
    totalIssueContributions: contributions.totalIssueContributions,
    totalPullRequestContributions: contributions.totalPullRequestContributions,
    totalPullRequestReviewContributions: contributions.totalPullRequestReviewContributions,
    totalRepositoryContributions: contributions.totalRepositoryContributions,
    restrictedContributionsCount: contributions.restrictedContributionsCount,
  };
}

function resolveMetric(card, githubMetrics) {
  if (card.metricType === "custom") {
    return {
      value: String(card.metricValue),
      label: card.metricLabel,
    };
  }

  const metricValue = githubMetrics[card.metricKey];
  if (metricValue === undefined) {
    throw new Error(`Unsupported metricKey: ${card.metricKey}`);
  }

  return {
    value: String(metricValue),
    label: card.metricLabel,
  };
}

function renderCard({ card, metric, updatedAt, year }) {
  const accent = card.accent;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="152" viewBox="0 0 500 152" role="img" aria-label="${escapeXml(card.title)}">
  <rect width="500" height="152" rx="16" fill="#f6f8fa" />
  <rect x="1" y="1" width="498" height="150" rx="15" fill="none" stroke="#d0d7de" />
  <rect x="18" y="20" width="8" height="112" rx="4" fill="${accent}" />
  <text x="42" y="38" fill="#1f2328" font-size="22" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${escapeXml(card.title)}</text>
  <text x="470" y="38" fill="#656d76" font-size="11" text-anchor="end" font-family="Segoe UI, Arial, sans-serif">${escapeXml(`Updated ${updatedAt}`)}</text>
  <text x="42" y="62" fill="#57606a" font-size="13" font-family="Segoe UI, Arial, sans-serif">${escapeXml(card.descriptor)}</text>
  <rect x="42" y="80" width="180" height="38" rx="10" fill="#ffffff" stroke="#d8dee4" />
  <text x="56" y="95" fill="#57606a" font-size="11" font-family="Segoe UI, Arial, sans-serif">${escapeXml(metric.label.toUpperCase())}</text>
  <text x="56" y="112" fill="#1f2328" font-size="21" font-weight="700" font-family="Segoe UI, Arial, sans-serif">${escapeXml(metric.value)}</text>
  <text x="242" y="95" fill="#57606a" font-size="12" font-family="Segoe UI, Arial, sans-serif">Build Mode</text>
  <text x="242" y="114" fill="#1f2328" font-size="15" font-weight="600" font-family="Segoe UI, Arial, sans-serif">${escapeXml(card.modeLabel)}</text>
  <text x="42" y="134" fill="#656d76" font-size="11" font-family="Segoe UI, Arial, sans-serif">${escapeXml(`Agentic operating model card for ${year}`)}</text>
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

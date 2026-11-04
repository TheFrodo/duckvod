// Server-side only: used by server components (layout, changelog page).

// GitHub repository whose releases are shown as changelog.
const CHANGELOG_REPO = process.env.CHANGELOG_REPO || "TheFrodo/duckvod";
// Only releases cut from these branches are listed (no dev/test builds).
const RELEASE_BRANCHES = ["main", "master"];

export type Release = {
  tag: string;
  name: string;
  body: string;
  publishedAt: string;
  url: string;
};

type GitHubRelease = {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  html_url: string;
  target_commitish: string;
  draft: boolean;
  prerelease: boolean;
};

// Fetched on the server and cached for an hour, so visitors never contact GitHub
// directly and the anonymous API rate limit is not an issue.
export async function getMainReleases(): Promise<Release[]> {
  try {
    const response = await fetch(`https://api.github.com/repos/${CHANGELOG_REPO}/releases?per_page=50`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "DuckVOD-Changelog" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return [];

    const releases = (await response.json()) as GitHubRelease[];
    return releases
      .filter((r) => !r.draft && !r.prerelease && RELEASE_BRANCHES.includes(r.target_commitish))
      .map((r) => ({
        tag: r.tag_name,
        name: r.name?.trim() || r.tag_name,
        body: r.body?.trim() ?? "",
        publishedAt: r.published_at ?? "",
        url: r.html_url,
      }));
  } catch {
    return [];
  }
}

export async function getLatestReleaseTag(): Promise<string | null> {
  const releases = await getMainReleases();
  return releases[0]?.tag ?? null;
}

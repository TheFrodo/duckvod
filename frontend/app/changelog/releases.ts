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
  prerelease: boolean;
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
// directly and the anonymous API rate limit is not an issue. Includes pre-releases.
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
      .filter((r) => !r.draft && RELEASE_BRANCHES.includes(r.target_commitish))
      .map((r) => ({
        tag: r.tag_name,
        name: r.name?.trim() || r.tag_name,
        body: r.body?.trim() ?? "",
        publishedAt: r.published_at ?? "",
        url: r.html_url,
        prerelease: r.prerelease,
      }));
  } catch {
    return [];
  }
}

/** Latest full release; pre-releases never count as the current version. */
export async function getLatestReleaseTag(): Promise<string | null> {
  const releases = await getMainReleases();
  return releases.find((r) => !r.prerelease)?.tag ?? null;
}

/**
 * Whether this build's tag is published as a pre-release. Promoting the release
 * on GitHub clears this after the cache expires, without a new image.
 */
export async function isPrereleaseBuild(tag: string | undefined): Promise<boolean> {
  if (!tag) return false;
  const releases = await getMainReleases();
  return releases.some((r) => r.prerelease && r.tag === tag);
}

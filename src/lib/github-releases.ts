import "server-only";

export type PublishedGitHubRelease = {
  id: number;
  name: string | null;
  tagName: string;
  publishedAt: string;
  body: string;
  htmlUrl: string;
  prerelease: boolean;
};

type GitHubReleaseResponse = {
  id: number;
  name: string | null;
  tag_name: string;
  published_at: string | null;
  body: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
};

const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/CassetteTech/CassetteUI/releases";
const REVALIDATE_SECONDS = 300;

export async function getPublishedGitHubReleases(): Promise<
  PublishedGitHubRelease[]
> {
  const token = process.env.GITHUB_TOKEN;
  const isDevelopment = process.env.NODE_ENV === "development";
  const fetchOptions: RequestInit & { next?: { revalidate: number } } = {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(isDevelopment
      ? { cache: "no-store" }
      : { next: { revalidate: REVALIDATE_SECONDS } }),
  };

  let response: Response;
  try {
    response = await fetch(GITHUB_RELEASES_URL, fetchOptions);
  } catch (error) {
    console.warn("[github-releases] Failed to fetch releases.", error);
    return [];
  }

  if (!response.ok) {
    console.warn(
      `[github-releases] GitHub API returned ${response.status}; returning empty release list.`,
    );
    return [];
  }

  let releases: GitHubReleaseResponse[];
  try {
    releases = (await response.json()) as GitHubReleaseResponse[];
  } catch (error) {
    console.warn("[github-releases] Failed to parse releases response.", error);
    return [];
  }

  return releases
    .filter((release) => !release.draft && Boolean(release.published_at))
    .sort((a, b) => {
      const aTime = new Date(a.published_at ?? "").getTime();
      const bTime = new Date(b.published_at ?? "").getTime();
      return bTime - aTime;
    })
    .map((release) => ({
      id: release.id,
      name: release.name,
      tagName: release.tag_name,
      publishedAt: release.published_at as string,
      body: release.body ?? "",
      htmlUrl: release.html_url,
      prerelease: release.prerelease,
    }));
}

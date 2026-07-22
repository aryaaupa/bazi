/** @type {import("next").NextConfig} */
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isGitHubPages = process.env.GITHUB_ACTIONS === "true";
const basePath = isGitHubPages && repo && !repo.endsWith(".github.io") ? `/${repo}` : "";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;

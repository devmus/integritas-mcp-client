/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/mcp",
  // no assetPrefix needed; basePath covers _next/static and _next/image
  // next/image works out of the box with basePath
};

module.exports = nextConfig;

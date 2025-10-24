/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Allow Next.js to bundle tesseract.js (avoid externalization issues)
      // Only externalize sharp for image processing
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};
      config.resolve.fallback.fs = false;
    }
    return config;
  },
};

module.exports = nextConfig;

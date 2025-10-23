/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["tesseract.js", "tesseract.js-core"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure tesseract packages are required at runtime, not bundled
      config.externals = Array.isArray(config.externals)
        ? [
            ...config.externals,
            { "tesseract.js": "commonjs tesseract.js" },
            { "tesseract.js-core": "commonjs tesseract.js-core" },
          ]
        : config.externals;
    }
    return config;
  },
};

module.exports = nextConfig;

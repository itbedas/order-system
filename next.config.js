// next.config.js
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // "@/..." artık proje köküne işaret eder
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
};

module.exports = nextConfig;

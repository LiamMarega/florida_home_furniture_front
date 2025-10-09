/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Commented out to enable API routes and middleware
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    ],
  },
};

module.exports = nextConfig;

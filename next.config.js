/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Commented out to enable API routes and middleware
  
  // Optimizaciones de rendimiento
  reactStrictMode: true,
  
  // Optimización de compilación
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // ESLint — moved to eslint.config.* (flat config) in Next.js 16

  // Configuración de imágenes optimizadas
  images: {
    // Cambiar a false en producción para mejor rendimiento
    unoptimized: process.env.NODE_ENV !== 'production',
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
    
   
      {
        protocol: 'https',
        hostname: 'vendure-server-production-60d5.up.railway.app',
      },
      {
        protocol: 'https',
        hostname: 'admin.floridahomefurniture.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  // Headers para SEO y seguridad
  async headers() {
    const headers = [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];

    // Credentialed CORS for http://localhost:3001, in development only: in production the storefront
    // calls its own API routes from the same origin, and no other origin may call them with cookies.
    if (process.env.NODE_ENV !== 'production') {
      headers.push({
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:3001' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Cookie' },
        ],
      });
    }

    return headers;
  },

  // Experimental features para mejor rendimiento
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

module.exports = nextConfig;

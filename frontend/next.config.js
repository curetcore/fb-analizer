/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  },
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    // Only add rewrite if API URL is available
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return apiUrl ? [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ] : [];
  },
}

module.exports = nextConfig
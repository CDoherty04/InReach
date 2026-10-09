import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['mongodb', 'mongodb-memory-server', 'unpdf', 'stripe'],
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
  async redirects() {
    return [{ source: '/', destination: '/doctor', permanent: false }]
  },
}

export default nextConfig

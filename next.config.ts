import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['mongodb', 'mongodb-memory-server', 'unpdf'],
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
}

export default nextConfig

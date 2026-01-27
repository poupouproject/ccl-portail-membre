import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimisations pour PWA
  reactStrictMode: true,
  
  // Configuration des images externes (Supabase Storage)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  onDemandEntries: {
    maxInactiveAge: 30 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;

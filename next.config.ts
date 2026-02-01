import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimisations pour PWA
  reactStrictMode: true,
  
  // Configuration des images externes (Supabase Storage, YouTube, etc.)
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
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
    ],
  },
  onDemandEntries: {
    maxInactiveAge: 30 * 1000,
    pagesBufferLength: 5,
  },
};

export default nextConfig;

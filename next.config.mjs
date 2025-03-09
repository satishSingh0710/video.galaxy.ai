/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static file serving for videos
  output: 'standalone',
  // Configure headers to allow video playback
  async headers() {
    return [
      {
        source: '/videos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'video/mp4',
          },
        ],
      },
    ];
  },
  // Configure allowed image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '**',
      }
    ],
  },
  // Fix for esbuild module error
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      use: 'null-loader',
    });
    return config;
  },
};

export default nextConfig; 
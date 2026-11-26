/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  async redirects() {
    return [{ source: "/:path*", has: [{ type: "host", value: "www.viviantour.com.br" }], destination: "https://viviantour.com.br/:path*", permanent: true }];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://3.143.7.14:8000/api/:path*',
      },
    ]
  },
}

export default nextConfig
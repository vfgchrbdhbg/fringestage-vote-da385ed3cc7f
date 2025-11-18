import webpack from 'webpack';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/:path*.wasm',
        headers: [
          { key: 'Content-Type', value: 'application/wasm' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
  webpack: (config, { isServer, webpack }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    // Enable async WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Completely ignore fhevmjs on server side
    if (isServer) {
      config.externals.push('fhevmjs');
    }

    // Add rule to handle WASM files as assets
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // Ignore WASM imports during build
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\.wasm$/,
        contextRegExp: /fhevmjs/,
      })
    );

    return config;
  },
};

export default nextConfig;


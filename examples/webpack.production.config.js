const path = require('node:path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: 'production',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'oxc-loader',
          options: {
            // Disable source maps in production for smaller bundles
            sourcemap: false,

            // No React Fast Refresh in production
            refresh: false,

            // TypeScript configuration
            typescript: {
              onlyRemoveTypeImports: true,
              declaration: false,
            },

            // JSX configuration for production
            jsx: {
              runtime: 'automatic',
              development: false,
              pure: true, // Enable pure annotations for tree shaking
            },

            // Target older browsers for wider compatibility
            target: ['es2018', 'chrome70', 'firefox65', 'safari12'],

            // Production optimizations
            assumptions: {
              setPublicClassFields: true,
              noDocumentAll: true,
              pureGetters: true,
            },

            // Helper configuration
            helpers: {
              mode: 'Runtime', // Use runtime helpers for smaller bundles
            },
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
    }),
  ],
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
}

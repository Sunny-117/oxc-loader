const path = require('node:path')
const process = require('node:process')
const ReactRefreshPlugin = require('@rspack/plugin-react-refresh')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const isDev = (process.env.NODE_ENV || 'development') === 'development'

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
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
            // Enable source maps
            sourcemap: true,

            // Enable React Fast Refresh in development
            refresh: isDev,

            // TypeScript configuration
            typescript: {
              onlyRemoveTypeImports: true,
              rewriteImportExtensions: 'rewrite', // Rewrite .ts to .js extensions
            },

            // JSX configuration
            jsx: {
              runtime: 'automatic',
              development: isDev,
              importSource: 'react',
              pure: true, // Mark React calls as pure for tree shaking
            },

            // Target configuration
            target: ['es2020', 'chrome80', 'firefox80', 'safari14'],

            // Compiler assumptions
            assumptions: {
              setPublicClassFields: true,
              noDocumentAll: true,
              pureGetters: true,
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
    }),
    // Provides the $RefreshSig$ / $RefreshReg$ runtime required by the
    // refresh transform injected by oxc-loader when `refresh: true`.
    isDev && new ReactRefreshPlugin(),
  ].filter(Boolean),
  devServer: {
    hot: true,
    port: 3000,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
}

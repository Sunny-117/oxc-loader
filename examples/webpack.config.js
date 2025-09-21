const path = require('node:path')
const process = require('node:process')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: process.env.NODE_ENV || 'development',
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
            refresh: process.env.NODE_ENV === 'development',

            // TypeScript configuration
            typescript: {
              onlyRemoveTypeImports: true,
              declaration: false, // Set to true if you need .d.ts files
            },

            // JSX configuration (auto-detected for .jsx/.tsx files)
            jsx: {
              runtime: 'automatic',
              development: process.env.NODE_ENV === 'development',
              importSource: 'react',
            },

            // Target modern browsers
            target: ['es2020', 'chrome80', 'firefox80', 'safari14'],

            // Compiler assumptions for smaller output
            assumptions: {
              setPublicClassFields: true,
              noDocumentAll: true,
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
  ],
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

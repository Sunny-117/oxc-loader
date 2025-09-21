# oxc-loader Examples

This directory contains example configurations for using oxc-loader with different bundlers and setups.

## Files

- `webpack.config.js` - Basic webpack configuration for development
- `webpack.production.config.js` - Optimized webpack configuration for production
- `rspack.config.js` - Rspack configuration
- `package.json` - Example package.json with necessary dependencies
- `tsconfig.json` - TypeScript configuration
- `src/` - Example React TypeScript application

## Getting Started

1. Copy the files to your project directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Run development server:
   ```bash
   # With webpack
   npm run dev

   # With rspack
   npm run dev:rspack
   ```

4. Build for production:
   ```bash
   # With webpack
   npm run build

   # With rspack
   npm run build:rspack
   ```

## Key Features Demonstrated

- TypeScript compilation with type stripping
- React JSX transformation with automatic runtime
- React Fast Refresh for development
- Source map generation
- Production optimizations
- Modern browser targeting

## Configuration Highlights

### Development Features
- React Fast Refresh enabled
- Source maps for debugging
- Hot module replacement

### Production Optimizations
- Disabled source maps for smaller bundles
- Pure annotations for better tree shaking
- Runtime helpers for reduced bundle size
- Optimized target browsers

## Customization

You can customize the oxc-loader options in the webpack/rspack configuration files:

```json
{
  "loader": "oxc-loader",
  "options": {
    // Your custom options here
    "typescript": { /* TypeScript options */ },
    "jsx": { /* JSX options */ },
    "target": ["es2020"] // Target browsers/environments
    // ... more options
  }
}
```

For all available options, see the [main README](../README.md).

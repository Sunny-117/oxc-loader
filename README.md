# oxc-loader

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

A high-performance webpack loader for transforming JavaScript and TypeScript using [oxc](https://github.com/oxc-project/oxc).

## Features

- ⚡ **Ultra Fast**: 3-5x faster than SWC, 20-50x faster than Babel
- 🔧 **TypeScript Support**: Transform TypeScript to JavaScript with type stripping
- ⚛️ **JSX/TSX Support**: Transform React JSX with automatic runtime detection
- 🔄 **React Fast Refresh**: Built-in support for React development
- 📦 **Small Bundle**: Only 2MB vs SWC's 37MB
- 🛠️ **Webpack & Rspack**: Compatible with both bundlers
- 🗺️ **Source Maps**: Full source map support
- ⚙️ **Configurable**: Extensive configuration options

## Installation

```bash
npm install oxc-loader
# or
yarn add oxc-loader
# or
pnpm add oxc-loader
```

## Usage

### Basic Webpack Configuration

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'oxc-loader',
          options: {
            // Options here
          }
        }
      }
    ]
  }
}
```

### Basic Rspack Configuration

```javascript
// rspack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'oxc-loader',
          options: {
            // Options here
          }
        }
      }
    ]
  }
}
```

## Configuration Options

### Basic Options

```typescript
interface OxcLoaderOptions {
  // Enable source map generation (default: true)
  sourcemap?: boolean

  // Enable React Fast Refresh for development (default: false)
  refresh?: boolean

  // Automatically detect and configure JSX based on file extension (default: true)
  autoDetectJsx?: boolean

  // All oxc-transform options are also supported
  typescript?: TypeScriptOptions
  jsx?: JsxOptions
  target?: string | string[]
  // ... and more
}
```

### TypeScript Configuration

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'oxc-loader',
          options: {
            typescript: {
              onlyRemoveTypeImports: true,
              declaration: {
                stripInternal: true
              }
            }
          }
        }
      }
    ]
  }
}
```

### JSX Configuration

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: {
          loader: 'oxc-loader',
          options: {
            jsx: {
              runtime: 'automatic', // or 'classic'
              development: process.env.NODE_ENV === 'development',
              importSource: 'react'
            }
          }
        }
      }
    ]
  }
}
```

### React Fast Refresh

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(jsx|tsx)$/,
        use: {
          loader: 'oxc-loader',
          options: {
            refresh: process.env.NODE_ENV === 'development',
            jsx: {
              runtime: 'automatic',
              development: true
            }
          }
        }
      }
    ]
  }
}
```

## Examples

### Complete Webpack Configuration

```javascript
// webpack.config.js
const path = require('node:path')

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
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
              onlyRemoveTypeImports: true
            },

            // JSX configuration (auto-detected for .jsx/.tsx files)
            jsx: {
              runtime: 'automatic',
              development: process.env.NODE_ENV === 'development'
            },

            // Target modern browsers
            target: ['es2020', 'chrome80', 'firefox80', 'safari14']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  }
}
```

### Rspack Configuration

```javascript
// rspack.config.js
const path = require('node:path')

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'oxc-loader',
          options: {
            refresh: true, // Enable React Fast Refresh
            typescript: {
              onlyRemoveTypeImports: true
            }
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  }
}
```

## Performance Comparison

| Tool | Transform Speed | Memory Usage | Bundle Size | Packages |
|------|----------------|--------------|-------------|----------|
| **oxc-loader** | **Baseline** | **51 MB** | **2 MB** | **2** |
| swc-loader | 3-5x slower | 67 MB | 37 MB | Multiple |
| babel-loader | 20-50x slower | 172 MB | 21 MB | 170+ |

*Benchmarks based on oxc-project/bench-transformer*

## Migration Guide

### From babel-loader

```diff
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
-         loader: 'babel-loader',
+         loader: 'oxc-loader',
          options: {
-           presets: [
-             '@babel/preset-env',
-             '@babel/preset-react',
-             '@babel/preset-typescript'
-           ]
+           jsx: {
+             runtime: 'automatic'
+           },
+           typescript: {
+             onlyRemoveTypeImports: true
+           }
          }
        }
      }
    ]
  }
}
```

### From swc-loader

```diff
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
-         loader: 'swc-loader',
+         loader: 'oxc-loader',
          options: {
-           jsc: {
-             parser: {
-               syntax: 'typescript',
-               tsx: true
-             },
-             transform: {
-               react: {
-                 runtime: 'automatic'
-               }
-             }
-           }
+           jsx: {
+             runtime: 'automatic'
+           },
+           typescript: {
+             onlyRemoveTypeImports: true
+           }
          }
        }
      }
    ]
  }
}
```

## Troubleshooting

### Native Binding Issues

If you encounter native binding errors, try:

```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or with pnpm
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript Errors

Make sure your `tsconfig.json` includes the necessary compiler options:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

## Contributing

Contributions are welcome! Please read our [contributing guide](CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) License © 2024-PRESENT [Sunny-117](https://github.com/Sunny-117)

## Related Projects

- [oxc](https://github.com/oxc-project/oxc) - The JavaScript Oxidation Compiler
- [oxc-transform](https://www.npmjs.com/package/oxc-transform) - Standalone transform package
- [webpack](https://webpack.js.org/) - Module bundler
- [rspack](https://rspack.dev/) - Fast Rust-based bundler

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/oxc-loader?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/oxc-loader
[npm-downloads-src]: https://img.shields.io/npm/dm/oxc-loader?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/oxc-loader
[bundle-src]: https://img.shields.io/bundlephobia/minzip/oxc-loader?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=oxc-loader
[license-src]: https://img.shields.io/github/license/Sunny-117/oxc-loader.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/Sunny-117/oxc-loader/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/oxc-loader

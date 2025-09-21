import path from 'node:path'
import type { LoaderContext } from 'webpack'
import { type TransformOptions, transform } from 'oxc-transform'

export interface OxcLoaderOptions extends Omit<TransformOptions, 'sourcemap'> {
  /**
   * Enable source map generation
   * @default true
   */
  sourcemap?: boolean

  /**
   * Enable React Fast Refresh for development
   * @default false
   */
  refresh?: boolean

  /**
   * Automatically detect and configure JSX based on file extension
   * @default true
   */
  autoDetectJsx?: boolean
}

/**
 * Oxc webpack loader for transforming JavaScript and TypeScript files
 */
function oxcLoader(this: LoaderContext<OxcLoaderOptions>, source: string): void {
  // Get the callback for async operation
  const callback = this.async()
  if (!callback) {
    throw new Error('oxc-loader requires async operation')
  }

  try {
    // Get loader options from webpack loader context
    const options: OxcLoaderOptions = this.getOptions() || {}

    // Get file information
    const filename = this.resourcePath
    const ext = path.extname(filename).slice(1)

    // Determine language from file extension
    let lang: TransformOptions['lang']
    switch (ext) {
      case 'ts':
        lang = 'ts'
        break
      case 'tsx':
        lang = 'tsx'
        break
      case 'jsx':
        lang = 'jsx'
        break
      case 'js':
      default:
        lang = 'js'
        break
    }

    // Auto-detect JSX configuration
    const shouldConfigureJsx = options.autoDetectJsx !== false && (lang === 'jsx' || lang === 'tsx')

    // Prepare JSX options
    let jsxOptions = options.jsx
    if (shouldConfigureJsx && !jsxOptions) {
      jsxOptions = {
        runtime: 'automatic',
        development: this.mode === 'development',
        refresh: options.refresh && this.mode === 'development',
      }
    }
    else if (shouldConfigureJsx && typeof jsxOptions === 'object') {
      // Merge with defaults
      jsxOptions = {
        runtime: 'automatic',
        development: this.mode === 'development',
        refresh: options.refresh && this.mode === 'development',
        ...jsxOptions,
      }
    }

    // Prepare transform options by excluding custom options
    const { autoDetectJsx, refresh, ...oxcOptions } = options
    const transformOptions: TransformOptions = {
      ...oxcOptions,
      lang,
      jsx: jsxOptions,
      sourcemap: options.sourcemap !== false, // Default to true
      cwd: this.rootContext,
    }

    // Transform the source code
    const result = transform(filename, source, transformOptions)

    // Handle errors
    if (result.errors.length > 0) {
      const errorMessages = result.errors.map(error =>
        `${error.message}${error.codeframe ? `\n${error.codeframe}` : ''}`,
      ).join('\n\n')

      return callback(new Error(`Oxc transform errors:\n${errorMessages}`))
    }

    // Return transformed code with source map
    // Convert oxc SourceMap to webpack-compatible format
    const sourceMap = result.map
      ? {
          version: result.map.version,
          sources: result.map.sources,
          names: result.map.names,
          mappings: result.map.mappings,
          file: result.map.file || filename,
          sourcesContent: result.map.sourcesContent,
          sourceRoot: result.map.sourceRoot,
        }
      : undefined

    callback(null, result.code, sourceMap)
  }
  catch (error) {
    callback(error instanceof Error ? error : new Error(String(error)))
  }
}

export default oxcLoader

import type { TransformOptions } from 'oxc-transform'
import type { LoaderContext } from 'webpack'
import path from 'node:path'
import { getTsconfig } from 'get-tsconfig'

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

  /**
   * Enable automatic tsconfig.json detection and configuration
   * @default true
   */
  useTsconfig?: boolean

  /**
   * Custom path to tsconfig.json file
   * If not specified, will search for tsconfig.json in the project
   */
  tsconfigPath?: string
}

/**
 * Extract relevant options from tsconfig.json for oxc-transform
 */
function extractTsconfigOptions(tsconfigPath: string): Partial<TransformOptions> {
  try {
    const tsconfig = getTsconfig(tsconfigPath)
    if (!tsconfig) {
      return {}
    }

    const { compilerOptions } = tsconfig.config
    if (!compilerOptions) {
      return {}
    }

    const options: Partial<TransformOptions> = {}

    // Map TypeScript compiler options to oxc-transform options
    if (compilerOptions.target) {
      // Convert TypeScript target to oxc target
      const targetMap: Record<string, string> = {
        ES3: 'es3',
        ES5: 'es5',
        ES6: 'es2015',
        ES2015: 'es2015',
        ES2016: 'es2016',
        ES2017: 'es2017',
        ES2018: 'es2018',
        ES2019: 'es2019',
        ES2020: 'es2020',
        ES2021: 'es2021',
        ES2022: 'es2022',
        ESNext: 'esnext',
      }
      const target = targetMap[compilerOptions.target.toUpperCase()]
      if (target) {
        options.target = target
      }
    }

    // Handle JSX configuration
    if (compilerOptions.jsx) {
      const jsxOptions: any = {}

      switch (compilerOptions.jsx) {
        case 'react':
          jsxOptions.runtime = 'classic'
          break
        case 'react-jsx':
          jsxOptions.runtime = 'automatic'
          break
        case 'react-jsxdev':
          jsxOptions.runtime = 'automatic'
          jsxOptions.development = true
          break
        case 'preserve':
          // Don't transform JSX
          break
      }

      if (compilerOptions.jsxFactory) {
        jsxOptions.pragma = compilerOptions.jsxFactory
      }

      if (compilerOptions.jsxFragmentFactory) {
        jsxOptions.pragmaFrag = compilerOptions.jsxFragmentFactory
      }

      if (compilerOptions.jsxImportSource) {
        jsxOptions.importSource = compilerOptions.jsxImportSource
      }

      if (Object.keys(jsxOptions).length > 0) {
        options.jsx = jsxOptions
      }
    }

    // Handle TypeScript-specific options
    const typescriptOptions: any = {}

    if (compilerOptions.allowImportingTsExtensions) {
      typescriptOptions.rewrite_import_extensions = 'rewrite'
    }

    if (compilerOptions.verbatimModuleSyntax) {
      typescriptOptions.only_remove_type_imports = true
    }

    if (Object.keys(typescriptOptions).length > 0) {
      options.typescript = typescriptOptions
    }
    return options
  }
  catch (error) {
    // If tsconfig.json reading fails, return empty options
    console.warn(`Failed to read tsconfig.json: ${error}`)
    return {}
  }
}

/**
 * Oxc webpack loader for transforming JavaScript and TypeScript files
 */
async function oxcLoader(this: LoaderContext<OxcLoaderOptions>, source: string): Promise<void> {
  // Get the callback for async operation
  const callback = this.async()
  if (!callback) {
    throw new Error('oxc-loader requires async operation')
  }

  try {
    // Dynamic import to handle ESM module
    const { transform } = await import('oxc-transform')
    // Get loader options from webpack loader context
    const options: OxcLoaderOptions = this.getOptions() || {}

    // Extract tsconfig.json options if enabled
    let tsconfigOptions: Partial<TransformOptions> = {}
    if (options.useTsconfig !== false) {
      const tsconfigPath = options.tsconfigPath || this.rootContext
      tsconfigOptions = extractTsconfigOptions(tsconfigPath)
    }

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
    const { autoDetectJsx, refresh, useTsconfig, tsconfigPath, ...oxcOptions } = options

    // Merge tsconfig options with user options (user options take precedence)
    const mergedOptions = {
      ...tsconfigOptions,
      ...oxcOptions,
    }

    const tsconfigJsxOption = tsconfigOptions.jsx
    const tsconfigJsxOptions = typeof tsconfigJsxOption === 'object' && tsconfigJsxOption !== null
      ? tsconfigJsxOption
      : undefined

    const jsxOptionsObject = typeof jsxOptions === 'object' && jsxOptions !== null
      ? jsxOptions
      : undefined

    let finalJsx: TransformOptions['jsx'] | undefined

    if (jsxOptions === 'preserve') {
      finalJsx = 'preserve'
    }
    else if (jsxOptionsObject || tsconfigJsxOptions) {
      const mergedJsx = {
        ...tsconfigJsxOptions,
        ...jsxOptionsObject,
      }
      finalJsx = Object.keys(mergedJsx).length > 0 ? mergedJsx : undefined
    }
    else if (tsconfigJsxOption === 'preserve') {
      finalJsx = 'preserve'
    }

    const transformOptions: TransformOptions = {
      ...mergedOptions,
      lang,
      jsx: finalJsx,
      sourcemap: options.sourcemap !== false, // Default to true
      cwd: this.rootContext,
    }

    // Transform the source code
    const result = await transform(filename, source, transformOptions)

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

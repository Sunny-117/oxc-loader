import type { LoaderContext } from 'webpack'
import type { OxcLoaderOptions } from '../src/index'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import webpack from 'webpack'
import oxcLoader, { makeLoader } from '../src/index'

// ─── Original helper (preserved) ────────────────────────────────────────────

function createMockLoaderContext(options: Partial<LoaderContext<OxcLoaderOptions>> = {}): LoaderContext<OxcLoaderOptions> {
  const mockCallback = vi.fn()

  return {
    async: () => mockCallback,
    getOptions: () => (options as any).getOptions?.() || {},
    resourcePath: options.resourcePath || '/test/file.js',
    rootContext: options.rootContext || '/test',
    mode: options.mode || 'development',
    sourceMap: false,
    ...options,
  } as any
}

// ─── Helper for supplementary tests ─────────────────────────────────────────

function createMockContext(
  overrides: Partial<LoaderContext<OxcLoaderOptions>> & { loaderOptions?: OxcLoaderOptions } = {},
): LoaderContext<OxcLoaderOptions> {
  const { loaderOptions = {}, ...rest } = overrides
  return {
    async: vi.fn(() => vi.fn()),
    getOptions: () => loaderOptions,
    resourcePath: '/test/file.js',
    rootContext: '/test',
    mode: 'production',
    sourceMap: false,
    ...rest,
  } as unknown as LoaderContext<OxcLoaderOptions>
}

async function runLoader(
  source: string,
  contextOverrides: Parameters<typeof createMockContext>[0] = {},
): Promise<[Error | null, string | undefined, unknown]> {
  return new Promise((resolve) => {
    const callback = vi.fn((...args: unknown[]) =>
      resolve(args as [Error | null, string | undefined, unknown]),
    )
    const ctx = createMockContext(contextOverrides)
    ;(ctx.async as ReturnType<typeof vi.fn>).mockReturnValue(callback)
    oxcLoader.call(ctx, source)
  })
}

/**
 * Integration helper: compile an entry file through a real webpack build and
 * return a map of { filename → content } for every file emitted to the output
 * directory.  This validates end-to-end behaviour including loader discovery.
 */
function compile(
  entry: string,
  loaderOptions: OxcLoaderOptions = {},
  webpackOptions: webpack.Configuration = {},
): Promise<Record<string, string>> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oxc-loader-test-'))

  // Point webpack directly at the built CJS dist so there is no
  // TypeScript-compilation step required inside the webpack process.
  const loaderPath = path.resolve(__dirname, '../dist/index.cjs')

  const compiler = webpack({
    mode: 'none',
    entry,
    output: { path: tmpDir, filename: 'bundle.js' },
    externals: [/^react/, /^@oxc-project\//],
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: { loader: loaderPath, options: loaderOptions },
        },
      ],
    },
    ...webpackOptions,
  })

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) { reject(err); return }
      if (stats?.hasErrors()) {
        reject(new Error(stats.compilation.errors.map(e => e.message).join('\n')))
        return
      }
      const files: Record<string, string> = {}
      for (const file of fs.readdirSync(tmpDir)) {
        files[file] = fs.readFileSync(path.join(tmpDir, file), 'utf-8')
      }
      fs.rmSync(tmpDir, { recursive: true })
      resolve(files)
    })
  })
}

const FIXTURES = path.join(__dirname, 'fixtures')

describe('oxc-loader', () => {
  it('should transform JavaScript code', async () => {
    const source = 'const x = 1; export default x;'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/file.js',
      getOptions: () => ({}) as any,
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    await oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
    const [error, code] = callback.mock.calls[0]
    expect(error).toBeNull()
    expect(code).toContain('const x = 1')
  })

  it('should transform TypeScript code', async () => {
    const source = 'const x: number = 1; export default x;'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/file.ts',
      getOptions: () => ({}) as any,
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    await oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
    const [error, code] = callback.mock.calls[0]
    expect(error).toBeNull()
    expect(code).toContain('const x = 1')
    expect(code).not.toContain(': number')
  })

  it('should transform JSX code with automatic runtime', async () => {
    const source = 'export default function App() { return <div>Hello</div>; }'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/App.jsx',
      getOptions: () => ({}) as any,
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    await oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
    const [error, code] = callback.mock.calls[0]
    expect(error).toBeNull()
    expect(code).toContain('jsx')
  })

  it('should transform TSX code', async () => {
    const source = 'interface Props { name: string } export default function App(props: Props) { return <div>{props.name}</div>; }'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/App.tsx',
      getOptions: () => ({}) as any,
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    await oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
    const [error, code] = callback.mock.calls[0]
    expect(error).toBeNull()
    expect(code).not.toContain('interface Props')
    expect(code).not.toContain(': Props')
  })

  it('should handle custom JSX options', async () => {
    const source = 'export default function App() { return <div>Hello</div>; }'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/App.jsx',
      getOptions: () => ({
        jsx: {
          runtime: 'classic',
          pragma: 'h',
        },
      }) as any,
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    await oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
    const [error, code] = callback.mock.calls[0]
    expect(error).toBeNull()
    expect(code).toContain('h(')
  })

  it('should enable React Refresh in development mode', async () => {
    const source = 'export default function App() { return <div>Hello</div>; }'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/App.jsx',
      mode: 'development',
      getOptions: () => ({
        refresh: true,
      }) as any,
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    await oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
    const [error, code] = callback.mock.calls[0]
    expect(error).toBeNull()
    expect(code.includes('$RefreshReg$') || code.includes('$RefreshSig$')).toBe(true)
  })

  it('should disable sourcemap when configured', async () => {
    const source = 'const x = 1; export default x;'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/file.js',
      getOptions: () => ({
        sourcemap: false,
      }) as any,
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    await oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
  })

  it('should handle transform errors gracefully', async () => {
    const source = 'const x = ; // Invalid syntax'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/file.js',
      getOptions: () => ({}) as any,
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    await oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(expect.any(Error))
    const [error] = callback.mock.calls[0]
    expect(error.message).toContain('Oxc transform errors')
  })

  it('should pass through TypeScript options', async () => {
    const source = 'class Test { private x: number = 1; }'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/file.ts',
      getOptions: () => ({
        typescript: {
          onlyRemoveTypeImports: true,
        },
      }) as any,
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    await oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
    const [error, code] = callback.mock.calls[0]
    expect(error).toBeNull()
    expect(code).toContain('class Test')
  })

  describe('tsconfig.json support', () => {
    it('should disable tsconfig.json reading when useTsconfig is false', async () => {
      const source = 'const x: number = 1; export default x;'
      const mockContext = createMockLoaderContext({
        resourcePath: '/test/file.ts',
        rootContext: '/test',
        getOptions: () => ({ useTsconfig: false }) as any,
      })

      const callback = vi.fn()
      mockContext.async = () => callback

      await oxcLoader.call(mockContext, source)

      expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
      const [error, code] = callback.mock.calls[0]
      expect(error).toBeNull()
      expect(code).toContain('const x = 1')
    })

    it('should handle missing tsconfig.json gracefully', async () => {
      const source = 'const x: number = 1; export default x;'
      const mockContext = createMockLoaderContext({
        resourcePath: '/test/file.ts',
        rootContext: '/nonexistent',
        getOptions: () => ({ useTsconfig: true }) as any,
      })

      const callback = vi.fn()
      mockContext.async = () => callback

      await oxcLoader.call(mockContext, source)

      expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
      const [error, code] = callback.mock.calls[0]
      expect(error).toBeNull()
      expect(code).toContain('const x = 1')
    })

    it('should use custom tsconfig path when specified', async () => {
      const source = 'const x: number = 1; export default x;'
      const mockContext = createMockLoaderContext({
        resourcePath: '/test/file.ts',
        rootContext: '/test',
        getOptions: () => ({ useTsconfig: true, tsconfigPath: '/custom/path/tsconfig.json' }) as any,
      })

      const callback = vi.fn()
      mockContext.async = () => callback

      await oxcLoader.call(mockContext, source)

      expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
      const [error, code] = callback.mock.calls[0]
      expect(error).toBeNull()
      expect(code).toContain('const x = 1')
    })

    it('should merge tsconfig options with user options (user takes precedence)', async () => {
      const source = 'export default function App() { return <div>Hello</div>; }'
      const mockContext = createMockLoaderContext({
        resourcePath: '/test/App.tsx',
        rootContext: '/test',
        getOptions: () => ({
          useTsconfig: true,
          jsx: { runtime: 'classic', pragma: 'h' },
        }) as any,
      })

      const callback = vi.fn()
      mockContext.async = () => callback

      await oxcLoader.call(mockContext, source)

      expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
      const [error, code] = callback.mock.calls[0]
      expect(error).toBeNull()
      expect(code).toContain('h(')
    })
  })

  // ── Supplementary tests for new features ───────────────────────────────────

  it('should promote .js to jsx lang when jsx options are supplied', async () => {
    const [err, code] = await runLoader(
      'import React from "react"; export default () => <div/>;',
      { resourcePath: '/test/file.js', loaderOptions: { jsx: { runtime: 'classic', pragma: 'React.createElement' } } },
    )
    expect(err).toBeNull()
    expect(code).toContain('React.createElement')
  })

  it('should promote .ts to tsx lang when jsx options are supplied', async () => {
    const [err, code] = await runLoader(
      'import React from "react"; const x: number = 1; export default () => <div>{x}</div>;',
      { resourcePath: '/test/file.ts', loaderOptions: { jsx: { runtime: 'classic', pragma: 'React.createElement' } } },
    )
    expect(err).toBeNull()
    expect(code).not.toContain(': number')
    expect(code).toContain('React.createElement')
  })

  it('should not override user-supplied development: false even in webpack development mode', async () => {
    const [err, code] = await runLoader(
      'export default function App() { return <div/>; }',
      { resourcePath: '/test/App.jsx', mode: 'development', loaderOptions: { jsx: { runtime: 'automatic', development: false } } },
    )
    expect(err).toBeNull()
    expect(code).toContain('react/jsx-runtime')
    expect(code).not.toContain('jsx-dev-runtime')
  })

  it('should fall back to webpack this.sourceMap when sourcemap option is absent', async () => {
    const [, , mapOn] = await runLoader('const x = 1;', { sourceMap: true })
    expect(mapOn).toBeDefined()

    const [, , mapOff] = await runLoader('const x = 1;', { sourceMap: false })
    expect(mapOff).toBeUndefined()
  })

  it('should work in sync mode', async () => {
    const [err, code] = await runLoader('const x: number = 1; export default x;', {
      resourcePath: '/test/file.ts',
      loaderOptions: { sync: true },
    })
    expect(err).toBeNull()
    expect(code).toContain('const x = 1')
    expect(code).not.toContain(': number')
  })

  it('should report errors correctly in sync mode', async () => {
    const [err] = await runLoader('const x = ; // bad syntax', { loaderOptions: { sync: true } })
    expect(err).toBeInstanceOf(Error)
    expect(err!.message).toContain('Oxc transform errors')
  })

  it('should downlevel syntax when target is specified', async () => {
    const [err, code] = await runLoader(
      'const obj = { a: 1 }; const { a, ...rest } = obj; export { rest };',
      { loaderOptions: { target: 'es2015' } },
    )
    expect(err).toBeNull()
    expect(code).not.toContain('...')
  })

  it('should expose makeLoader() for custom instances', async () => {
    const customLoader = makeLoader()
    const [err, code] = await new Promise<[Error | null, string | undefined]>((resolve) => {
      const callback = vi.fn((...args: unknown[]) => resolve(args as [Error | null, string | undefined]))
      const ctx = createMockContext({ resourcePath: '/test/file.ts' })
      ;(ctx.async as ReturnType<typeof vi.fn>).mockReturnValue(callback)
      customLoader.call(ctx, 'const x: number = 1; export default x;')
    })
    expect(err).toBeNull()
    expect(code).toContain('const x = 1')
  })
})

// ─── Integration tests (real webpack compilation) ────────────────────────────

describe('oxc-loader — integration tests (webpack)', () => {
  it('transforms a basic JS file', async () => {
    const files = await compile(path.join(FIXTURES, 'basic.js'))
    expect(files['bundle.js']).toContain('console.log')
  })

  it('transforms JSX with classic runtime', async () => {
    const files = await compile(path.join(FIXTURES, 'jsx.jsx'), {
      jsx: { runtime: 'classic', pragma: 'React.createElement', pragmaFrag: 'React.Fragment' },
    })
    expect(files['bundle.js']).toContain('.createElement(')
    expect(files['bundle.js']).not.toContain('<h1>')
  })

  it('transforms JSX with automatic runtime', async () => {
    const files = await compile(path.join(FIXTURES, 'jsx.jsx'), {
      jsx: { runtime: 'automatic' },
    })
    expect(files['bundle.js']).toContain('react/jsx-runtime')
    expect(files['bundle.js']).not.toContain('<h1>')
  })

  it('transforms TypeScript', async () => {
    const files = await compile(path.join(FIXTURES, 'typescript.ts'))
    expect(files['bundle.js']).not.toContain(': string')
    expect(files['bundle.js']).not.toContain(': number')
    expect(files['bundle.js']).toContain('greet')
  })

  it('transforms TSX', async () => {
    const files = await compile(path.join(FIXTURES, 'typescript-jsx.tsx'), {
      jsx: { runtime: 'automatic' },
    })
    expect(files['bundle.js']).toContain('react/jsx-runtime')
    expect(files['bundle.js']).not.toContain(': Props')
    expect(files['bundle.js']).not.toContain('<div>')
  })

  it('generates source maps when enabled', async () => {
    const files = await compile(
      path.join(FIXTURES, 'basic.js'),
      { sourcemap: true },
      { devtool: 'source-map' },
    )
    expect(files['bundle.js.map']).toBeDefined()
    const sourceMap = JSON.parse(files['bundle.js.map'])
    expect(sourceMap.version).toBe(3)
  })

  it('works in sync mode', async () => {
    const files = await compile(path.join(FIXTURES, 'basic.js'), { sync: true })
    expect(files['bundle.js']).toContain('console.log')
  })

  it('targets a specific ES version', async () => {
    const files = await compile(path.join(FIXTURES, 'es-target.js'), { target: 'es2015' })
    expect(files['bundle.js']).not.toContain('...')
  })

  it('auto-detects JSX development mode', async () => {
    const files = await compile(
      path.join(FIXTURES, 'jsx.jsx'),
      { jsx: { runtime: 'automatic' } },
      { mode: 'development' },
    )
    expect(files['bundle.js']).toContain('jsx-dev-runtime')
  })
})

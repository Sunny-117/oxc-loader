import { describe, expect, it, vi } from 'vitest'
import type { LoaderContext } from 'webpack'
import oxcLoader, { type OxcLoaderOptions } from '../src/index'

// Mock webpack loader context
function createMockLoaderContext(options: Partial<LoaderContext<OxcLoaderOptions>> = {}): LoaderContext<OxcLoaderOptions> {
  const mockCallback = vi.fn()

  return {
    async: () => mockCallback,
    getOptions: () => options.getOptions?.() || {},
    resourcePath: options.resourcePath || '/test/file.js',
    rootContext: options.rootContext || '/test',
    mode: options.mode || 'development',
    ...options,
  } as any
}

describe('oxc-loader', () => {
  it('should transform JavaScript code', async () => {
    const source = 'const x = 1; export default x;'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/file.js',
      getOptions: () => ({}),
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), expect.any(Object))
    const [error, code] = callback.mock.calls[0]
    expect(error).toBeNull()
    expect(code).toContain('const x = 1')
  })

  it('should transform TypeScript code', async () => {
    const source = 'const x: number = 1; export default x;'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/file.ts',
      getOptions: () => ({}),
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), expect.any(Object))
    const [error, code] = callback.mock.calls[0]
    expect(error).toBeNull()
    expect(code).toContain('const x = 1')
    expect(code).not.toContain(': number')
  })

  it('should transform JSX code with automatic runtime', async () => {
    const source = 'export default function App() { return <div>Hello</div>; }'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/App.jsx',
      getOptions: () => ({}),
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), expect.any(Object))
    const [error, code] = callback.mock.calls[0]
    expect(error).toBeNull()
    expect(code).toContain('jsx')
  })

  it('should transform TSX code', async () => {
    const source = 'interface Props { name: string } export default function App(props: Props) { return <div>{props.name}</div>; }'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/App.tsx',
      getOptions: () => ({}),
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), expect.any(Object))
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
      }),
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), expect.any(Object))
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
      }),
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), expect.any(Object))
    const [error, code] = callback.mock.calls[0]
    expect(error).toBeNull()
    // React Refresh should add some refresh-related code
    expect(code.includes('$RefreshReg$') || code.includes('$RefreshSig$')).toBe(true)
  })

  it('should disable sourcemap when configured', async () => {
    const source = 'const x = 1; export default x;'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/file.js',
      getOptions: () => ({
        sourcemap: false,
      }),
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), undefined)
  })

  it('should handle transform errors gracefully', async () => {
    const source = 'const x = ; // Invalid syntax'
    const mockContext = createMockLoaderContext({
      resourcePath: '/test/file.js',
      getOptions: () => ({}),
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    oxcLoader.call(mockContext, source)

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
      }),
    })

    const callback = vi.fn()
    mockContext.async = () => callback

    oxcLoader.call(mockContext, source)

    expect(callback).toHaveBeenCalledWith(null, expect.any(String), expect.any(Object))
    const [error, code] = callback.mock.calls[0]
    expect(error).toBeNull()
    expect(code).toContain('class Test')
  })
})

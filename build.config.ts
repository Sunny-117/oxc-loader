import { defineConfig } from 'robuild'

export default defineConfig({
  entry: 'src/index',
  format: ['cjs', 'esm'],
  clean: true,
  external: ['webpack'],
})

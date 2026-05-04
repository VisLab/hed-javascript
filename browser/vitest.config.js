import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Treat *.xml imports as raw text strings (matching esbuild's text loader used
// by the package build). Without this, Vite's import-analyzer tries to parse
// the bundled HED schema XML files as JavaScript and fails.
const xmlAsText = {
  name: 'xml-as-text',
  enforce: 'pre',
  transform(code, id) {
    if (id.endsWith('.xml')) {
      return { code: `export default ${JSON.stringify(code)};`, map: null }
    }
    return null
  },
}

export default defineConfig({
  assetsInclude: ['**/*.xml'],
  plugins: [xmlAsText],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.js'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    // Define the Vite environment variable that the config.js file checks for
    __VITE_ENV__: 'true',
  },
})

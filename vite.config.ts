/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

/** Every file under public/, as the URL it will be served at. */
function publicFiles(directory: string, root = directory): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = join(directory, entry)
    return statSync(full).isDirectory() ? publicFiles(full, root) : [`/${relative(root, full).replaceAll('\\', '/')}`]
  })
}

/**
 * Emits dist/sw.js from service-worker.js, stamped with the built asset list
 * and a cache name derived from it, so a new deploy installs a fresh cache
 * and drops the old one. Build only: the dev server never registers it.
 */
function ironlogServiceWorker(): Plugin {
  return {
    name: 'ironlog-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const built = Object.keys(bundle)
        .filter((name) => !name.endsWith('.map'))
        .map((name) => `/${name}`)
      const statics = publicFiles(new URL('./public', import.meta.url).pathname)
      const assets = ['/', ...new Set([...built, ...statics])].sort()
      const cacheName = `ironlog-${createHash('sha256').update(assets.join('|')).digest('hex').slice(0, 12)}`
      const template = readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8')

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        // replaceAll, not replace: every placeholder must be filled, or the
        // worker throws on evaluation and silently never registers.
        source: template
          .replaceAll('__CACHE_NAME__', cacheName)
          .replaceAll('__ASSETS__', JSON.stringify(assets, null, 2)),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ironlogServiceWorker()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    // Expose the dev server on the LAN so the app can be opened on an iPhone.
    host: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

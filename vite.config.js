import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On GitHub Pages the app is served from https://<user>.github.io/<repo>/,
// so production assets must be requested from that subpath. Local dev stays at "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ci-cd-questionnaire-lab-/' : '/',
  plugins: [react()],
  server: { port: 5175, open: true }
}))

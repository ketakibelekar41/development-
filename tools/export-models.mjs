/**
 * Generates starter GLBs from the procedural pieces:
 *   npm run build && npm run preview &      (serves :4173)
 *   node tools/export-models.mjs sofa armchair coffeeTable floorLamp
 * Output: public/models/<name>.glb  (then: npm run models:optimize)
 */
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'

const names = process.argv.slice(2)
if (!names.length) names.push('sofa', 'armchair', 'coffeeTable', 'floorLamp')
const url = process.env.URL || 'http://localhost:4173/?quality=low&debug'

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage()
await page.goto(url)
await page.waitForFunction(() => window.__engine?.ready && window.__exportGLB, null, { timeout: 180000 })
mkdirSync('public/models', { recursive: true })
for (const n of names) {
  const b64 = await page.evaluate((n) => window.__exportGLB(n), n)
  const file = `public/models/${n}.glb`
  writeFileSync(file, Buffer.from(b64, 'base64'))
  console.log('wrote', file, (b64.length * 0.75 / 1024).toFixed(0) + ' KB')
}
await browser.close()

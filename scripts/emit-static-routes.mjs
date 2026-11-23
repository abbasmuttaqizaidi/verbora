import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Static hosting gets a real index.html for each shareable course URL.
const slugs = ['spoken-english', 'business-english', 'public-speaking', 'interview-preparation']
const dist = resolve('dist')
for (const slug of slugs) {
  const directory = resolve(dist, 'courses', slug)
  mkdirSync(directory, { recursive: true })
  copyFileSync(resolve(dist, 'index.html'), resolve(directory, 'index.html'))
}

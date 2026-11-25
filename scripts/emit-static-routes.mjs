import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Static hosting gets a real index.html for each shareable course URL and standalone pages.
const slugs = ['spoken-english', 'business-english', 'public-speaking', 'interview-preparation', 'personality-development']
const dist = resolve('dist')
for (const slug of slugs) {
  const directory = resolve(dist, 'courses', slug)
  mkdirSync(directory, { recursive: true })
  copyFileSync(resolve(dist, 'index.html'), resolve(directory, 'index.html'))
}

// Standalone routes
const pages = ['about', 'trainer', 'trainers', 'stories', 'success-stories', 'contact', 'contact-us', 'verbora-edu-admin', 'shivam-admin']
for (const page of pages) {
  const directory = resolve(dist, page)
  mkdirSync(directory, { recursive: true })
  copyFileSync(resolve(dist, 'index.html'), resolve(directory, 'index.html'))
}

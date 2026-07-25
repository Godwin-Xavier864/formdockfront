import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const templatesDir = path.join(root, 'public', 'templates', 'files')
const outputPath = path.join(root, 'public', 'templates', 'index.json')

if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true })
}

const files = fs
  .readdirSync(templatesDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b))

const templates = files.map((fileName) => {
  const base = fileName.replace(/\.html$/i, '')
  const prettyName = base
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return {
    id: base.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: prettyName,
    category: 'General',
    description: `${prettyName} template`,
    path: `templates/files/${fileName}`,
  }
})

const payload = {
  generated_at: new Date().toISOString(),
  templates,
}

fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8')
console.log(`Generated ${outputPath} with ${templates.length} template(s).`)

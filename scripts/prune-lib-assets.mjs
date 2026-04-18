import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

await rm(path.join(projectRoot, 'dist-lib', 'textures'), {
  recursive: true,
  force: true,
})

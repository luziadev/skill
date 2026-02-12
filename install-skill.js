#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const os = require('os')

const config = require('./.claude-skill.json')
const packageJson = require('./package.json')

const skillName = config.name
const isGlobal = process.env.npm_config_global === 'true'
const basePath = isGlobal
  ? path.join(os.homedir(), '.claude', 'skills')
  : path.join(process.cwd(), '.claude', 'skills')

const skillPath = path.join(basePath, skillName)

try {
  fs.mkdirSync(skillPath, { recursive: true })

  const skillMd = path.join(__dirname, 'SKILL.md')
  fs.copyFileSync(skillMd, path.join(skillPath, 'SKILL.md'))

  const manifestPath = path.join(basePath, '.skills-manifest.json')
  let manifest = {}
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  }
  manifest[skillName] = {
    package: config.package,
    version: packageJson.version,
    installed: new Date().toISOString(),
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  console.log(`\u2713 Skill "${skillName}" v${packageJson.version} installed to ${skillPath}`)
} catch (err) {
  console.error(`Failed to install skill "${skillName}":`, err.message)
  process.exit(1)
}

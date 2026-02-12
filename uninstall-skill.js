#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const os = require('os')

const config = require('./.claude-skill.json')

const skillName = config.name
const isGlobal = process.env.npm_config_global === 'true'
const basePath = isGlobal
  ? path.join(os.homedir(), '.claude', 'skills')
  : path.join(process.cwd(), '.claude', 'skills')

const skillPath = path.join(basePath, skillName)

try {
  if (fs.existsSync(skillPath)) {
    fs.rmSync(skillPath, { recursive: true, force: true })
  }

  const manifestPath = path.join(basePath, '.skills-manifest.json')
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    delete manifest[skillName]
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  }

  console.log(`\u2713 Skill "${skillName}" uninstalled`)
} catch (err) {
  console.error(`Failed to uninstall skill "${skillName}":`, err.message)
}

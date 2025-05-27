#!/usr/bin/env node

/**
 * COAV Version Update Script (Cross-platform)
 * This script updates version numbers across all relevant files
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

// Helper functions
const log = {
  error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
};

// Validate version format
function validateVersion(version) {
  const versionRegex = /^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$/;
  if (!versionRegex.test(version)) {
    log.error('Error: Invalid version format');
    console.log('Version must be in format: X.Y.Z or X.Y.Z-suffix');
    console.log('Examples: 1.0.0, 2.1.3-beta, 3.0.0-rc1');
    process.exit(1);
  }
}

// Update version in JSON file
function updateJsonFile(filePath, version, key = 'version') {
  try {
    const content = readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (key.includes('.')) {
      // Handle nested keys like "package.version"
      const keys = key.split('.');
      let obj = data;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = version;
    } else {
      data[key] = version;
    }
    
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    return true;
  } catch (error) {
    log.error(`Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

// Update version in TOML file
function updateTomlFile(filePath, version) {
  try {
    let content = readFileSync(filePath, 'utf8');
    
    // Update version line
    content = content.replace(
      /^version\s*=\s*"[^"]*"/m,
      `version = "${version}"`
    );
    
    writeFileSync(filePath, content);
    return true;
  } catch (error) {
    log.error(`Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node update-version.js <version>');
    console.log('Example: node update-version.js 1.2.3');
    console.log('');
    console.log('This script updates version numbers in:');
    console.log('  - package.json');
    console.log('  - src-tauri/Cargo.toml');
    console.log('  - src-tauri/tauri.conf.json');
    process.exit(0);
  }
  
  const version = args[0];
  validateVersion(version);
  
  const projectRoot = join(__dirname, '..');
  process.chdir(projectRoot);
  
  log.info(`Updating COAV version to ${version}`);
  console.log('');
  
  // Files to update
  const updates = [
    {
      file: 'package.json',
      type: 'json',
      key: 'version',
    },
    {
      file: 'src-tauri/tauri.conf.json',
      type: 'json',
      key: 'version',
    },
    {
      file: 'src-tauri/Cargo.toml',
      type: 'toml',
    },
  ];
  
  let allSuccess = true;
  
  for (const update of updates) {
    const filePath = join(projectRoot, update.file);
    
    if (!existsSync(filePath)) {
      log.error(`Error: ${update.file} not found`);
      allSuccess = false;
      continue;
    }
    
    process.stdout.write(`Updating ${update.file}... `);
    
    let success = false;
    if (update.type === 'json') {
      success = updateJsonFile(filePath, version, update.key);
    } else if (update.type === 'toml') {
      success = updateTomlFile(filePath, version);
    }
    
    if (success) {
      log.success('✓');
    } else {
      allSuccess = false;
    }
  }
  
  if (allSuccess) {
    console.log('');
    log.success(`Version updated successfully to ${version}`);
    console.log('');
    console.log('Next steps:');
    console.log(`1. Review the changes: git diff`);
    console.log(`2. Commit the changes: git add . && git commit -m "chore: bump version to ${version}"`);
    console.log(`3. Create a tag: git tag -a v${version} -m "Release version ${version}"`);
    console.log(`4. Push changes: git push origin main && git push origin v${version}`);
  } else {
    log.error('\nSome files could not be updated. Please check the errors above.');
    process.exit(1);
  }
}

// Run the script
main();
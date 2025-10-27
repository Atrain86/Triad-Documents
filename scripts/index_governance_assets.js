// index_governance_assets.js
// Crawls the governance directory and outputs a JSON index by phase and file type

import fs from 'fs';
import path from 'path';

const GOVERNANCE_DIR = path.resolve('governance');
const OUTPUT_FILE = path.resolve('governance/index/phase_asset_index.json');

// Phase identification patterns
const PHASE_PATTERNS = [
  { pattern: /phase[-_\s]*(i|1)\b/i, phase: 'Phase-I' },
  { pattern: /phase[-_\s]*(ii|2)\b/i, phase: 'Phase-II' },
  { pattern: /phase[-_\s]*(iii|3)[-_\s]*b\b/i, phase: 'Phase-III-B' },
  { pattern: /phase[-_\s]*(iii|3)[-_\s]*c\b/i, phase: 'Phase-III-C' },
  { pattern: /phase[-_\s]*(iii|3)[-_\s]*d\b/i, phase: 'Phase-III-D' },
  { pattern: /phase[-_\s]*(iii|3)[-_\s]*e\b/i, phase: 'Phase-III-E' },
  { pattern: /phase[-_\s]*(iii|3)[-_\s]*f\b/i, phase: 'Phase-III-F' },
  { pattern: /phase[-_\s]*(iii|3)[-_\s]*g\b/i, phase: 'Phase-III-G' },
  { pattern: /phase[-_\s]*(iii|3)[-_\s]*g[-_\s]*5\b/i, phase: 'Phase-III-G.5' },
];

// Types of governance assets
const ASSET_TYPES = {
  templates: 'Template',
  logs: 'Log',
  addenda: 'Addendum',
};

function detectPhase(filePath, content) {
  // First try to detect from filename
  const fileName = path.basename(filePath);
  for (const { pattern, phase } of PHASE_PATTERNS) {
    if (pattern.test(fileName)) {
      return phase;
    }
  }
  
  // Then try to detect from content
  if (content) {
    for (const { pattern, phase } of PHASE_PATTERNS) {
      if (pattern.test(content)) {
        return phase;
      }
    }
  }
  
  // Default to unknown phase
  return 'Unknown';
}

function detectAssetType(filePath) {
  const relativePath = path.relative(GOVERNANCE_DIR, filePath);
  const directory = relativePath.split(path.sep)[0];
  
  return ASSET_TYPES[directory] || 'Unknown';
}

function crawlDirectory(dir) {
  const assets = [];
  
  function processFile(filePath) {
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      const files = fs.readdirSync(filePath);
      files.forEach(file => {
        processFile(path.join(filePath, file));
      });
    } else if (stats.isFile() && path.extname(filePath) === '.md') {
      const content = fs.readFileSync(filePath, 'utf8');
      const phase = detectPhase(filePath, content);
      const assetType = detectAssetType(filePath);
      
      assets.push({
        path: filePath,
        relativePath: path.relative(GOVERNANCE_DIR, filePath),
        phase,
        type: assetType,
        created: stats.birthtime,
        modified: stats.mtime,
        size: stats.size,
      });
    }
  }
  
  processFile(dir);
  return assets;
}

function generateIndex() {
  const assets = crawlDirectory(GOVERNANCE_DIR);
  
  // Group assets by phase
  const phaseIndex = {};
  
  assets.forEach(asset => {
    if (!phaseIndex[asset.phase]) {
      phaseIndex[asset.phase] = {
        templates: [],
        logs: [],
        addenda: [],
        unknown: [],
      };
    }
    
    const typeKey = asset.type.toLowerCase() === 'template' ? 'templates' : 
                   asset.type.toLowerCase() === 'log' ? 'logs' :
                   asset.type.toLowerCase() === 'addendum' ? 'addenda' : 'unknown';
    
    phaseIndex[asset.phase][typeKey].push(asset);
  });
  
  // Add metadata
  const index = {
    generated: new Date().toISOString(),
    totalAssets: assets.length,
    phases: Object.keys(phaseIndex),
    index: phaseIndex,
  };
  
  return index;
}

// Execute and output
const index = generateIndex();
console.log(JSON.stringify(index, null, 2));

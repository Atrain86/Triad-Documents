#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import dotenv from 'dotenv';

dotenv.config();

const watchDir = path.resolve(process.env.WATCH_DIR || 'client/design/test_from_ABACUS');
const archiveDir = path.resolve(process.env.ARCHIVE_DIR || 'client/design/test_from_ABACUS/archive');
const componentsDir = path.resolve(process.env.OUTPUT_DIR || 'client/design/components');
const backupDir = path.resolve('client/design/backups');
const logFile = path.resolve('logs/sync.log');

// Ensure directories exist
[archiveDir, componentsDir, backupDir, path.dirname(logFile)].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const log = (msg) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
  console.log(msg);
};

function getUniqueFilePath(targetPath) {
  let finalPath = targetPath;
  let counter = 1;
  while (fs.existsSync(finalPath)) {
    const parsed = path.parse(targetPath);
    finalPath = path.join(parsed.dir, `${parsed.name}(${counter++})${parsed.ext}`);
  }
  return finalPath;
}

async function processZipFile(zipFile) {
  const zipPath = path.join(watchDir, zipFile);
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const processedFiles = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const targetPath = path.join(componentsDir, entry.entryName);
    const backupPath = path.join(backupDir, `${entry.entryName}.${Date.now()}.bak`);

    try {
      // Backup existing file
      if (fs.existsSync(targetPath)) {
        fs.copyFileSync(targetPath, backupPath);
        log(`📦 Backup created for existing file: ${entry.entryName}`);
      }

      // Handle duplicate filenames
      const finalPath = getUniqueFilePath(targetPath);

      // Extract file
      zip.extractEntryTo(entry.entryName, path.dirname(finalPath), false, true);
      
      // Rename if path was modified
      if (finalPath !== targetPath) {
        fs.renameSync(targetPath, finalPath);
        log(`🔄 Renamed to avoid conflict: ${path.basename(finalPath)}`);
      }

      log(`✅ Extracted: ${entry.entryName}`);
      processedFiles.push(entry.entryName);

    } catch (err) {
      log(`❌ Error processing ${entry.entryName}: ${err.message}`);
    }
  }

  // Archive processed ZIP
  const archivePath = path.join(archiveDir, zipFile);
  fs.renameSync(zipPath, archivePath);
  log(`🗃️ Archived processed ZIP: ${zipFile}`);

  return processedFiles;
}

async function main() {
  try {
    const zipFiles = fs.readdirSync(watchDir).filter(f => f.endsWith('.zip'));
    
    if (zipFiles.length === 0) {
      log('⚠️ No ZIP files found.');
      process.exit(0);
    }

    const allProcessedFiles = [];

    for (const zipFile of zipFiles) {
      const processedFiles = await processZipFile(zipFile);
      allProcessedFiles.push(...processedFiles);
    }

    // Update AI Bridge JSON
    const aiBridgePath = path.resolve('ai_bridge/ai_bridge.json');
    const aiBridgeData = fs.existsSync(aiBridgePath) 
      ? JSON.parse(fs.readFileSync(aiBridgePath, 'utf8')) 
      : {};

    aiBridgeData.from_cline = {
      summary: `Synced ${allProcessedFiles.length} design component(s)`,
      files_changed: allProcessedFiles,
      diagnostics: 'Processed design components from ZIP',
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(aiBridgePath, JSON.stringify(aiBridgeData, null, 2));
    log('🧠 Updated AI Bridge JSON');

    log('🎉 Sync completed successfully.');
    process.exit(0);

  } catch (err) {
    log(`❌ Sync failed: ${err.message}`);
    process.exit(1);
  }
}

main();

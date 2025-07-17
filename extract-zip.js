import fs from 'fs';
import path from 'path';
import yauzl from 'yauzl';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractZip(zipPath, outputDir) {
  return new Promise((resolve, reject) => {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }

      console.log('Zip file opened successfully');
      console.log('Entry count:', zipfile.entryCount);

      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        console.log('Processing entry:', entry.fileName);

        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          const dirPath = path.join(outputDir, entry.fileName);
          fs.mkdirSync(dirPath, { recursive: true });
          zipfile.readEntry();
        } else {
          // File entry
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              console.error('Error opening read stream:', err);
              zipfile.readEntry();
              return;
            }

            const filePath = path.join(outputDir, entry.fileName);
            const fileDir = path.dirname(filePath);
            
            // Ensure directory exists
            if (!fs.existsSync(fileDir)) {
              fs.mkdirSync(fileDir, { recursive: true });
            }

            const writeStream = fs.createWriteStream(filePath);
            readStream.pipe(writeStream);

            writeStream.on('close', () => {
              console.log('Extracted:', entry.fileName);
              zipfile.readEntry();
            });

            writeStream.on('error', (err) => {
              console.error('Error writing file:', err);
              zipfile.readEntry();
            });
          });
        }
      });

      zipfile.on('end', () => {
        console.log('Extraction complete!');
        resolve();
      });

      zipfile.on('error', (err) => {
        console.error('Zip file error:', err);
        reject(err);
      });
    });
  });
}

// Run extraction
extractZip('./attached_assets/paint_brain_icons_bundle_1752735130013.zip', './public/icons')
  .then(() => {
    console.log('\nListing extracted files:');
    const iconDir = './public/icons';
    
    function listFiles(dir, prefix = '') {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          console.log(prefix + '📁 ' + item + '/');
          listFiles(itemPath, prefix + '  ');
        } else {
          console.log(prefix + '📄 ' + item);
        }
      });
    }
    
    if (fs.existsSync(iconDir)) {
      listFiles(iconDir);
    }
  })
  .catch(console.error);
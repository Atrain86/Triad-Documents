// Script to copy only essential files for GitHub upload
import fs from 'fs';
import path from 'path';

// Create export directory
const exportDir = './github-export';
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir);
}

// Files and directories to copy (source code only)
const filesToCopy = [
  'package.json',
  'README.md',
  'replit.md',
  '.gitignore',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'components.json',
  'drizzle.config.ts',
  'client/',
  'server/',
  'shared/'
];

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isFile()) {
    // Copy file
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${src}`);
  } else if (stats.isDirectory()) {
    // Copy directory
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
      // Skip node_modules and other large directories
      if (file === 'node_modules' || file === '.git' || file === 'uploads' || file === 'attached_assets') {
        return;
      }
      
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      copyRecursive(srcPath, destPath);
    });
  }
}

// Copy each file/directory
filesToCopy.forEach(item => {
  const srcPath = path.join('.', item);
  const destPath = path.join(exportDir, item);
  
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, destPath);
  }
});

console.log('\nExport complete! Files copied to ./github-export/');
console.log('This folder should be small enough for GitHub upload.');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Function to determine the relative path from the source file to the components directory
function getRelativePath(filePath) {
  const componentsDir = path.join(__dirname, 'components');
  const dirName = path.dirname(filePath);
  
  // Calculate relative path from the file to the components directory
  let relativePath = path.relative(dirName, __dirname);
  if (relativePath === '') {
    relativePath = '.';
  }
  
  return relativePath;
}

// Function to replace @/components imports with relative paths
function fixImports(filePath) {
  const relativePath = getRelativePath(filePath);
  
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace @/components with the relative path
  const originalContent = content;
  content = content.replace(/@\/components\//g, `${relativePath}/components/`);
  
  // Replace other @/ imports if needed
  content = content.replace(/@\/lib\//g, `${relativePath}/lib/`);
  content = content.replace(/@\/types\//g, `${relativePath}/types/`);
  content = content.replace(/@\/app\//g, `${relativePath}/app/`);
  content = content.replace(/@\/contexts\//g, `${relativePath}/contexts/`);
  
  // Only write back if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed imports in: ${filePath}`);
    return true;
  }
  
  return false;
}

// Find all TypeScript files in the app, components, and lib directories
const files = glob.sync('{app,components,lib,types,contexts}/**/*.{ts,tsx}', { cwd: __dirname });
let fixedCount = 0;

// Process each file
files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fixImports(filePath)) {
    fixedCount++;
  }
});

console.log(`Fixed imports in ${fixedCount} files.`);
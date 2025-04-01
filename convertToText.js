const fs = require("fs-extra");
const path = require("path");

const rootDir = __dirname; // Root directory where the script is located
const outputDir = path.join(rootDir, "git_to_text"); // Output folder
const outputFile = path.join(outputDir, "concatenated_output.txt"); // Single output file
const ignoredPatterns = [
  "node_modules",
  "git_to_text",
  "package-lock.json",
  ".git",
  "static",
  "server",
  "build",
  "cache",
  "trace"
]; // Items to ignore

// Ensure git_to_text exists
fs.ensureDirSync(outputDir);

// Function to process all files
async function processFiles(dir, isConcatenated, concatStream = null) {
  if (!(await fs.pathExists(dir))) {
    console.log(`Skipping: ${dir} (directory does not exist)`);
    return;
  }

  const files = await fs.readdir(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(rootDir, filePath);

    // Skip ignored files and directories
    if (ignoredPatterns.some((pattern) => relativePath.includes(pattern))) {
      continue;
    }

    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      await processFiles(filePath, isConcatenated, concatStream); // Recurse into subdirectories
    } else {
      const content = await fs.readFile(filePath, "utf8");
      const fileHeader = `// Original Path: ${relativePath}\n\n`;

      if (isConcatenated) {
        // Append to the single output file
        concatStream.write(fileHeader + content + "\n\n");
      } else {
        // Generate separate files
        const newFileName = relativePath.replace(/[\\/]/g, "_") + ".txt";
        const newFilePath = path.join(outputDir, newFileName);
        await fs.outputFile(newFilePath, fileHeader + content);
        console.log(`Converted: ${relativePath} -> ${newFileName}`);
      }
    }
  }
}

// Main execution
(async () => {
  // Ask if concatenation is needed
  const isConcatenated = process.argv.includes("--concat");

  if (isConcatenated) {
    const concatStream = fs.createWriteStream(outputFile, { flags: "w" });
    await processFiles(rootDir, isConcatenated, concatStream);
    concatStream.end();
    console.log(`All files concatenated into: ${outputFile}`);
  } else {
    await processFiles(rootDir, isConcatenated);
    console.log("All files have been converted separately!");
  }
})();

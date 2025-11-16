#!/usr/bin/env node

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = join(__dirname, "..");
const APP_DIR = join(PROJECT_ROOT, "app");

let errors = [];
let warnings = [];

// Forbidden patterns for static export
const FORBIDDEN_PATTERNS = {
  "getServerSideProps": "SSR function",
  "cookies()": "Next.js cookies (requires server)",
  "headers()": "Next.js headers (requires server)",
  "server-only": "Server-only module",
  "dynamic = 'force-dynamic'": "Force dynamic rendering",
  "dynamic='force-dynamic'": "Force dynamic rendering",
  "export const dynamic = 'force-dynamic'": "Force dynamic rendering",
};

// Check for forbidden directories
const FORBIDDEN_DIRS = ["api"];

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!existsSync(dirPath)) {
    return arrayOfFiles;
  }

  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = join(dirPath, file);
    
    if (statSync(fullPath).isDirectory()) {
      // Check for forbidden directories
      if (FORBIDDEN_DIRS.includes(file)) {
        errors.push(`❌ Forbidden directory found: ${fullPath.replace(PROJECT_ROOT, "")}`);
        errors.push(`   Static export cannot use API routes`);
        return; // Don't recurse into forbidden directory
      }
      
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js") || file.endsWith(".jsx")) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function checkFileContent(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const relativePath = filePath.replace(PROJECT_ROOT, "");

  // Check for forbidden patterns
  for (const [pattern, description] of Object.entries(FORBIDDEN_PATTERNS)) {
    if (content.includes(pattern)) {
      errors.push(`❌ ${relativePath}`);
      errors.push(`   Found: ${description} (${pattern})`);
    }
  }

  // Check dynamic routes for generateStaticParams
  const pathParts = relativePath.split("/");
  const hasDynamicSegment = pathParts.some(part => part.includes("[") && part.includes("]"));
  
  if (hasDynamicSegment && relativePath.endsWith("page.tsx")) {
    const hasInPage = content.includes("generateStaticParams");
    
    if (!hasInPage) {
      // Check if there's a layout.tsx in the same directory with generateStaticParams
      const dir = dirname(filePath);
      const layoutPath = join(dir, "layout.tsx");
      
      let hasInLayout = false;
      if (existsSync(layoutPath)) {
        const layoutContent = readFileSync(layoutPath, "utf-8");
        hasInLayout = layoutContent.match(/export\s+(async\s+)?function\s+generateStaticParams/);
      }
      
      if (!hasInLayout) {
        errors.push(`❌ ${relativePath}`);
        errors.push(`   Dynamic route must export 'generateStaticParams' function (in page.tsx or layout.tsx)`);
      }
    } else {
      // Verify it's exported
      const exportMatch = content.match(/export\s+(async\s+)?function\s+generateStaticParams/);
      if (!exportMatch) {
        warnings.push(`⚠️  ${relativePath}`);
        warnings.push(`   'generateStaticParams' found but may not be properly exported`);
      }
    }
  }
}

function checkNextConfig() {
  // Check for next.config.mjs or next.config.ts
  let nextConfigPath = join(PROJECT_ROOT, "next.config.mjs");
  let configFile = "next.config.mjs";
  
  if (!existsSync(nextConfigPath)) {
    nextConfigPath = join(PROJECT_ROOT, "next.config.ts");
    configFile = "next.config.ts";
    
    if (!existsSync(nextConfigPath)) {
      errors.push("❌ next.config.mjs or next.config.ts not found");
      return;
    }
  }

  const content = readFileSync(nextConfigPath, "utf-8");
  
  const requiredSettings = [
    { pattern: "output:", value: '"export"' },
    { pattern: "unoptimized:", value: "true" },
    { pattern: "trailingSlash:", value: "true" },
  ];

  for (const { pattern, value } of requiredSettings) {
    if (!content.includes(pattern)) {
      errors.push(`❌ ${configFile} missing required setting: ${pattern} ${value}`);
    } else {
      // Check if the value is correct (accept both single and double quotes for strings)
      const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`${pattern}\\s*${escapedValue}`);
      const altValue = value.replace(/"/g, "'");
      const altRegex = new RegExp(`${pattern}\\s*${altValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      
      if (!regex.test(content) && !altRegex.test(content)) {
        warnings.push(`⚠️  ${configFile}: ${pattern} may not be set to ${value}`);
      }
    }
  }
}

function main() {
  console.log("🔍 Checking for static export compatibility...\n");

  // Check next.config.ts
  checkNextConfig();

  // Get all source files
  const files = getAllFiles(APP_DIR);
  
  if (files.length === 0) {
    console.log("⚠️  No files found to check in app directory");
    process.exit(0);
  }

  console.log(`📂 Scanning ${files.length} files...\n`);

  // Check each file
  files.forEach((file) => {
    checkFileContent(file);
  });

  // Print results
  if (errors.length > 0) {
    console.log("❌ ERRORS FOUND:\n");
    errors.forEach((error) => console.log(error));
    console.log("");
  }

  if (warnings.length > 0) {
    console.log("⚠️  WARNINGS:\n");
    warnings.forEach((warning) => console.log(warning));
    console.log("");
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log("✅ No static export violations found!");
    console.log("✅ Project is ready for static export\n");
    process.exit(0);
  }

  if (errors.length > 0) {
    console.log("❌ Static export check failed");
    console.log("   Fix the errors above before running 'npm run build'\n");
    process.exit(1);
  }

  // Only warnings
  console.log("⚠️  Static export check completed with warnings");
  console.log("   Review the warnings above\n");
  process.exit(0);
}

main();


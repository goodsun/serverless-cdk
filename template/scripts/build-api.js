const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Building API Lambda function...');

// Create output directory
const outputDir = path.join(__dirname, '..', 'dist', 'api');
fs.mkdirSync(outputDir, { recursive: true });

// Copy source files
console.log('📦 Copying source files...');
const srcDir = path.join(__dirname, '..', 'src', 'api');
copyDirectory(srcDir, outputDir);

// Create package.json for Lambda
const lambdaPackageJson = {
  name: 'serverless-api',
  version: '1.0.0',
  main: 'index.js',
  dependencies: {
    '@aws-sdk/client-dynamodb': '^3.800.0',
    '@aws-sdk/client-s3': '^3.800.0',
    '@aws-sdk/lib-dynamodb': '^3.800.0',
    '@codegenie/serverless-express': '^4.17.0',
    'cors': '^2.8.5',
    'express': '^4.18.2',
    'uuid': '^10.0.0'
  }
};

fs.writeFileSync(
  path.join(outputDir, 'package.json'),
  JSON.stringify(lambdaPackageJson, null, 2)
);

// Install production dependencies
console.log('📥 Installing production dependencies...');
execSync('npm install --production', {
  cwd: outputDir,
  stdio: 'inherit'
});

// Compile TypeScript
console.log('🔧 Compiling TypeScript...');
execSync('tsc --project tsconfig.api.json', {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit'
});

console.log('✅ API build complete!');

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
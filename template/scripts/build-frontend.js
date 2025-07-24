const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Building frontend...');

const environment = process.argv.includes('--env=prod') ? 'prod' : 
                   process.argv.includes('--env=stg') ? 'stg' : 'dev';

console.log(`📦 Building for ${environment} environment`);

// Create build directory
const buildDir = path.join(__dirname, '..', 'build', 'frontend');
fs.mkdirSync(buildDir, { recursive: true });

// Check if frontend source exists
const frontendSources = ['public', 'frontend', 'src/frontend'];
let sourceDir = null;

for (const dir of frontendSources) {
  const fullPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(fullPath)) {
    sourceDir = fullPath;
    break;
  }
}

if (!sourceDir) {
  console.log('⚠️  No frontend source directory found. Creating placeholder...');
  
  // Create a placeholder index.html
  const placeholderHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Serverless App</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f5f5f5;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        p { color: #666; }
        .env { 
            color: #0066cc; 
            font-weight: bold;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 ${process.env.APP_NAME || 'Serverless App'}</h1>
        <p>Environment: <span class="env">${environment}</span></p>
        <p>Your serverless application is running!</p>
    </div>
</body>
</html>`;

  fs.writeFileSync(path.join(buildDir, 'index.html'), placeholderHtml);
  console.log('✅ Created placeholder frontend');
} else {
  // Check if this is a Vite/React project
  const packageJsonPath = path.join(sourceDir, 'package.json');
  const isViteProject = fs.existsSync(packageJsonPath) && fs.existsSync(path.join(sourceDir, 'vite.config.ts'));
  
  if (isViteProject) {
    console.log('🚀 Detected Vite project. Running build...');
    
    // Check if dependencies are installed (especially in CI environment)
    const nodeModulesPath = path.join(sourceDir, 'node_modules');
    if (process.env.CI || !fs.existsSync(nodeModulesPath)) {
      console.log('📦 Installing frontend dependencies...');
      try {
        execSync('npm ci || npm install', {
          cwd: sourceDir,
          stdio: 'inherit'
        });
      } catch (error) {
        console.error('❌ Failed to install dependencies:', error.message);
        process.exit(1);
      }
    }
    
    // Run Vite build
    try {
      execSync('npm run build', {
        cwd: sourceDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      // Copy built files from dist to build directory
      const viteDistDir = path.join(sourceDir, 'dist');
      if (fs.existsSync(viteDistDir)) {
        console.log('📁 Copying built files...');
        copyDirectory(viteDistDir, buildDir);
      }
    } catch (error) {
      console.error('❌ Frontend build failed:', error.message);
      process.exit(1);
    }
  } else {
    // Copy frontend files
    console.log(`📁 Copying files from ${path.basename(sourceDir)}...`);
    copyDirectory(sourceDir, buildDir);
    
    // Process index.html if it exists
    const indexPath = path.join(buildDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      let content = fs.readFileSync(indexPath, 'utf8');
      
      // Get project name from package.json or environment
      const packageJson = require('../package.json');
      const projectName = process.env.APP_NAME || packageJson.name || 'Serverless App';
      
      // Replace template variables
      content = content.replace(/{{PROJECT_NAME}}/g, projectName);
      content = content.replace(/{{ENVIRONMENT}}/g, environment);
      content = content.replace(/{{BUILD_TIME}}/g, new Date().toISOString());
      
      fs.writeFileSync(indexPath, content);
    }
  }
  
  console.log('✅ Frontend build complete!');
}

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
// ============================================
// BoostBangla Build Script v3.0
// Fully redesigned following design.md
// Handles: Tailwind compilation, HTML minification,
// JS minification, asset copying, cache busting
// ============================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ========== CONFIGURATION ==========
const CONFIG = {
    srcDir: path.join(__dirname, '..'),
    distDir: path.join(__dirname, '../dist'),
    assets: ['css', 'js', 'images', 'fonts', 'components', 'php', 'sounds'],
    htmlPatterns: ['**/*.html'],
    jsPatterns: ['**/*.js'],
    minifyHtml: true,
    minifyJs: true,
    cacheBusting: true,
    verbose: true
};

// ========== UTILITIES ==========
function log(message, type = 'info') {
    const icons = { info: '📘', success: '✅', warning: '⚠️', error: '❌', build: '🔨' };
    console.log(`${icons[type] || '📘'} ${message}`);
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log(`Created directory: ${path.relative(CONFIG.srcDir, dir)}`, 'info');
    }
}

// ========== GET ALL FILES ==========
function getAllFiles(dir, extensions, array = []) {
    if (!fs.existsSync(dir)) return array;
    
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            const excludeDirs = ['node_modules', 'dist', 'build', '.git'];
            if (!excludeDirs.includes(file)) {
                getAllFiles(filePath, extensions, array);
            }
        } else if (extensions.some(ext => file.endsWith(ext))) {
            array.push(filePath);
        }
    });
    
    return array;
}

// ========== MINIFY HTML ==========
function minifyHTML(content) {
    if (!CONFIG.minifyHtml) return content;
    
    return content
        // Remove HTML comments
        .replace(/<!--[\s\S]*?-->/g, '')
        // Remove extra whitespace
        .replace(/\s+/g, ' ')
        // Remove spaces between tags
        .replace(/>\s+</g, '><')
        // Remove whitespace around attributes
        .replace(/\s+([a-zA-Z-]+)=/g, ' $1=')
        // Remove quotes from simple attribute values (optional)
        // .replace(/=(["'])([^"'\s>]+)\1/g, '=$2')
        // Trim
        .trim();
}

// ========== MINIFY JS ==========
function minifyJS(content) {
    if (!CONFIG.minifyJs) return content;
    
    try {
        // Simple minification without external deps
        return content
            // Remove single-line comments
            .replace(/\/\/[^\n]*/g, '')
            // Remove multi-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            // Remove spaces around operators (simplified)
            .replace(/\s*([=+\-*/%&|<>!?:;,])\s*/g, '$1')
            // Remove spaces around brackets
            .replace(/\s*([{}()[\]])\s*/g, '$1')
            .trim();
    } catch (error) {
        log(`JS minification warning: ${error.message}`, 'warning');
        return content;
    }
}

// ========== GENERATE CACHE BUSTER ==========
function getCacheBuster() {
    return Date.now().toString(36);
}

function addCacheBuster(content, version) {
    if (!CONFIG.cacheBusting) return content;
    
    // Add cache buster to CSS/JS links
    content = content.replace(/(href|src)=["']([^"']+\.(css|js))["']/gi, (match, attr, url, ext) => {
        const separator = url.includes('?') ? '&' : '?';
        return `${attr}="${url}${separator}v=${version}"`;
    });
    
    return content;
}

// ========== BUILD TAILWIND CSS ==========
function buildTailwindCSS() {
    log('Building Tailwind CSS...', 'build');
    
    const inputCss = path.join(CONFIG.srcDir, 'css', 'tailwind.css');
    const outputCss = path.join(CONFIG.distDir, 'css', 'main.css');
    
    // Ensure dist/css directory exists
    ensureDir(path.dirname(outputCss));
    
    // Check if Tailwind config exists
    const tailwindConfig = path.join(__dirname, 'tailwind.config.js');
    if (!fs.existsSync(tailwindConfig)) {
        log('Tailwind config not found, skipping CSS build', 'warning');
        return false;
    }
    
    // Check if input CSS exists
    if (!fs.existsSync(inputCss)) {
        log(`Input CSS not found at ${inputCss}, creating default`, 'warning');
        const defaultCSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles from design.md */
@layer components {
  .glass-card {
    @apply bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 transition-all duration-300;
  }
  .glass-card:hover {
    @apply transform -translate-y-1 shadow-xl border-primary/30;
  }
  .status-badge {
    @apply inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold;
  }
  .status-pending { @apply bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300; }
  .status-processing { @apply bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300; }
  .status-completed { @apply bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300; }
  .status-cancelled { @apply bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300; }
  .btn-primary {
    @apply bg-gradient-to-r from-primary to-primary-dark text-white font-bold py-3 px-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg;
  }
  .animate-slide-up {
    animation: slideUp 0.5s ease-out forwards;
    opacity: 0;
  }
  .animate-slide-down {
    animation: slideDown 0.4s ease-out forwards;
  }
  .skeleton {
    @apply bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] rounded-xl;
    animation: shimmer 1.5s infinite;
  }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}`;
        fs.writeFileSync(inputCss, defaultCSS);
    }
    
    try {
        // Run Tailwind CLI
        const tailwindCmd = `npx tailwindcss -i "${inputCss}" -o "${outputCss}" --minify`;
        execSync(tailwindCmd, { stdio: 'inherit', cwd: __dirname });
        log('Tailwind CSS built successfully', 'success');
        return true;
    } catch (error) {
        log(`Tailwind build failed: ${error.message}`, 'error');
        return false;
    }
}

// ========== PROCESS HTML FILES ==========
function processHTMLFiles() {
    log('Processing HTML files...', 'build');
    
    const htmlFiles = getAllFiles(CONFIG.srcDir, ['.html']);
    const cacheVersion = getCacheBuster();
    let count = 0;
    
    htmlFiles.forEach(file => {
        const relativePath = path.relative(CONFIG.srcDir, file);
        
        // Skip dist and node_modules
        if (relativePath.startsWith('dist') || relativePath.startsWith('node_modules')) return;
        
        const destPath = path.join(CONFIG.distDir, relativePath);
        ensureDir(path.dirname(destPath));
        
        let content = fs.readFileSync(file, 'utf8');
        content = minifyHTML(content);
        content = addCacheBuster(content, cacheVersion);
        
        fs.writeFileSync(destPath, content);
        count++;
        
        if (CONFIG.verbose) {
            log(`   ${relativePath}`, 'info');
        }
    });
    
    log(`Processed ${count} HTML files`, 'success');
}

// ========== PROCESS JS FILES ==========
function processJSFiles() {
    log('Processing JavaScript files...', 'build');
    
    const jsFiles = getAllFiles(CONFIG.srcDir, ['.js']);
    let count = 0;
    
    jsFiles.forEach(file => {
        const relativePath = path.relative(CONFIG.srcDir, file);
        
        // Skip dist and node_modules
        if (relativePath.startsWith('dist') || relativePath.startsWith('node_modules')) return;
        
        const destPath = path.join(CONFIG.distDir, relativePath);
        ensureDir(path.dirname(destPath));
        
        let content = fs.readFileSync(file, 'utf8');
        content = minifyJS(content);
        
        fs.writeFileSync(destPath, content);
        count++;
        
        if (CONFIG.verbose) {
            log(`   ${relativePath}`, 'info');
        }
    });
    
    log(`Processed ${count} JS files`, 'success');
}

// ========== COPY ASSETS ==========
function copyAssets() {
    log('Copying assets...', 'build');
    
    CONFIG.assets.forEach(asset => {
        const srcPath = path.join(CONFIG.srcDir, asset);
        const destPath = path.join(CONFIG.distDir, asset);
        
        if (fs.existsSync(srcPath)) {
            ensureDir(destPath);
            fs.cpSync(srcPath, destPath, { recursive: true });
            log(`   Copied: ${asset}/`, 'success');
        } else {
            log(`   Asset not found: ${asset}/`, 'warning');
        }
    });
}

// ========== CLEAN DIST DIRECTORY ==========
function cleanDist() {
    if (fs.existsSync(CONFIG.distDir)) {
        log('Cleaning dist directory...', 'build');
        fs.rmSync(CONFIG.distDir, { recursive: true, force: true });
    }
    ensureDir(CONFIG.distDir);
}

// ========== GENERATE BUILD INFO ==========
function generateBuildInfo() {
    const buildInfo = {
        buildTime: new Date().toISOString(),
        version: require('./package.json').version,
        environment: process.env.NODE_ENV || 'production',
        features: {
            tailwind: true,
            minifyHtml: CONFIG.minifyHtml,
            minifyJs: CONFIG.minifyJs,
            cacheBusting: CONFIG.cacheBusting
        }
    };
    
    const infoPath = path.join(CONFIG.distDir, 'build-info.json');
    fs.writeFileSync(infoPath, JSON.stringify(buildInfo, null, 2));
    log('Build info generated', 'success');
}

// ========== WATCH MODE ==========
function watchMode() {
    log('Starting watch mode...', 'build');
    log('Watching for changes in HTML, JS, and CSS files...', 'info');
    
    const watchPaths = [
        path.join(CONFIG.srcDir, '**/*.html'),
        path.join(CONFIG.srcDir, '**/*.js'),
        path.join(CONFIG.srcDir, 'css/**/*.css')
    ];
    
    // Simple polling-based watch (no chokidar dependency)
    let lastBuild = Date.now();
    const interval = setInterval(() => {
        // Check if any files changed (simplified)
        // In production, use chokidar for better performance
        const now = Date.now();
        if (now - lastBuild > 1000) {
            lastBuild = now;
            build().catch(console.error);
        }
    }, 2000);
    
    process.on('SIGINT', () => {
        clearInterval(interval);
        log('Watch mode stopped', 'info');
        process.exit();
    });
}

// ========== MAIN BUILD FUNCTION ==========
async function build() {
    const startTime = Date.now();
    
    log('\n🚀 Building BoostBangla for production...\n', 'build');
    
    // Clean dist directory
    cleanDist();
    
    // Build Tailwind CSS
    buildTailwindCSS();
    
    // Process files
    processHTMLFiles();
    processJSFiles();
    
    // Copy assets
    copyAssets();
    
    // Generate build info
    generateBuildInfo();
    
    const endTime = Date.now();
    const buildTime = ((endTime - startTime) / 1000).toFixed(2);
    
    log(`\n🎉 Build complete in ${buildTime}s!`, 'success');
    log(`📁 Output directory: ${path.relative(process.cwd(), CONFIG.distDir)}\n`, 'info');
}

// ========== RUN ==========
const args = process.argv.slice(2);
if (args.includes('--watch')) {
    build().then(() => watchMode());
} else {
    build().catch(error => {
        log(`Build failed: ${error.message}`, 'error');
        process.exit(1);
    });
}
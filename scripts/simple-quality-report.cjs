#!/usr/bin/env node

/**
 * Simple Code Quality Report
 *
 * This script generates a basic code quality report focusing on
 * the tools we have successfully implemented.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${colors.bold}=== ${title} ===${colors.reset}`, 'cyan');
}

/**
 * Check if tools are properly configured
 */
function checkToolConfiguration() {
  logSection('Tool Configuration Check');

  const tools = [
    { name: 'ESLint', file: '.eslintrc.json' },
    { name: 'Prettier', file: '.prettierrc.json' },
    { name: 'Husky', file: '.husky/pre-commit' },
    { name: 'lint-staged', file: '.lintstagedrc.json' },
    { name: 'commitlint', file: '.commitlintrc.json' },
    { name: 'TypeScript', file: 'tsconfig.json' },
    { name: 'VS Code Settings', file: '.vscode/settings.json' },
  ];

  let configuredTools = 0;

  tools.forEach(tool => {
    if (fs.existsSync(tool.file)) {
      log(`✅ ${tool.name}: Configured`, 'green');
      configuredTools++;
    } else {
      log(`❌ ${tool.name}: Not configured`, 'red');
    }
  });

  log(`\n📊 Configuration Summary: ${configuredTools}/${tools.length} tools configured`, 'blue');

  return { configuredTools, totalTools: tools.length };
}

/**
 * Run Prettier check
 */
function checkPrettierFormatting() {
  logSection('Prettier Formatting Check');

  try {
    execSync('npx prettier --check "src/**/*.{ts,tsx,js,jsx,json,css,md}" --ignore-unknown', {
      stdio: 'pipe',
    });

    log('✅ All files are properly formatted!', 'green');
    return { formatted: true, issues: 0 };
  } catch (error) {
    const output = error.stdout?.toString() || '';
    const unformattedFiles = output.split('\n').filter(line => line.trim().length > 0);

    log(`⚠️ Found ${unformattedFiles.length} files that need formatting`, 'yellow');
    log('💡 Run "npm run format:fix" to fix formatting issues', 'blue');

    return { formatted: false, issues: unformattedFiles.length };
  }
}

/**
 * Run ESLint check
 */
function checkESLintIssues() {
  logSection('ESLint Analysis');

  try {
    const result = execSync('npx eslint src/ --ext .ts,.tsx,.js,.jsx --format json', {
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const eslintResults = JSON.parse(result);

    let totalErrors = 0;
    let totalWarnings = 0;
    let filesWithIssues = 0;

    eslintResults.forEach(result => {
      if (result.messages.length > 0) {
        filesWithIssues++;
        result.messages.forEach(message => {
          if (message.severity === 2) {
            totalErrors++;
          } else {
            totalWarnings++;
          }
        });
      }
    });

    if (totalErrors === 0 && totalWarnings === 0) {
      log('✅ No ESLint issues found!', 'green');
    } else {
      log(`📊 ESLint Summary:`, 'cyan');
      log(`  Files with issues: ${filesWithIssues}`, filesWithIssues > 0 ? 'yellow' : 'green');
      log(`  Errors: ${totalErrors}`, totalErrors > 0 ? 'red' : 'green');
      log(`  Warnings: ${totalWarnings}`, totalWarnings > 0 ? 'yellow' : 'green');

      if (totalErrors > 0) {
        log('💡 Run "npm run lint:fix" to fix auto-fixable issues', 'blue');
      }
    }

    return { errors: totalErrors, warnings: totalWarnings, filesWithIssues };
  } catch (error) {
    if (error.status === 1) {
      // ESLint found issues, try to parse the output
      try {
        const eslintResults = JSON.parse(error.stdout);

        let totalErrors = 0;
        let totalWarnings = 0;
        let filesWithIssues = 0;

        eslintResults.forEach(result => {
          if (result.messages.length > 0) {
            filesWithIssues++;
            result.messages.forEach(message => {
              if (message.severity === 2) {
                totalErrors++;
              } else {
                totalWarnings++;
              }
            });
          }
        });

        log(`📊 ESLint Summary:`, 'cyan');
        log(`  Files with issues: ${filesWithIssues}`, filesWithIssues > 0 ? 'yellow' : 'green');
        log(`  Errors: ${totalErrors}`, totalErrors > 0 ? 'red' : 'green');
        log(`  Warnings: ${totalWarnings}`, totalWarnings > 0 ? 'yellow' : 'green');

        return { errors: totalErrors, warnings: totalWarnings, filesWithIssues };
      } catch (parseError) {
        log(`❌ ESLint check failed: ${error.message}`, 'red');
        return { errors: -1, warnings: -1, filesWithIssues: 0 };
      }
    } else {
      log(`❌ ESLint check failed: ${error.message}`, 'red');
      return { errors: -1, warnings: -1, filesWithIssues: 0 };
    }
  }
}

/**
 * Check Git hooks
 */
function checkGitHooks() {
  logSection('Git Hooks Check');

  const hooks = [
    { name: 'pre-commit', file: '.husky/pre-commit' },
    { name: 'commit-msg', file: '.husky/commit-msg' },
  ];

  let workingHooks = 0;

  hooks.forEach(hook => {
    if (fs.existsSync(hook.file)) {
      try {
        const stats = fs.statSync(hook.file);
        if (stats.mode & parseInt('111', 8)) {
          // Check if executable
          log(`✅ ${hook.name}: Configured and executable`, 'green');
          workingHooks++;
        } else {
          log(`⚠️ ${hook.name}: Configured but not executable`, 'yellow');
        }
      } catch (error) {
        log(`❌ ${hook.name}: Error checking file`, 'red');
      }
    } else {
      log(`❌ ${hook.name}: Not configured`, 'red');
    }
  });

  log(`\n📊 Git Hooks Summary: ${workingHooks}/${hooks.length} hooks working`, 'blue');

  return { workingHooks, totalHooks: hooks.length };
}

/**
 * Analyze code structure
 */
function analyzeCodeStructure() {
  logSection('Code Structure Analysis');

  let totalFiles = 0;
  let totalLines = 0;
  let componentFiles = 0;
  let hookFiles = 0;
  let utilFiles = 0;
  let testFiles = 0;

  function analyzeDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir);

      entries.forEach(entry => {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          analyzeDirectory(fullPath);
        } else if (entry.match(/\.(ts|tsx|js|jsx)$/)) {
          totalFiles++;

          const content = fs.readFileSync(fullPath, 'utf8');
          totalLines += content.split('\n').length;

          // Categorize files
          if (entry.includes('.test.') || entry.includes('.spec.')) {
            testFiles++;
          } else if (fullPath.includes('/components/')) {
            componentFiles++;
          } else if (fullPath.includes('/hooks/')) {
            hookFiles++;
          } else if (fullPath.includes('/utils/')) {
            utilFiles++;
          }
        }
      });
    } catch (error) {
      // Ignore errors for inaccessible directories
    }
  }

  if (fs.existsSync('src')) {
    analyzeDirectory('src');
  }

  log(`📊 Code Structure:`, 'cyan');
  log(`  Total files: ${totalFiles}`, 'blue');
  log(`  Total lines: ${totalLines}`, 'blue');
  log(`  Components: ${componentFiles}`, 'blue');
  log(`  Hooks: ${hookFiles}`, 'blue');
  log(`  Utils: ${utilFiles}`, 'blue');
  log(`  Tests: ${testFiles}`, 'blue');
  log(`  Average lines per file: ${Math.round(totalLines / totalFiles)}`, 'blue');

  return {
    totalFiles,
    totalLines,
    componentFiles,
    hookFiles,
    utilFiles,
    testFiles,
    averageLinesPerFile: Math.round(totalLines / totalFiles),
  };
}

/**
 * Generate quality score
 */
function generateQualityScore(toolConfig, prettier, eslint, gitHooks, codeStructure) {
  logSection('Quality Score');

  let score = 100;
  let feedback = [];

  // Tool configuration (20 points)
  const configScore = (toolConfig.configuredTools / toolConfig.totalTools) * 20;
  score = Math.min(score, configScore + 80);
  if (toolConfig.configuredTools < toolConfig.totalTools) {
    feedback.push(
      `Missing ${toolConfig.totalTools - toolConfig.configuredTools} tool configurations`
    );
  }

  // Prettier formatting (20 points)
  if (!prettier.formatted) {
    const prettierPenalty = Math.min(prettier.issues * 0.5, 20);
    score -= prettierPenalty;
    feedback.push(
      `${prettier.issues} files need formatting (-${prettierPenalty.toFixed(1)} points)`
    );
  }

  // ESLint issues (30 points)
  if (eslint.errors > 0) {
    const errorPenalty = Math.min(eslint.errors * 2, 25);
    score -= errorPenalty;
    feedback.push(`${eslint.errors} ESLint errors (-${errorPenalty} points)`);
  }
  if (eslint.warnings > 0) {
    const warningPenalty = Math.min(eslint.warnings * 0.5, 10);
    score -= warningPenalty;
    feedback.push(`${eslint.warnings} ESLint warnings (-${warningPenalty.toFixed(1)} points)`);
  }

  // Git hooks (10 points)
  if (gitHooks.workingHooks < gitHooks.totalHooks) {
    const hookPenalty = ((gitHooks.totalHooks - gitHooks.workingHooks) / gitHooks.totalHooks) * 10;
    score -= hookPenalty;
    feedback.push(
      `Missing ${gitHooks.totalHooks - gitHooks.workingHooks} Git hooks (-${hookPenalty.toFixed(1)} points)`
    );
  }

  score = Math.max(score, 0);

  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const color = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';

  log(`🎯 Overall Quality Score: ${score.toFixed(1)}/100 (Grade: ${grade})`, color);

  if (feedback.length > 0) {
    log(`\n📉 Areas for Improvement:`, 'yellow');
    feedback.forEach(item => log(`  • ${item}`, 'yellow'));
  }

  if (score >= 90) {
    log(`\n🎉 Excellent code quality! Keep up the great work!`, 'green');
  } else if (score >= 70) {
    log(`\n👍 Good code quality with room for improvement.`, 'yellow');
  } else {
    log(`\n⚠️ Code quality needs attention. Focus on the areas above.`, 'red');
  }

  return { score: score.toFixed(1), grade, feedback };
}

/**
 * Main function
 */
function generateQualityReport() {
  log(`${colors.bold}🔍 Code Quality Automation Report${colors.reset}`, 'magenta');
  log('Analyzing code quality automation setup...\n');

  const startTime = Date.now();

  try {
    // Run all checks
    const toolConfig = checkToolConfiguration();
    const prettier = checkPrettierFormatting();
    const eslint = checkESLintIssues();
    const gitHooks = checkGitHooks();
    const codeStructure = analyzeCodeStructure();

    // Generate quality score
    const qualityScore = generateQualityScore(
      toolConfig,
      prettier,
      eslint,
      gitHooks,
      codeStructure
    );

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      toolConfiguration: toolConfig,
      prettier,
      eslint,
      gitHooks,
      codeStructure,
      qualityScore,
    };

    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync('reports/quality-automation-report.json', JSON.stringify(report, null, 2));

    logSection('Summary');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`✅ Quality report generated in ${duration}s`, 'green');
    log(`📄 Report saved to: reports/quality-automation-report.json`, 'blue');

    return report;
  } catch (error) {
    log(`❌ Report generation failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  generateQualityReport();
}

module.exports = { generateQualityReport };

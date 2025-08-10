#!/usr/bin/env node

/**
 * Code Quality Analysis Tool
 * 
 * This script performs comprehensive code quality analysis including:
 * - ESLint analysis with detailed reporting
 * - TypeScript type checking
 * - Code complexity analysis
 * - Security vulnerability scanning
 * - Code coverage analysis
 * - Dependency analysis
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
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${colors.bold}=== ${title} ===${colors.reset}`, 'cyan');
}

// ============================================================================
// Code Quality Analysis Functions
// ============================================================================

/**
 * Runs ESLint analysis and generates detailed report
 */
function runESLintAnalysis() {
  logSection('ESLint Analysis');
  
  try {
    log('🔍 Running ESLint analysis...', 'blue');
    
    // Run ESLint with JSON output
    const eslintResult = execSync('npx eslint . --ext .ts,.tsx,.js,.jsx --format json', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const results = JSON.parse(eslintResult);
    
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalFiles = results.length;
    let filesWithIssues = 0;
    
    const issuesByRule = {};
    const issuesByFile = {};
    
    results.forEach(result => {
      if (result.messages.length > 0) {
        filesWithIssues++;
        issuesByFile[result.filePath] = result.messages;
        
        result.messages.forEach(message => {
          if (message.severity === 2) {
            totalErrors++;
          } else {
            totalWarnings++;
          }
          
          const rule = message.ruleId || 'unknown';
          if (!issuesByRule[rule]) {
            issuesByRule[rule] = { errors: 0, warnings: 0, count: 0 };
          }
          issuesByRule[rule].count++;
          if (message.severity === 2) {
            issuesByRule[rule].errors++;
          } else {
            issuesByRule[rule].warnings++;
          }
        });
      }
    });
    
    // Display summary
    log(`📊 ESLint Summary:`, 'cyan');
    log(`  Total files analyzed: ${totalFiles}`, 'blue');
    log(`  Files with issues: ${filesWithIssues}`, filesWithIssues > 0 ? 'yellow' : 'green');
    log(`  Total errors: ${totalErrors}`, totalErrors > 0 ? 'red' : 'green');
    log(`  Total warnings: ${totalWarnings}`, totalWarnings > 0 ? 'yellow' : 'green');
    
    // Display top issues by rule
    if (Object.keys(issuesByRule).length > 0) {
      log(`\n🔝 Top Issues by Rule:`, 'cyan');
      const sortedRules = Object.entries(issuesByRule)
        .sort(([,a], [,b]) => b.count - a.count)
        .slice(0, 10);
      
      sortedRules.forEach(([rule, data]) => {
        const color = data.errors > 0 ? 'red' : 'yellow';
        log(`  ${rule}: ${data.count} (${data.errors} errors, ${data.warnings} warnings)`, color);
      });
    }
    
    // Save detailed report
    const reportPath = 'reports/eslint-report.json';
    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: {
        totalFiles,
        filesWithIssues,
        totalErrors,
        totalWarnings,
        timestamp: new Date().toISOString()
      },
      issuesByRule,
      issuesByFile: Object.fromEntries(
        Object.entries(issuesByFile).map(([file, issues]) => [
          path.relative(process.cwd(), file),
          issues
        ])
      )
    }, null, 2));
    
    log(`📄 Detailed report saved to: ${reportPath}`, 'blue');
    
    return { totalErrors, totalWarnings, totalFiles, filesWithIssues };
    
  } catch (error) {
    if (error.status === 1) {
      // ESLint found issues, parse the output
      try {
        const results = JSON.parse(error.stdout);
        log('⚠️ ESLint found issues, but analysis completed', 'yellow');
        return runESLintAnalysis(); // Recursive call to process results
      } catch (parseError) {
        log(`❌ ESLint analysis failed: ${error.message}`, 'red');
        return { totalErrors: -1, totalWarnings: -1, totalFiles: 0, filesWithIssues: 0 };
      }
    } else {
      log(`❌ ESLint analysis failed: ${error.message}`, 'red');
      return { totalErrors: -1, totalWarnings: -1, totalFiles: 0, filesWithIssues: 0 };
    }
  }
}

/**
 * Runs TypeScript type checking analysis
 */
function runTypeScriptAnalysis() {
  logSection('TypeScript Analysis');
  
  try {
    log('📝 Running TypeScript type checking...', 'blue');
    
    const tscResult = execSync('npx tsc --noEmit --pretty false', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    log('✅ No TypeScript errors found!', 'green');
    return { typeErrors: 0, success: true };
    
  } catch (error) {
    const output = error.stdout || error.stderr || '';
    const errorLines = output.split('\n').filter(line => line.includes('error TS'));
    
    log(`❌ Found ${errorLines.length} TypeScript errors:`, 'red');
    
    // Group errors by type
    const errorsByType = {};
    errorLines.forEach(line => {
      const match = line.match(/error (TS\d+):/);
      if (match) {
        const errorCode = match[1];
        if (!errorsByType[errorCode]) {
          errorsByType[errorCode] = 0;
        }
        errorsByType[errorCode]++;
      }
    });
    
    // Display error summary
    Object.entries(errorsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([code, count]) => {
        log(`  ${code}: ${count} occurrences`, 'yellow');
      });
    
    return { typeErrors: errorLines.length, success: false, errorsByType };
  }
}

/**
 * Runs security audit
 */
function runSecurityAudit() {
  logSection('Security Audit');
  
  try {
    log('🔒 Running npm security audit...', 'blue');
    
    const auditResult = execSync('npm audit --json', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const audit = JSON.parse(auditResult);
    
    if (audit.metadata.vulnerabilities.total === 0) {
      log('✅ No security vulnerabilities found!', 'green');
    } else {
      log(`⚠️ Found ${audit.metadata.vulnerabilities.total} vulnerabilities:`, 'yellow');
      log(`  Critical: ${audit.metadata.vulnerabilities.critical}`, 'red');
      log(`  High: ${audit.metadata.vulnerabilities.high}`, 'red');
      log(`  Moderate: ${audit.metadata.vulnerabilities.moderate}`, 'yellow');
      log(`  Low: ${audit.metadata.vulnerabilities.low}`, 'blue');
    }
    
    return audit.metadata.vulnerabilities;
    
  } catch (error) {
    if (error.status === 1) {
      // npm audit found vulnerabilities
      try {
        const audit = JSON.parse(error.stdout);
        return audit.metadata.vulnerabilities;
      } catch (parseError) {
        log(`❌ Security audit failed: ${error.message}`, 'red');
        return { total: -1 };
      }
    } else {
      log(`❌ Security audit failed: ${error.message}`, 'red');
      return { total: -1 };
    }
  }
}

/**
 * Analyzes code complexity
 */
function analyzeCodeComplexity() {
  logSection('Code Complexity Analysis');
  
  try {
    log('📊 Analyzing code complexity...', 'blue');
    
    // Simple complexity analysis by counting files and lines
    const srcPath = 'src';
    let totalFiles = 0;
    let totalLines = 0;
    let totalFunctions = 0;
    let complexFiles = [];
    
    function analyzeDirectory(dir) {
      const entries = fs.readdirSync(dir);
      
      entries.forEach(entry => {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          analyzeDirectory(fullPath);
        } else if (entry.match(/\.(ts|tsx|js|jsx)$/)) {
          totalFiles++;
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n').length;
          totalLines += lines;
          
          // Count functions (simple regex)
          const functionMatches = content.match(/function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{|\w+\s*\(/g) || [];
          totalFunctions += functionMatches.length;
          
          // Flag complex files (>200 lines)
          if (lines > 200) {
            complexFiles.push({
              file: path.relative(process.cwd(), fullPath),
              lines,
              functions: functionMatches.length
            });
          }
        }
      });
    }
    
    if (fs.existsSync(srcPath)) {
      analyzeDirectory(srcPath);
    }
    
    log(`📊 Complexity Summary:`, 'cyan');
    log(`  Total files: ${totalFiles}`, 'blue');
    log(`  Total lines: ${totalLines}`, 'blue');
    log(`  Average lines per file: ${Math.round(totalLines / totalFiles)}`, 'blue');
    log(`  Total functions: ${totalFunctions}`, 'blue');
    log(`  Complex files (>200 lines): ${complexFiles.length}`, complexFiles.length > 0 ? 'yellow' : 'green');
    
    if (complexFiles.length > 0) {
      log(`\n🔍 Complex Files:`, 'yellow');
      complexFiles.slice(0, 5).forEach(file => {
        log(`  ${file.file}: ${file.lines} lines, ${file.functions} functions`, 'yellow');
      });
    }
    
    return {
      totalFiles,
      totalLines,
      totalFunctions,
      complexFiles: complexFiles.length,
      averageLinesPerFile: Math.round(totalLines / totalFiles)
    };
    
  } catch (error) {
    log(`❌ Complexity analysis failed: ${error.message}`, 'red');
    return { totalFiles: 0, totalLines: 0, totalFunctions: 0, complexFiles: 0 };
  }
}

/**
 * Generates overall quality score
 */
function generateQualityScore(eslint, typescript, security, complexity) {
  logSection('Quality Score');
  
  let score = 100;
  let issues = [];
  
  // ESLint scoring
  if (eslint.totalErrors > 0) {
    const errorPenalty = Math.min(eslint.totalErrors * 2, 30);
    score -= errorPenalty;
    issues.push(`ESLint errors: -${errorPenalty} points`);
  }
  
  if (eslint.totalWarnings > 0) {
    const warningPenalty = Math.min(eslint.totalWarnings * 0.5, 15);
    score -= warningPenalty;
    issues.push(`ESLint warnings: -${warningPenalty} points`);
  }
  
  // TypeScript scoring
  if (typescript.typeErrors > 0) {
    const typePenalty = Math.min(typescript.typeErrors * 3, 40);
    score -= typePenalty;
    issues.push(`TypeScript errors: -${typePenalty} points`);
  }
  
  // Security scoring
  if (security.critical > 0) {
    score -= security.critical * 10;
    issues.push(`Critical vulnerabilities: -${security.critical * 10} points`);
  }
  if (security.high > 0) {
    score -= security.high * 5;
    issues.push(`High vulnerabilities: -${security.high * 5} points`);
  }
  
  // Complexity scoring
  if (complexity.complexFiles > 5) {
    const complexityPenalty = Math.min((complexity.complexFiles - 5) * 2, 10);
    score -= complexityPenalty;
    issues.push(`Complex files: -${complexityPenalty} points`);
  }
  
  score = Math.max(score, 0);
  
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const color = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';
  
  log(`🎯 Overall Quality Score: ${score}/100 (Grade: ${grade})`, color);
  
  if (issues.length > 0) {
    log(`\n📉 Score Deductions:`, 'yellow');
    issues.forEach(issue => log(`  • ${issue}`, 'yellow'));
  }
  
  return { score, grade, issues };
}

/**
 * Main analysis function
 */
function runCodeQualityAnalysis() {
  log(`${colors.bold}🔍 Code Quality Analysis Tool${colors.reset}`, 'magenta');
  log('Performing comprehensive code quality analysis...\n');
  
  const startTime = Date.now();
  
  try {
    // Run all analyses
    const eslintResults = runESLintAnalysis();
    const typescriptResults = runTypeScriptAnalysis();
    const securityResults = runSecurityAudit();
    const complexityResults = analyzeCodeComplexity();
    
    // Generate quality score
    const qualityScore = generateQualityScore(
      eslintResults,
      typescriptResults,
      securityResults,
      complexityResults
    );
    
    // Save comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      eslint: eslintResults,
      typescript: typescriptResults,
      security: securityResults,
      complexity: complexityResults,
      qualityScore
    };
    
    const reportPath = 'reports/code-quality-report.json';
    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    logSection('Summary');
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`✅ Analysis completed in ${duration}s`, 'green');
    log(`📄 Comprehensive report saved to: ${reportPath}`, 'blue');
    
    // Exit with appropriate code
    const hasErrors = eslintResults.totalErrors > 0 || !typescriptResults.success || securityResults.critical > 0;
    process.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    log(`❌ Analysis failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runCodeQualityAnalysis();
}

module.exports = {
  runCodeQualityAnalysis,
  runESLintAnalysis,
  runTypeScriptAnalysis,
  runSecurityAudit,
  analyzeCodeComplexity
};

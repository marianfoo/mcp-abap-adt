#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for file information extracted during summarization
 */
interface FileInfo {
  filePath: string;
  relativePath: string;
  size: number;
  lines: number;
  imports: string[];
  exports: string[];
  classes: string[];
  functions: string[];
  interfaces: string[];
  types: string[];
  comments: string[];
}

/**
 * Interface for project summary
 */
interface ProjectSummary {
  projectName: string;
  totalFiles: number;
  totalLines: number;
  totalSize: number;
  generatedAt: Date;
  files: FileInfo[];
  configFiles: { [key: string]: string };
}

/**
 * TypeScript Code Summarizer
 * Analyzes and summarizes all TypeScript files in the src directory
 */
class CodeSummarizer {
  private projectRoot: string;
  private srcDir: string;
  private summary: ProjectSummary;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.srcDir = path.join(projectRoot, 'src');
    this.summary = {
      projectName: this.getProjectName(),
      totalFiles: 0,
      totalLines: 0,
      totalSize: 0,
      generatedAt: new Date(),
      files: [],
      configFiles: {}
    };
  }

  /**
   * Get project name from package.json
   */
  private getProjectName(): string {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.name || 'Unknown Project';
    } catch (error) {
      return 'Unknown Project';
    }
  }

  /**
   * Recursively get all TypeScript files in a directory
   */
  private getAllTsFiles(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          files.push(...this.getAllTsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}:`, error);
    }
    
    return files;
  }

  /**
   * Analyze a TypeScript file and extract information
   */
  private analyzeFile(filePath: string): FileInfo {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const stats = fs.statSync(filePath);
    
    const fileInfo: FileInfo = {
      filePath,
      relativePath: path.relative(this.projectRoot, filePath),
      size: stats.size,
      lines: lines.length,
      imports: [],
      exports: [],
      classes: [],
      functions: [],
      interfaces: [],
      types: [],
      comments: []
    };

    // Extract various code elements using regex patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Extract imports
      if (line.startsWith('import ') || line.includes('from \'') || line.includes('from "')) {
        fileInfo.imports.push(line);
      }
      
      // Extract exports
      if (line.startsWith('export ')) {
        fileInfo.exports.push(line);
      }
      
      // Extract classes
      const classMatch = line.match(/^export\s+(?:default\s+)?class\s+(\w+)/);
      if (classMatch) {
        fileInfo.classes.push(classMatch[1]);
      }
      
      // Extract functions
      const functionMatch = line.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
      if (functionMatch) {
        fileInfo.functions.push(functionMatch[1]);
      }
      
      // Extract arrow functions (methods)
      const arrowFunctionMatch = line.match(/(\w+)\s*[:=]\s*(?:async\s+)?\([^)]*\)\s*=>/);
      if (arrowFunctionMatch) {
        fileInfo.functions.push(arrowFunctionMatch[1]);
      }
      
      // Extract interfaces
      const interfaceMatch = line.match(/^(?:export\s+)?interface\s+(\w+)/);
      if (interfaceMatch) {
        fileInfo.interfaces.push(interfaceMatch[1]);
      }
      
      // Extract types
      const typeMatch = line.match(/^(?:export\s+)?type\s+(\w+)/);
      if (typeMatch) {
        fileInfo.types.push(typeMatch[1]);
      }
      
      // Extract comments (single line and JSDoc)
      if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/**')) {
        fileInfo.comments.push(line);
      }
    }

    return fileInfo;
  }

  /**
   * Read configuration files
   */
  private readConfigFiles(): void {
    const configFiles = ['package.json', 'tsconfig.json', 'README.md'];
    
    for (const configFile of configFiles) {
      const filePath = path.join(this.projectRoot, configFile);
      try {
        if (fs.existsSync(filePath)) {
          this.summary.configFiles[configFile] = fs.readFileSync(filePath, 'utf-8');
        }
      } catch (error) {
        console.warn(`Warning: Could not read ${configFile}:`, error);
      }
    }
  }

  /**
   * Generate the complete project summary
   */
  public generateSummary(): ProjectSummary {
    console.log('🔍 Analyzing TypeScript project...');
    
    // Read configuration files
    this.readConfigFiles();
    
    // Get all TypeScript files
    const tsFiles = this.getAllTsFiles(this.srcDir);
    console.log(`📁 Found ${tsFiles.length} TypeScript files`);
    
    // Analyze each file
    for (const filePath of tsFiles) {
      try {
        const fileInfo = this.analyzeFile(filePath);
        this.summary.files.push(fileInfo);
        this.summary.totalLines += fileInfo.lines;
        this.summary.totalSize += fileInfo.size;
      } catch (error) {
        console.warn(`Warning: Could not analyze ${filePath}:`, error);
      }
    }
    
    this.summary.totalFiles = this.summary.files.length;
    
    console.log(`✅ Analysis complete: ${this.summary.totalFiles} files, ${this.summary.totalLines} lines`);
    return this.summary;
  }

  /**
   * Generate a formatted text summary
   */
  public generateTextSummary(): string {
    const summary = this.generateSummary();
    
    let output = '';
    
    // Header
    output += '='.repeat(80) + '\n';
    output += `PROJECT CODE SUMMARY: ${summary.projectName}\n`;
    output += '='.repeat(80) + '\n';
    output += `Generated at: ${summary.generatedAt.toISOString()}\n`;
    output += `Total Files: ${summary.totalFiles}\n`;
    output += `Total Lines: ${summary.totalLines}\n`;
    output += `Total Size: ${(summary.totalSize / 1024).toFixed(2)} KB\n`;
    output += '\n';

    // Configuration Files Section
    output += '📋 CONFIGURATION FILES\n';
    output += '='.repeat(50) + '\n';
    
    for (const [fileName, content] of Object.entries(summary.configFiles)) {
      output += `\n📄 ${fileName}\n`;
      output += '-'.repeat(30) + '\n';
      output += content + '\n';
    }

    // Source Files Overview
    output += '\n📂 SOURCE FILES OVERVIEW\n';
    output += '='.repeat(50) + '\n';
    
    const sortedFiles = summary.files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    
    for (const file of sortedFiles) {
      output += `\n📄 ${file.relativePath}\n`;
      output += `-`.repeat(40) + '\n';
      output += `Size: ${file.size} bytes | Lines: ${file.lines}\n`;
      
      if (file.imports.length > 0) {
        output += `\n📦 Imports (${file.imports.length}):\n`;
        file.imports.slice(0, 10).forEach(imp => output += `  ${imp}\n`);
        if (file.imports.length > 10) {
          output += `  ... and ${file.imports.length - 10} more\n`;
        }
      }
      
      if (file.exports.length > 0) {
        output += `\n📤 Exports (${file.exports.length}):\n`;
        file.exports.slice(0, 10).forEach(exp => output += `  ${exp}\n`);
        if (file.exports.length > 10) {
          output += `  ... and ${file.exports.length - 10} more\n`;
        }
      }
      
      if (file.classes.length > 0) {
        output += `\n🏛️  Classes: ${file.classes.join(', ')}\n`;
      }
      
      if (file.interfaces.length > 0) {
        output += `\n🔗 Interfaces: ${file.interfaces.join(', ')}\n`;
      }
      
      if (file.types.length > 0) {
        output += `\n🏷️  Types: ${file.types.join(', ')}\n`;
      }
      
      if (file.functions.length > 0) {
        output += `\n⚙️  Functions: ${file.functions.join(', ')}\n`;
      }
    }

    // Detailed File Contents Section
    output += '\n\n📜 DETAILED FILE CONTENTS\n';
    output += '='.repeat(50) + '\n';
    
    for (const file of sortedFiles) {
      output += `\n${'='.repeat(80)}\n`;
      output += `FILE: ${file.relativePath}\n`;
      output += `${'='.repeat(80)}\n`;
      
      try {
        const content = fs.readFileSync(file.filePath, 'utf-8');
        output += content + '\n';
      } catch (error) {
        output += `Error reading file: ${error}\n`;
      }
    }

    // Summary Statistics
    output += '\n\n📊 PROJECT STATISTICS\n';
    output += '='.repeat(50) + '\n';
    
    const totalClasses = summary.files.reduce((sum, file) => sum + file.classes.length, 0);
    const totalInterfaces = summary.files.reduce((sum, file) => sum + file.interfaces.length, 0);
    const totalFunctions = summary.files.reduce((sum, file) => sum + file.functions.length, 0);
    const totalTypes = summary.files.reduce((sum, file) => sum + file.types.length, 0);
    
    output += `Classes: ${totalClasses}\n`;
    output += `Interfaces: ${totalInterfaces}\n`;
    output += `Functions: ${totalFunctions}\n`;
    output += `Types: ${totalTypes}\n`;
    
    // File distribution by directory
    const dirStats: { [key: string]: number } = {};
    summary.files.forEach(file => {
      const dir = path.dirname(file.relativePath);
      dirStats[dir] = (dirStats[dir] || 0) + 1;
    });
    
    output += '\n📁 Files by Directory:\n';
    Object.entries(dirStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([dir, count]) => {
        output += `  ${dir}: ${count} files\n`;
      });

    return output;
  }

  /**
   * Save summary to a text file
   */
  public saveToFile(fileName: string = 'code-summary.txt'): string {
    const textSummary = this.generateTextSummary();
    const outputPath = path.join(this.projectRoot, fileName);
    
    fs.writeFileSync(outputPath, textSummary, 'utf-8');
    console.log(`💾 Summary saved to: ${outputPath}`);
    
    return outputPath;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting code summarization...');
    
    const summarizer = new CodeSummarizer();
    const outputPath = summarizer.saveToFile();
    
    console.log('✅ Code summarization completed successfully!');
    console.log(`📄 Summary file: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error during summarization:', error);
    process.exit(1);
  }
}

// Run the script if executed directly
if (require.main === module) {
  main();
}

export { CodeSummarizer, ProjectSummary, FileInfo };

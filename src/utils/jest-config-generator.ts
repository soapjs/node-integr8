import { readFileSync } from 'fs';
import { resolve } from 'path';
import Handlebars from 'handlebars';
import { Integr8Config } from '../types';

export class JestConfigGenerator {
  private template: HandlebarsTemplateDelegate;

  constructor() {
    // Load the Jest config template
    const templatePath = resolve(__dirname, '../templates/jest.config.hbs');
    const templateSource = readFileSync(templatePath, 'utf8');
    this.template = Handlebars.compile(templateSource);
  }

  generateJestConfig(config: Integr8Config, testDir: string): string {
    // Prepare template data - only Jest-specific options
    const templateData = {
      testDir,
      testTimeout: config.testTimeout || 30000,
      setupTimeout: config.setupTimeout || 10000,
      teardownTimeout: config.teardownTimeout || 5000
    };

    // Generate the Jest config
    return this.template(templateData);
  }

  generateJestConfigFile(config: Integr8Config, testDir: string, outputPath: string): void {
    const jestConfig = this.generateJestConfig(config, testDir);
    
    // Write the config file
    const fs = require('fs');
    fs.writeFileSync(outputPath, jestConfig);
  }
}

// Export singleton instance
export const jestConfigGenerator = new JestConfigGenerator();

import { createDefaultTests, createCustomTests, createStressTests } from '../../src/utils/default-tests.js';

describe('Default Tests', () => {
  describe('createDefaultTests', () => {
    it('should return an array of benchmark configurations', () => {
      const tests = createDefaultTests();

      expect(Array.isArray(tests)).toBe(true);
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should have valid test configurations', () => {
      const tests = createDefaultTests();

      tests.forEach(test => {
        expect(test).toHaveProperty('name');
        expect(test).toHaveProperty('description');
        expect(test).toHaveProperty('category');
        expect(test).toHaveProperty('prompt');
        expect(test).toHaveProperty('timeout');
        expect(test).toHaveProperty('maxRetries');

        expect(typeof test.name).toBe('string');
        expect(typeof test.description).toBe('string');
        expect(typeof test.category).toBe('string');
        expect(typeof test.prompt).toBe('string');
        expect(typeof test.timeout).toBe('number');
        expect(typeof test.maxRetries).toBe('number');

        expect(test.name.length).toBeGreaterThan(0);
        expect(test.prompt.length).toBeGreaterThan(0);
        expect(test.timeout).toBeGreaterThan(0);
        expect(test.maxRetries).toBeGreaterThanOrEqual(0);
      });
    });

    it('should include component analysis test', () => {
      const tests = createDefaultTests();
      const componentTest = tests.find(test => test.category === 'component-analysis');

      expect(componentTest).toBeDefined();
      expect(componentTest?.name).toContain('Component Analysis');
    });

    it('should include UI generation test', () => {
      const tests = createDefaultTests();
      const uiTest = tests.find(test => test.category === 'ui-generation');

      expect(uiTest).toBeDefined();
      expect(uiTest?.name).toContain('UI Component Generation');
    });
  });

  describe('createCustomTests', () => {
    it('should create tests based on focus areas', () => {
      const tests = createCustomTests({
        focusAreas: ['search', 'refactoring'],
        complexity: 'medium'
      });

      expect(tests.length).toBeGreaterThanOrEqual(2);

      const categories = tests.map(test => test.category);
      expect(categories).toContain('advanced-search');
      expect(categories).toContain('smart-refactoring');
    });

    it('should adjust complexity', () => {
      const simpleTests = createCustomTests({
        focusAreas: ['search'],
        complexity: 'simple'
      });

      const complexTests = createCustomTests({
        focusAreas: ['analysis'],
        complexity: 'complex'
      });

      const simpleTest = simpleTests[0];
      const complexTest = complexTests[0];

      expect(simpleTest.prompt.length).toBeLessThan(complexTest.prompt.length);
      expect(complexTest.timeout).toBeGreaterThan(simpleTest.timeout || 120000);
    });

    it('should use custom timeout', () => {
      const tests = createCustomTests({
        focusAreas: ['search'],
        timeout: 60000
      });

      tests.forEach(test => {
        expect(test.timeout).toBe(60000);
      });
    });

    it('should handle empty focus areas', () => {
      const tests = createCustomTests({
        focusAreas: [],
        complexity: 'medium'
      });

      // Should default to search and refactoring
      expect(tests.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('createStressTests', () => {
    it('should return stress test configurations', () => {
      const tests = createStressTests();

      expect(Array.isArray(tests)).toBe(true);
      expect(tests.length).toBeGreaterThan(0);
    });

    it('should have longer timeouts', () => {
      const tests = createStressTests();

      tests.forEach(test => {
        expect(test.timeout).toBeGreaterThanOrEqual(300000); // At least 5 minutes
      });
    });

    it('should have fewer retries', () => {
      const tests = createStressTests();

      tests.forEach(test => {
        expect(test.maxRetries).toBeLessThanOrEqual(1);
      });
    });

    it('should include stress categories', () => {
      const tests = createStressTests();
      const categories = tests.map(test => test.category);

      expect(categories).toContain('stress-search');
      expect(categories).toContain('stress-refactoring');
      expect(categories).toContain('stress-analysis');
    });

    it('should have complex prompts', () => {
      const tests = createStressTests();

      tests.forEach(test => {
        expect(test.prompt.length).toBeGreaterThan(100);
        expect(test.prompt).toMatch(/complex|comprehensive|entire|all/i);
      });
    });
  });
});
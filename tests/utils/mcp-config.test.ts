import {
  createGlootieConfig,
  createMCPServerConfig,
  createPopularServerConfigs,
  validateMCPServerConfig,
  createClaudeConfig
} from '../../src/utils/mcp-config.js';

describe('MCP Config Utils', () => {
  describe('createGlootieConfig', () => {
    it('should create default glootie configuration', () => {
      const config = createGlootieConfig({});

      expect(config.name).toBe('glootie');
      expect(config.command).toBe('node');
      expect(config.args).toHaveLength(1);
      expect(config.args[0]).toContain('index.js');
      expect(config.env).toEqual({});
    });

    it('should use custom server path', () => {
      const customPath = '/custom/path/server.js';
      const config = createGlootieConfig({
        serverPath: customPath
      });

      expect(config.args[0]).toBe(customPath);
    });

    it('should use custom working directory', () => {
      const customDir = '/custom/workdir';
      const config = createGlootieConfig({
        workingDirectory: customDir
      });

      expect(config.cwd).toBe(customDir);
    });

    it('should include custom arguments', () => {
      const customArgs = ['--debug', '--verbose'];
      const config = createGlootieConfig({
        customArgs
      });

      expect(config.args).toContain('--debug');
      expect(config.args).toContain('--verbose');
    });
  });

  describe('createMCPServerConfig', () => {
    it('should create basic MCP server configuration', () => {
      const config = createMCPServerConfig({
        name: 'test-server',
        command: 'node',
        args: ['server.js']
      });

      expect(config.name).toBe('test-server');
      expect(config.command).toBe('node');
      expect(config.args).toEqual(['server.js']);
      expect(config.env).toEqual({});
    });

    it('should include environment variables', () => {
      const env = { TEST_VAR: 'test-value' };
      const config = createMCPServerConfig({
        name: 'test-server',
        command: 'node',
        env
      });

      expect(config.env).toEqual(env);
    });

    it('should include working directory', () => {
      const cwd = '/test/directory';
      const config = createMCPServerConfig({
        name: 'test-server',
        command: 'node',
        cwd
      });

      expect(config.cwd).toBe(cwd);
    });
  });

  describe('createPopularServerConfigs', () => {
    it('should return object with popular server configurations', () => {
      const configs = createPopularServerConfigs();

      expect(typeof configs).toBe('object');
      expect(Object.keys(configs).length).toBeGreaterThan(0);
    });

    it('should include filesystem server', () => {
      const configs = createPopularServerConfigs();

      expect(configs).toHaveProperty('filesystem');
      expect(configs.filesystem.name).toBe('filesystem');
      expect(configs.filesystem.command).toBe('npx');
    });

    it('should include github server', () => {
      const configs = createPopularServerConfigs();

      expect(configs).toHaveProperty('github');
      expect(configs.github.name).toBe('github');
      expect(configs.github.env).toHaveProperty('GITHUB_PERSONAL_ACCESS_TOKEN');
    });

    it('should include postgres server', () => {
      const configs = createPopularServerConfigs();

      expect(configs).toHaveProperty('postgres');
      expect(configs.postgres.name).toBe('postgres');
      expect(configs.postgres.env).toHaveProperty('POSTGRES_CONNECTION_STRING');
    });

    it('should include puppeteer server', () => {
      const configs = createPopularServerConfigs();

      expect(configs).toHaveProperty('puppeteer');
      expect(configs.puppeteer.name).toBe('puppeteer');
    });

    it('should include brave search server', () => {
      const configs = createPopularServerConfigs();

      expect(configs).toHaveProperty('brave_search');
      expect(configs.brave_search.name).toBe('brave-search');
      expect(configs.brave_search.env).toHaveProperty('BRAVE_API_KEY');
    });
  });

  describe('validateMCPServerConfig', () => {
    it('should validate correct configuration', () => {
      const config = createMCPServerConfig({
        name: 'test-server',
        command: 'node',
        args: ['server.js']
      });

      const validation = validateMCPServerConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing name', () => {
      const config = createMCPServerConfig({
        name: '',
        command: 'node',
        args: ['server.js']
      });

      const validation = validateMCPServerConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Server name is required');
    });

    it('should detect missing command', () => {
      const config = createMCPServerConfig({
        name: 'test-server',
        command: '',
        args: ['server.js']
      });

      const validation = validateMCPServerConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Server command is required');
    });

    it('should detect invalid args type', () => {
      const config = {
        name: 'test-server',
        command: 'node',
        args: 'not-an-array' as any,
        env: {}
      };

      const validation = validateMCPServerConfig(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Server args must be an array');
    });

    it('should warn about spaces in name', () => {
      const config = createMCPServerConfig({
        name: 'test server',
        command: 'node',
        args: ['server.js']
      });

      const validation = validateMCPServerConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Server name contains spaces, which may cause issues');
    });

    it('should warn about node without arguments', () => {
      const config = createMCPServerConfig({
        name: 'test-server',
        command: 'node',
        args: []
      });

      const validation = validateMCPServerConfig(config);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Node command without arguments may fail');
    });

    it('should warn about missing environment variables', () => {
      const config = createMCPServerConfig({
        name: 'github',
        command: 'npx',
        args: ['@modelcontextprotocol/server-github']
      });

      const validation = validateMCPServerConfig(config);

      expect(validation.warnings.some(w => w.includes('GITHUB_PERSONAL_ACCESS_TOKEN'))).toBe(true);
    });
  });

  describe('createClaudeConfig', () => {
    it('should create Claude configuration JSON', () => {
      const servers = [
        createMCPServerConfig({
          name: 'test-server',
          command: 'node',
          args: ['server.js'],
          env: { TEST_VAR: 'value' }
        })
      ];

      const configJson = createClaudeConfig(servers);
      const config = JSON.parse(configJson);

      expect(config).toHaveProperty('mcpServers');
      expect(config.mcpServers).toHaveProperty('test-server');
      expect(config.mcpServers['test-server']).toEqual({
        command: 'node',
        args: ['server.js'],
        env: { TEST_VAR: 'value' }
      });
    });

    it('should handle multiple servers', () => {
      const servers = [
        createMCPServerConfig({
          name: 'server1',
          command: 'node',
          args: ['server1.js']
        }),
        createMCPServerConfig({
          name: 'server2',
          command: 'python',
          args: ['server2.py']
        })
      ];

      const configJson = createClaudeConfig(servers);
      const config = JSON.parse(configJson);

      expect(Object.keys(config.mcpServers)).toHaveLength(2);
      expect(config.mcpServers).toHaveProperty('server1');
      expect(config.mcpServers).toHaveProperty('server2');
    });

    it('should handle empty server list', () => {
      const configJson = createClaudeConfig([]);
      const config = JSON.parse(configJson);

      expect(config.mcpServers).toEqual({});
    });
  });
});
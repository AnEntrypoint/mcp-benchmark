export function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--mcp-tool':
      case '-m':
        config.mcpTool = args[++i];
        break;
      case '--mcp-args':
      case '-a':
        config.mcpArgs = args[++i].split(' ');
        break;
      case '--custom-project':
      case '-p':
        config.customProject = args[++i];
        break;
      case '--timeout':
      case '-t':
        config.timeout = parseInt(args[++i]);
        break;
      case '--output-dir':
      case '-o':
        config.outputDir = args[++i];
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return config;
}

function showHelp() {
  console.log(`
MCP Benchmark Runner - A standalone npx-compatible MCP tool benchmark

Usage: mcp-benchmark [options]

Options:
  -m, --mcp-tool <tool>       MCP tool to benchmark (default: @modelcontextprotocol/server-github)
  -a, --mcp-args <args>       Additional arguments for MCP tool (space-separated)
  -p, --custom-project <path> Path to custom project to use for testing
  -t, --timeout <ms>          Test timeout in milliseconds
  -o, --output-dir <dir>      Output directory for results (default: results)
  -h, --help                  Show this help message

Examples:
  mcp-benchmark -m @modelcontextprotocol/server-github
  mcp-benchmark -m @modelcontextprotocol/server-brave-search -a "--api-key YOUR_KEY"
  mcp-benchmark -p ./my-project -t 1800000
  mcp-benchmark -o benchmark-results
  `);
}
# MCP Benchmark Runner

A standalone npx-compatible tool for benchmarking MCP (Model Context Protocol) tools.

## Features

- **Universal MCP Support**: Works with any MCP tool loadable via npx
- **Parallel Testing**: Runs baseline vs MCP tests for accurate comparison
- **Custom Projects**: Test with your own codebase or use default test project
- **Detailed Reports**: Generates performance metrics and actionable suggestions
- **Clean Output**: Streamlined, readable console output

## Installation

```bash
npm install -g mcp-benchmark
```

## Usage

### Basic Usage

```bash
mcp-benchmark
```

### With Custom MCP Tool

```bash
mcp-benchmark --mcp-tool @modelcontextprotocol/server-github
```

### With Arguments

```bash
mcp-benchmark -m @modelcontextprotocol/server-brave-search -a "--api-key YOUR_KEY"
```

### With Custom Project

```bash
mcp-benchmark -p ./my-project
```

### Advanced Options

```bash
mcp-benchmark \
  --mcp-tool @modelcontextprotocol/server-github \
  --custom-project ./my-app \
  --timeout 1800000 \
  --output-dir results
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --mcp-tool` | MCP tool to benchmark | `@modelcontextprotocol/server-github` |
| `-a, --mcp-args` | Additional arguments for MCP tool | `[]` |
| `-p, --custom-project` | Path to custom project | `null` |
| `-t, --timeout` | Test timeout in milliseconds | `300000` |
| `-o, --output-dir` | Output directory for results | `results` |
| `-h, --help` | Show help message | - |

## How It Works

1. **Setup**: Creates test environments with and without MCP tool
2. **Testing**: Runs parallel tests comparing baseline vs MCP performance
3. **Analysis**: Measures execution time, success rates, and tool usage
4. **Reporting**: Generates detailed performance metrics and suggestions

## Output

The tool generates:

- **Console Output**: Real-time test progress and results
- **JSON Results**: Detailed performance data in `results/` directory
- **SUGGESTIONS.md**: AI-generated improvement recommendations

## Examples

### Benchmark GitHub MCP Server

```bash
mcp-benchmark -m @modelcontextprotocol/server-github
```

### Benchmark Custom MCP Tool

```bash
mcp-benchmark -m @myorg/mcp-tool -a "--config ./config.json"
```

### Benchmark with Your Project

```bash
mcp-benchmark -p ./my-node-project
```

## Development

```bash
# Clone and run locally
git clone <repository>
cd mcp-benchmark
npm install
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
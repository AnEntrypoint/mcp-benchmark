#!/bin/bash

# Example usage of the MCP Benchmark Runner
# This demonstrates how to benchmark different MCP tools

echo "🚀 MCP Benchmark Runner Examples"
echo "================================"

# Example 1: Benchmark GitHub MCP server
echo "1. Benchmarking GitHub MCP server..."
mcp-benchmark -m @modelcontextprotocol/server-github

# Example 2: Benchmark with custom project
echo "2. Benchmarking with custom project..."
mcp-benchmark -p ../mcp-repl

# Example 3: Benchmark with custom arguments
echo "3. Benchmarking with custom arguments..."
mcp-benchmark -m @modelcontextprotocol/server-brave-search -a "--api-key YOUR_KEY"

# Example 4: Custom output directory
echo "4. Benchmarking with custom output..."
mcp-benchmark -o my-benchmark-results

echo "✅ Examples completed!"
echo "Check the generated SUGGESTIONS.md file for insights."
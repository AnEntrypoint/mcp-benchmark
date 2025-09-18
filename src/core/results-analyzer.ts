import { BenchmarkSuite, BenchmarkResult } from '../types/index.js';

export class ResultsAnalyzer {
  /**
   * Parse Claude output into structured data
   */
  async parseClaudeOutput(output: string): Promise<{
    rawOutput: string;
    stepData: any[];
    totalSteps: number;
    toolCalls: any[];
    toolResults: any[];
    toolsUsed: string[];
    mcpServerStatus: string;
    totalToolCalls: number;
    totalToolResults: number;
    parseError?: string;
  }> {
    try {
      // Split output into lines and filter out empty ones
      const lines = output.split('\n').filter(line => line.trim());
      let jsonLines: any[] = [];

      // Try to parse as JSON stream first
      const potentialJsonLines = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(item => item);

      if (potentialJsonLines.length > 0) {
        jsonLines = potentialJsonLines;
      } else {
        // If no JSON lines, treat as plain text output
        jsonLines = [{
          type: 'final_response',
          content: output,
          timestamp: new Date().toISOString()
        }];
      }

      // Extract tool calls and results
      const toolCalls: any[] = [];
      const toolResults: any[] = [];
      const toolsUsed = new Set<string>();

      jsonLines.forEach(item => {
        // Check for tool calls in assistant messages
        if (item.type === 'assistant' && item.message && item.message.content) {
          item.message.content.forEach((content: any) => {
            if (content.type === 'tool_use') {
              toolCalls.push({
                id: content.id,
                name: content.name,
                input: content.input
              });
              toolsUsed.add(content.name);
            }
          });
        }

        // Check for tool results in user messages
        if (item.type === 'user' && item.message && item.message.content) {
          item.message.content.forEach((content: any) => {
            if (content.tool_use_id && content.type === 'tool_result') {
              toolResults.push({
                tool_use_id: content.tool_use_id,
                content: content.content
              });
            }
          });
        }

        // Check for available tools list
        if (item.type === 'system' && item.tools) {
          item.tools.forEach((tool: any) => {
            if (typeof tool === 'string') {
              toolsUsed.add(tool);
            } else if (tool.name) {
              toolsUsed.add(tool.name);
            }
          });
        }
      });

      // Determine MCP server status
      let mcpServerStatus = 'unknown';
      jsonLines.forEach(item => {
        if (item.mcp_servers && item.mcp_servers.length > 0) {
          mcpServerStatus = item.mcp_servers[0].status || 'running';
        }
      });

      // Count meaningful interactions as steps
      const stepData = jsonLines.filter(item => {
        // Include tool calls and results
        if (item.type === 'assistant' && item.message && item.message.content) {
          return item.message.content.some((content: any) => content.type === 'tool_use');
        }
        if (item.type === 'user' && item.message && item.message.content) {
          return item.message.content.some((content: any) => content.type === 'tool_result');
        }
        // Include system initialization messages
        if (item.type === 'system' && item.subtype === 'init') {
          return true;
        }
        // Also include explicit step markers if they exist
        return item.type === 'step' || item.step;
      });

      return {
        rawOutput: output,
        stepData,
        totalSteps: stepData.length,
        toolCalls,
        toolResults,
        toolsUsed: Array.from(toolsUsed),
        mcpServerStatus,
        totalToolCalls: toolCalls.length,
        totalToolResults: toolResults.length
      };
    } catch (parseError: any) {
      return {
        rawOutput: output,
        parseError: parseError.message,
        stepData: [],
        totalSteps: 0,
        toolCalls: [],
        toolResults: [],
        toolsUsed: [],
        mcpServerStatus: 'parse_error',
        totalToolCalls: 0,
        totalToolResults: 0
      };
    }
  }

  /**
   * Generate summary report from benchmark results
   */
  generateSummaryReport(suite: BenchmarkSuite): string {
    const { name, version, results, avgImprovement } = suite;
    const successful = results.filter(r => r.baseline.success && r.optimized.success).length;
    const failed = results.length - successful;

    let report = `# ${name} Benchmark Results\n\n`;
    report += `**Version**: ${version}\n`;
    report += `**Timestamp**: ${suite.timestamp}\n`;
    report += `**Platform**: ${suite.systemInfo.platform} ${suite.systemInfo.arch}\n`;
    report += `**Node.js**: ${suite.systemInfo.nodeVersion}\n\n`;

    report += `## Summary\n\n`;
    report += `- **Total Tests**: ${results.length}\n`;
    report += `- **Successful**: ${successful}\n`;
    report += `- **Failed**: ${failed}\n`;
    report += `- **Average Improvement**: ${avgImprovement}%\n\n`;

    if (successful > 0) {
      report += `## Test Results\n\n`;
      report += `| Test | Baseline | MCP | Improvement |\n`;
      report += `|------|----------|-----|-------------|\n`;

      results.forEach(result => {
        const baselineStatus = result.baseline.success ? '✅' : '❌';
        const mcpStatus = result.optimized.success ? '✅' : '❌';
        const baselineTime = result.baseline.success ? `${result.baseline.duration.toFixed(1)}s` : 'FAILED';
        const mcpTime = result.optimized.success ? `${result.optimized.duration.toFixed(1)}s` : 'FAILED';

        report += `| ${result.test.name} | ${baselineStatus} ${baselineTime} | ${mcpStatus} ${mcpTime} | ${result.improvement}% |\n`;
      });

      report += `\n## Tool Usage Analysis\n\n`;
      results.forEach(result => {
        if (result.optimized.success && result.optimized.parsedOutput) {
          const { toolsUsed } = result.optimized.parsedOutput;
          const mcpTools = toolsUsed.filter(tool => tool.includes('mcp__') || tool.includes('g__'));
          const standardTools = toolsUsed.filter(tool => !tool.includes('mcp__') && !tool.includes('g__'));

          report += `### ${result.test.name}\n`;
          report += `- **MCP Tools**: ${mcpTools.length > 0 ? mcpTools.join(', ') : 'None'}\n`;
          report += `- **Standard Tools**: ${standardTools.length > 0 ? standardTools.join(', ') : 'None'}\n`;
          report += `- **Total Steps**: ${result.optimized.parsedOutput.totalSteps}\n\n`;
        }
      });
    }

    if (failed > 0) {
      report += `## Failed Tests\n\n`;
      results.filter(r => !r.baseline.success || !r.optimized.success).forEach(result => {
        report += `### ${result.test.name}\n`;
        if (!result.baseline.success) {
          report += `- **Baseline Error**: ${result.baseline.error}\n`;
        }
        if (!result.optimized.success) {
          report += `- **MCP Error**: ${result.optimized.error}\n`;
        }
        report += `\n`;
      });
    }

    return report;
  }

  /**
   * Generate detailed analysis with recommendations
   */
  generateAnalysisReport(suite: BenchmarkSuite): string {
    const { results } = suite;
    const successfulTests = results.filter(r => r.baseline.success && r.optimized.success);

    let report = `# Performance Analysis Report\n\n`;

    if (successfulTests.length === 0) {
      report += `No successful tests to analyze.\n`;
      return report;
    }

    // Performance analysis
    const improvements = successfulTests.map(r => parseFloat(r.improvement)).filter(i => !isNaN(i));
    const positiveImprovements = improvements.filter(i => i > 0);
    const negativeImprovements = improvements.filter(i => i < 0);

    report += `## Performance Overview\n\n`;
    report += `- **Tests with positive improvement**: ${positiveImprovements.length}\n`;
    report += `- **Tests with negative impact**: ${negativeImprovements.length}\n`;
    report += `- **Best improvement**: ${Math.max(...improvements).toFixed(1)}%\n`;
    report += `- **Worst impact**: ${Math.min(...improvements).toFixed(1)}%\n\n`;

    // Tool effectiveness analysis
    const toolUsageMap = new Map<string, { count: number; avgImprovement: number; improvements: number[] }>();

    successfulTests.forEach(result => {
      if (result.optimized.parsedOutput) {
        const { toolsUsed } = result.optimized.parsedOutput;
        const improvement = parseFloat(result.improvement);

        toolsUsed.forEach(tool => {
          if (!toolUsageMap.has(tool)) {
            toolUsageMap.set(tool, { count: 0, avgImprovement: 0, improvements: [] });
          }
          const toolData = toolUsageMap.get(tool)!;
          toolData.count++;
          toolData.improvements.push(improvement);
        });
      }
    });

    // Calculate average improvements for each tool
    toolUsageMap.forEach((data, tool) => {
      data.avgImprovement = data.improvements.reduce((sum, imp) => sum + imp, 0) / data.improvements.length;
    });

    report += `## Tool Effectiveness\n\n`;
    const sortedTools = Array.from(toolUsageMap.entries())
      .sort(([, a], [, b]) => b.avgImprovement - a.avgImprovement);

    sortedTools.forEach(([tool, data]) => {
      const isMcpTool = tool.includes('mcp__') || tool.includes('g__');
      const toolType = isMcpTool ? 'MCP' : 'Standard';
      report += `- **${tool}** (${toolType}): Used ${data.count} times, avg improvement ${data.avgImprovement.toFixed(1)}%\n`;
    });

    report += `\n## Recommendations\n\n`;

    if (positiveImprovements.length > negativeImprovements.length) {
      report += `✅ **Overall positive impact**: MCP tools show net benefit in ${positiveImprovements.length}/${improvements.length} tests.\n\n`;
    } else {
      report += `⚠️ **Mixed results**: Consider investigating configuration or tool selection.\n\n`;
    }

    // Identify most effective MCP tools
    const mcpTools = sortedTools.filter(([tool]) => tool.includes('mcp__') || tool.includes('g__'));
    if (mcpTools.length > 0) {
      const bestMcpTool = mcpTools[0];
      report += `🎯 **Most effective MCP tool**: ${bestMcpTool[0]} (${bestMcpTool[1].avgImprovement.toFixed(1)}% avg improvement)\n\n`;
    }

    // Identify problematic areas
    const problematicTests = successfulTests.filter(r => parseFloat(r.improvement) < -10);
    if (problematicTests.length > 0) {
      report += `🔍 **Tests with significant performance regression**:\n`;
      problematicTests.forEach(test => {
        report += `- ${test.test.name}: ${test.improvement}% impact\n`;
      });
      report += `\n`;
    }

    return report;
  }

  /**
   * Export results in various formats
   */
  exportResults(suite: BenchmarkSuite, format: 'json' | 'csv' | 'markdown'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(suite, null, 2);

      case 'csv':
        return this.exportToCsv(suite);

      case 'markdown':
        return this.generateSummaryReport(suite);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToCsv(suite: BenchmarkSuite): string {
    const headers = [
      'Test Name',
      'Category',
      'Baseline Success',
      'Baseline Duration (s)',
      'MCP Success',
      'MCP Duration (s)',
      'Improvement (%)',
      'Tools Used',
      'MCP Tools Count',
      'Standard Tools Count'
    ];

    let csv = headers.join(',') + '\n';

    suite.results.forEach(result => {
      const mcpTools = result.optimized.parsedOutput?.toolsUsed.filter(t => t.includes('mcp__') || t.includes('g__')) || [];
      const standardTools = result.optimized.parsedOutput?.toolsUsed.filter(t => !t.includes('mcp__') && !t.includes('g__')) || [];

      const row = [
        `"${result.test.name}"`,
        `"${result.test.category}"`,
        result.baseline.success,
        result.baseline.duration.toFixed(3),
        result.optimized.success,
        result.optimized.duration.toFixed(3),
        result.improvement,
        `"${result.optimized.parsedOutput?.toolsUsed.join('; ') || ''}"`,
        mcpTools.length,
        standardTools.length
      ];

      csv += row.join(',') + '\n';
    });

    return csv;
  }
}
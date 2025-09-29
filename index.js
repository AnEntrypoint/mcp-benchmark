#!/usr/bin/env node
import { MCPBenchmark } from './src/benchmark.js';
import { parseArgs } from './src/utils.js';

const config = parseArgs();
const benchmark = new MCPBenchmark(config);

benchmark.runBenchmark().catch(error => {
  console.error('❌ Benchmark failed:', error.message);
  process.exit(1);
});
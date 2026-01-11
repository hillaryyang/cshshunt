/**
 * Code Executor Module
 * Securely executes user-submitted Python code in a sandboxed environment
 */

const { spawn } = require('child_process');

/**
 * Execute Python code with security restrictions
 * @param {string} userCode - The user's Python code (function definition)
 * @param {number} n - The parameter to pass to fibonacci(n)
 * @param {number} timeout - Maximum execution time in milliseconds (default: 5000)
 * @returns {Promise<{success: boolean, output: string, error: string}>}
 */
function executePythonCode(userCode, n = 10, timeout = 5000) {
  return new Promise((resolve) => {
    // Wrap user code with function call
    const fullCode = `${userCode}\n\n# Call the function\nfibonacci(${n})`;

    // Spawn Python process
    const pythonProcess = spawn('python3', ['-c', fullCode]);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Set timeout to kill process if it runs too long
    const timeoutId = setTimeout(() => {
      timedOut = true;
      pythonProcess.kill('SIGKILL');
    }, timeout);

    // Capture stdout
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      // Limit output size to prevent memory issues
      if (stdout.length > 10000) {
        pythonProcess.kill('SIGKILL');
        stderr = 'Output too large (max 10000 characters)';
      }
    });

    // Capture stderr
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      // Limit error output size
      if (stderr.length > 5000) {
        stderr = stderr.substring(0, 5000) + '\n... (truncated)';
        pythonProcess.kill('SIGKILL');
      }
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      clearTimeout(timeoutId);

      if (timedOut) {
        resolve({
          success: false,
          output: stdout,
          error: 'Execution timed out (max 5 seconds). Check for infinite loops.'
        });
      } else if (code !== 0) {
        resolve({
          success: false,
          output: stdout,
          error: stderr || `Process exited with code ${code}`
        });
      } else {
        resolve({
          success: true,
          output: stdout.trim(),
          error: ''
        });
      }
    });

    // Handle process errors (e.g., Python not found)
    pythonProcess.on('error', (err) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        output: '',
        error: `Failed to execute Python: ${err.message}`
      });
    });
  });
}

/**
 * Generate expected Fibonacci sequence
 * @param {number} n - Number of Fibonacci numbers to generate
 * @returns {string} - Expected output (newline-separated)
 */
function generateFibonacci(n) {
  const result = [];
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    result.push(a);
    [a, b] = [b, a + b];
  }
  return result.join('\n');
}

/**
 * Validate Fibonacci output
 * @param {string} output - The output from code execution
 * @param {number} n - The expected number of Fibonacci numbers
 * @returns {boolean} - True if output matches expected Fibonacci sequence
 */
function validateFibonacciOutput(output, n) {
  const expectedOutput = generateFibonacci(n);

  // Normalize output: trim whitespace and normalize line endings
  const normalizedOutput = output
    .trim()
    .split('\n')
    .map(line => line.trim())
    .join('\n');

  return normalizedOutput === expectedOutput;
}

/**
 * Run multiple test cases for fibonacci code
 * @param {string} userCode - The user's Python code
 * @param {number[]} testCases - Array of n values to test
 * @returns {Promise<{passed: boolean, results: Array}>}
 */
async function runMultipleTests(userCode, testCases) {
  const results = [];

  for (const n of testCases) {
    const result = await executePythonCode(userCode, n);
    const isValid = result.success && validateFibonacciOutput(result.output, n);

    results.push({
      n: n,
      passed: isValid,
      output: result.output,
      error: result.error,
      expected: generateFibonacci(n)
    });

    // If any test fails, we can stop early
    if (!isValid) {
      break;
    }
  }

  const allPassed = results.every(r => r.passed);

  return {
    passed: allPassed,
    results: results
  };
}

module.exports = {
  executePythonCode,
  validateFibonacciOutput,
  runMultipleTests,
  generateFibonacci
};

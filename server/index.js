const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = 8000;

// Configures Express to use JSON & CORS parsing middleware
app.use(bodyParser.json());
app.use(cors());



// Endpoint for running code
app.post('/run', (req, res) => {
    const { language, code } = req.body;

    let results;

    // Checks the language and executes corresponding function
    if (language === 'cpp') {
        results = compileAndRunCPP(code);
    } else if (language === 'python') {
        results = compileAndRunPython(code);
    } else if (language === 'java') {
        results = compileAndRunJava(code);
    } else if (language === 'javascript') {
        results = compileAndRunJavaScript(code, 'add');
    } else {
        results = { error: 'Unsupported language' };
    }

    res.json({ results, ...getExecutionStats() });
});





function sleep(ms) {
    const start = Date.now();
    while (Date.now() - start < ms) {}
}

function getExecutionStats() {
    // Get time taken in ms
    const startTime = process.hrtime();
    // Simulate delay for 0.5 seconds to simulate code execution
    sleep(500);
    const memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024; // Memory space used in MB
    const endTime = process.hrtime(startTime);
    const executionTime = (endTime[0] * 1000) + (endTime[1] / 1000000); // Convert to ms
    const executionTimeInMs = Math.floor(executionTime); // Round down to get execution time in milliseconds
    const memoryUsageInMB = Math.floor(memoryUsed);
    console.log("Ex", executionTimeInMs);
    console.log("Mem", memoryUsageInMB)
    return { executionTimeInMs, memoryUsageInMB };
}






function compileAndRunCPP(code) {
    const testCases = [
        { input: "1 2", output: "3" },
        { input: "5 10", output: "15" },
        { input: "0 0", output: "0" }
    ];

    // Array to store test case results
    const results = [];
    for (let i = 0; i < testCases.length; i++) {
        const { input, output } = testCases[i];
        //console.log("input ", input);
        //console.log("output ", output);
        const testCaseResult = runTestCase(code, input, output, 'cpp');
       // console.log("testcase",testCaseResult)
        results.push(testCaseResult);
    }

    return results;
}



function compileAndRunPython(code) {
    const testCases = [
        { input: ["1", "2"], output: "3" },
        { input: ["5", "10"], output: "15" },
        { input: ["0", "0"], output: "0" }
    ];

    // Array to store test case results
    const results = [];

    // Create temporary Python file and run each test case
    const tempPythonFile = path.join(__dirname, 'temp.py');
    fs.writeFileSync(tempPythonFile, code);

    for (let i = 0; i < testCases.length; i++) {
        const { input, output } = testCases[i];
        const testCaseResult = runTestCase(tempPythonFile, input, output, 'python');
        results.push(testCaseResult);
    }

    return results;
}



function compileAndRunJava(code) {
    // Directory to store Java files
    const javaDir = path.join(__dirname, 'java');
    // Create the directory if it doesn't exist
    if (!fs.existsSync(javaDir)) {
        fs.mkdirSync(javaDir);
    }
    // Path for the Java source file
    const javaFile = path.join(javaDir, 'Main.java');
    // Write the Java code to the file
    fs.writeFileSync(javaFile, code);
    
    // Compilation command
    const compilation = spawnSync('javac', [javaFile]);
    // Check if compilation succeeded
    if (compilation.status !== 0) {
        return [false, false, false]; // Compilation failed for all test cases
    }

    // Test cases
    const testCases = [
        { input: "1 2", output: "3" },
        { input: "5 10", output: "15" },
        { input: "0 0", output: "0" }
    ];

    const results = [];
    for (let i = 0; i < testCases.length; i++) {
        const { input, output } = testCases[i];
        // Execution command
        const execution = spawnSync('java', ['-classpath', javaDir, 'Main'], { input });
        // Check if execution succeeded
        if (execution.status === 0) {
            const actualOutput = execution.stdout.toString().trim();
            results.push(actualOutput === output);
        } else {
            results.push(false); // Execution failed
        }
    }

    return results;
}




function compileAndRunJavaScript(code) {
  // Directory to store JavaScript files
  const jsDir = path.join(__dirname, 'javascript');
  // Create the directory if it doesn't exist
  if (!fs.existsSync(jsDir)) {
      fs.mkdirSync(jsDir);
  }
  // Path for the JavaScript file
  const jsFile = path.join(jsDir, 'script.js');
  // Write the JavaScript code to the file
  fs.writeFileSync(jsFile, code);
  
  const results = [];

  // Test cases
  const testCases = [
      { input: "1\n2\n", output: "3" },
      { input: "5\n10\n", output: "15" },
      { input: "0\n0\n", output: "0" }
  ];

  for (let i = 0; i < testCases.length; i++) {
      const { input, output } = testCases[i];
      console.log("input",input)
      console.log("output",output)
      // Execution command
      const execution = spawnSync('node', [jsFile], { input });
      console.log("Exc",execution)
      const actualOutput = execution.stdout.toString().trim();
      results.push(actualOutput === output);
  }

   console.log("Results",results) 
  return results;
}


function runTestCase(code, input, expectedOutput, language) {
    let process;
    if (language === 'cpp') {
        process = spawnSync('g++', ['-x', 'c++', '-o', 'temp', '-'], { input: code });
        if (process.status !== 0) {
            return false; // Compilation or execution failed
        }
        const execution = spawnSync('./temp', { input });
        const actualOutput = execution.stdout.toString().trim();
        return actualOutput === expectedOutput;
    } else if (language === 'python') {
        const tempPythonFile = code;
        const process = spawnSync('python', [tempPythonFile], { input: input.join("\n") });
        const actualOutput = process.stdout.toString().trim();
        return actualOutput === expectedOutput;
    } else {
        return false;
    }
}



app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

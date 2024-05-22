const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8000;

//Handling POST requests to the '/run' endpoint
app.use(bodyParser.json());
app.use(cors());

app.post('/run', (req, res) => {
    const { language, code, customTestCases } = req.body;

    let results;
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = process.hrtime();


    // Conditional statements to determine the language and execute appropriate functions
    if (language === 'cpp') {
        results = compileAndRunCPP(code, customTestCases);
    } else if (language === 'python') {
        results = compileAndRunPython(code, customTestCases);
    } else if (language === 'java') {
        results = compileAndRunJava(code, customTestCases);
    } else if (language === 'javascript') {
        results = compileAndRunJavaScript(code, customTestCases);
    } else {
        results = { error: 'Unsupported language' };
    }

// Calculating execution time and memory usage
const endTime = process.hrtime(startTime);
const endMemory = process.memoryUsage().heapUsed;
const executionTimeInMs = endTime[0] * 1000 + endTime[1] / 1000000;
const memoryUsageInMB = (endMemory - startMemory) / 1024 / 1024;

// Sending the results, execution time, and memory usage as JSON response
res.json({
  results,
  executionTimeInMs: Math.round(executionTimeInMs),
  memoryUsageInMB: memoryUsageInMB.toFixed(2),
   });
});

function compileAndRunCPP(code, customTestCases) {
    const defaultTestCases = [
        { input: "1 2", output: "3" },
        { input: "5 10", output: "15" },
        { input: "0 0", output: "0" }
    ];
    const testCases = defaultTestCases.concat(customTestCases);

    const results = [];
    for (let i = 0; i < testCases.length; i++) {
        const { input, output } = testCases[i];
        const testCaseResult = runTestCase(code, input, output, 'cpp');
        results.push(testCaseResult);
    }
    return results;
}

function compileAndRunPython(code, customTestCases) {
    const defaultTestCases = [
        { input: ["1", "2"], output: "3" },
        { input: ["5", "10"], output: "15" },
        { input: ["0", "0"], output: "0" }
    ];
    const testCases = defaultTestCases.concat(customTestCases);

    const results = [];
    const tempPythonFile = path.join(__dirname, 'temp.py');
    fs.writeFileSync(tempPythonFile, code);

    for (let i = 0; i < testCases.length; i++) {
        const { input, output } = testCases[i];
        // Ensure input is always an array
        const inputArray = Array.isArray(input) ? input : input.split(" ");
        const testCaseResult = runTestCase(tempPythonFile, inputArray, output, 'python');
        results.push(testCaseResult);
    }

    return results;
}

function compileAndRunJava(code, customTestCases) {
    const javaDir = path.join(__dirname, 'java');
    if (!fs.existsSync(javaDir)) {
        fs.mkdirSync(javaDir);
    }
    const javaFile = path.join(javaDir, 'Main.java');
    fs.writeFileSync(javaFile, code);

    const compilation = spawnSync('javac', [javaFile]);
    if (compilation.status !== 0) {
        return [false, false, false];
    }

    const defaultTestCases = [
        { input: "1 2", output: "3" },
        { input: "5 10", output: "15" },
        { input: "0 0", output: "0" }
    ];
    const testCases = defaultTestCases.concat(customTestCases);

    const results = [];
    for (let i = 0; i < testCases.length; i++) {
        const { input, output } = testCases[i];
        const execution = spawnSync('java', ['-classpath', javaDir, 'Main'], { input });
        if (execution.status === 0) {
            const actualOutput = execution.stdout.toString().trim();
            results.push(actualOutput === output);
        } else {
            results.push(false);
        }
    }

    return results;
}

function compileAndRunJavaScript(code, customTestCases) {
    const jsDir = path.join(__dirname, 'javascript');
    if (!fs.existsSync(jsDir)) {
        fs.mkdirSync(jsDir);
    }
    const jsFile = path.join(jsDir, 'script.js');
    fs.writeFileSync(jsFile, code);

    const defaultTestCases = [
        { input: "1\n2\n", output: "3" },
        { input: "5\n10\n", output: "15" },
        { input: "0\n0\n", output: "0" }
    ];
    const testCases = defaultTestCases.concat(customTestCases);

    const results = [];
    for (let i = 0; i < testCases.length; i++) {
        const { input, output } = testCases[i];
        const execution = spawnSync('node', [jsFile], { input });
        const actualOutput = execution.stdout.toString().trim();
        results.push(actualOutput === output);
    }

    return results;
}


// Function to execute test cases and compare output
function runTestCase(code, input, expectedOutput, language) {
    let process;
    if (language === 'cpp') {
        process = spawnSync('g++', ['-x', 'c++', '-o', 'temp', '-'], { input: code });
        if (process.status !== 0) {
            return false;
        }
        const execution = spawnSync('./temp', { input });
        const actualOutput = execution.stdout.toString().trim();
        return actualOutput === expectedOutput;
    } else if (language === 'python') {
        const tempPythonFile = code;
        const process = spawnSync('python', [tempPythonFile], { input: input.join("\n") });
        const actualOutput = process.stdout.toString().trim();
        return actualOutput === expectedOutput;
    } else if (language === 'java') {
        const execution = spawnSync('java', ['-cp', path.dirname(code), 'Main'], { input });
        const actualOutput = execution.stdout.toString().trim();
        return actualOutput === expectedOutput;
    } else if (language === 'javascript') {
        const execution = spawnSync('node', [code], { input });
        const actualOutput = execution.stdout.toString().trim();
        return actualOutput === expectedOutput;
    } else {
        return false;
    }
}


// Starting the server and listening on the specified port
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


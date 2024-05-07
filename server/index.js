const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawnSync } = require('child_process');

const app = express();
const PORT = 8000;

app.use(bodyParser.json());
app.use(cors());

// Endpoint to compile and run user code
app.post('/run', (req, res) => {
    // Retrieve user code from request body
    const userCode = req.body.code;

    // Compile and run the user code against test cases
    const results = compileAndRun(userCode);

    // Send results back to the client
    res.json({ results });
});

function compileAndRun(code) {
    // Example test cases
    const testCases = [
        { input: "1 2", output: "2" },
        { input: "5 10", output: "50" },
        { input: "0 0", output: "0" }
    ];

    // Array to store test results
    const results = [];

    // Compile and execute the user code against test cases
    for (let i = 0; i < testCases.length; i++) {
        const { input, output } = testCases[i];
        const testCaseResult = runTestCase(code, input, output);
        results.push(testCaseResult);
    }

    return results;
}

function runTestCase(code, input, expectedOutput) {
    // Simulate compilation by assuming code is syntactically correct
    // Simulate execution by spawning a child process with the C++ code
    const process = spawnSync('g++', ['-x', 'c++', '-o', 'temp', '-'], { input: code });
    if (process.status !== 0) {
        return false; // Compilation failed
    }

    const execution = spawnSync('./temp', { input: input });
    const actualOutput = execution.stdout.toString().trim();
    return actualOutput === expectedOutput;
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

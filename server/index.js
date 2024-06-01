const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8000;

app.use(bodyParser.json());
app.use(cors());

// Endpoint to handle the execution of code
app.post('/run', async (req, res) => {
    const { language, code, customTestCases } = req.body;

    let compileExitCode, compileTime, compileMessage = [];
    const startCompileTime = process.hrtime();

// Compile the code based on the specified language
    let compileResult;
    if (language === 'cpp') {
        compileResult = compileCPP(code);
    } else if (language === 'python') {
        compileResult = compilePython(code);
    } else if (language === 'java') {
        compileResult = compileJava(code);
    } else if (language === 'javascript') {
        compileResult = compileJavaScript(code);
    } else {
        return res.json({ error: 'Unsupported language' });
    }

    compileExitCode = compileResult.exitCode;
    compileTime = process.hrtime(startCompileTime)[1] / 1000000; // Convert to milliseconds
    compileMessage = compileResult.message;

    const results = [];
    const startMemory = process.memoryUsage().heapUsed;

    // Run each custom test case
    for (let i = 0; i < customTestCases.length; i++) {
        const { input, output } = customTestCases[i];
        const result = runTestCase(compileResult.filePath, input, output, language);
        results.push(result);
    }

    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsageInMB = (endMemory - startMemory) / 1024 / 1024;

    // Send the results back to the client
    res.json({
        compileExitCode,
        compileTime: Math.round(compileTime),
        compileMessage,
        results,
        memoryUsageInMB: memoryUsageInMB.toFixed(2),
    });
});

// Function to compile C++ code
function compileCPP(code) {
    const tempFile = 'temp.cpp';
    fs.writeFileSync(tempFile, code);
    const compile = spawnSync('g++', [tempFile, '-o', 'temp.out']);
    return {
        exitCode: compile.status,
        message: compile.status === 0 ? ['Compiled Successfully'] : [compile.stderr.toString()],
        filePath: './temp.out',
    };
}

// Function to compile Python code
function compilePython(code) {
    const tempFile = 'temp.py';
    fs.writeFileSync(tempFile, code);
    return {
        exitCode: 0,
        message: ['Compiled Successfully'],
        filePath: tempFile,
    };
}

// Function to compile Java code
function compileJava(code) {
    const javaDir = path.join(__dirname, 'java');
    if (!fs.existsSync(javaDir)) {
        fs.mkdirSync(javaDir);
    }
    const javaFile = path.join(javaDir, 'Main.java');
    fs.writeFileSync(javaFile, code);

    const compile = spawnSync('javac', [javaFile]);
    return {
        exitCode: compile.status,
        message: compile.status === 0 ? ['Compiled Successfully'] : [compile.stderr.toString()],
        filePath: path.join(javaDir, 'Main'),
    };
}

// Function to compile JavaScript code 
function compileJavaScript(code) {
    const tempFile = 'temp.js';
    fs.writeFileSync(tempFile, code);
    return {
        exitCode: 0,
        message: ['Compiled Successfully'],
        filePath: tempFile,
    };
}

// Function to run a test case and return the result
function runTestCase(filePath, input, expectedOutput, language) {
    const startRunTime = process.hrtime();
    let execution;
    let actualOutput;
    let errorMessages = [];
    let exitCode = 0;

    // Execute the code based on the language
    if (language === 'cpp') {
        execution = spawnSync('./temp.out', { input });
        actualOutput = execution.stdout.toString().trim();
        errorMessages = execution.stderr.toString().split('\n');
        exitCode = execution.status;
    } else if (language === 'python') {
        execution = spawnSync('python', [filePath], { input });
        actualOutput = execution.stdout.toString().trim();
        errorMessages = execution.stderr.toString().split('\n');
        exitCode = execution.status;
    } else if (language === 'java') {
        execution = spawnSync('java', ['-cp', path.dirname(filePath), 'Main'], { input });
        actualOutput = execution.stdout.toString().trim();
        errorMessages = execution.stderr.toString().split('\n');
        exitCode = execution.status;
    } else if (language === 'javascript') {
        execution = spawnSync('node', [filePath], { input });
        actualOutput = execution.stdout.toString().trim();
        errorMessages = execution.stderr.toString().split('\n');
        exitCode = execution.status;
    }

    const runTime = process.hrtime(startRunTime)[1] / 1000000; // Convert to milliseconds

    return {
        input,
        args: "",
        state: exitCode === 0 ? "Execute" : "Error",
        out: actualOutput,
        err: errorMessages.filter(msg => msg), // Remove empty messages
        exitCode,
        runTime: Math.round(runTime),
        memory: process.memoryUsage().heapUsed / 1024 / 1024 // Memory used in MB
    };
}

// Start the server and listen on the specified port
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


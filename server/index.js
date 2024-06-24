const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8000;

// Middleware to parse JSON requests
app.use(bodyParser.json());
// Middleware to enable CORS
app.use(cors());

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

    // Cleanup temporary files
    if (compileResult.filePath) {
        try {
            fs.unlinkSync(compileResult.filePath);
        } catch (err) {
            console.error('Error deleting temporary file:', err);
        }
    }

    // Send the results back to the client
    res.json({
        compileExitCode,
        compileTime: Math.round(compileTime),
        compileMessage,
        results: results.map(result => ({
            ...result,
            memoryUsageInMB: memoryUsageInMB.toFixed(2), 
        })),
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
    const tempFile = path.join(__dirname, 'temp.py');
    fs.writeFileSync(tempFile, code);
    const compile = spawnSync('python', ['-m', 'py_compile', tempFile]);
    return {
        exitCode: compile.status,
        message: compile.status === 0 ? ['Compiled Successfully'] : [compile.stderr.toString()],
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
        filePath: path.join(javaDir, 'Main.class'),
    };
}



// Function to compile JavaScript code
function compileJavaScript(code) {
    const jsDir = path.join(__dirname, 'javascript');
    if (!fs.existsSync(jsDir)) {
        fs.mkdirSync(jsDir);
    }
    const tempFile = path.join(jsDir, 'temp.js');
    
    try {
        fs.writeFileSync(tempFile, code);
        return {
            exitCode: 0,
            message: ['Compiled Successfully'],
            filePath: tempFile,
        };
    } catch (error) {
        console.error('Error preparing JavaScript:', error);
        return {
            exitCode: 1,
            message: ['Error preparing JavaScript'],
            filePath: tempFile,
        };
    }
}



// Function to run test cases
function runTestCase(filePath, input, expectedOutput, language) {
    const startRunTime = process.hrtime();
    const startMemory = process.memoryUsage().heapUsed;

    let execution;
    let actualOutput = '';
    let errorMessages = [];
    let exitCode = 0;

    // Process the input correctly for the Python script
    const formattedInput = input.split(' ').join('\n');

    // Execute the code based on the language
    if (language === 'cpp') {
        execution = spawnSync('./temp.out', { input: formattedInput, encoding: 'utf-8', timeout: 5000 }); // Adjust timeout as needed
    } else if (language === 'python') {
        execution = spawnSync('python', [filePath], { input: formattedInput, encoding: 'utf-8', timeout: 5000 }); 
    } else if (language === 'java') {
        execution = spawnSync('java', ['-cp', path.dirname(filePath), 'Main'], { input: formattedInput, encoding: 'utf-8', timeout: 5000 }); 
    } else if (language === 'javascript') {
        execution = spawnSync('node', [filePath], { input: formattedInput, encoding: 'utf-8', timeout: 5000 }); 
    }

    // Check if execution.stdout is null and handle it
    if (execution && execution.stdout) {
        actualOutput = execution.stdout.toString().trim();
    } else {
        actualOutput = '';
    }

    // Check if execution.stderr is null and handle it
    if (execution && execution.stderr) {
        errorMessages = execution.stderr.toString().split('\n');
    } else {
        errorMessages = ['No error messages captured.'];
    }

    // Check if execution.status is null and handle it
    if (execution && execution.status !== null) {
        exitCode = execution.status;
    } else {
        exitCode = 1; // Assume failure if status is null
    }

    const endRunTime = process.hrtime(startRunTime)[1] / 1000000; // Convert to milliseconds
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsageInMB = (endMemory - startMemory) / 1024 / 1024;

    // Check if execution timed out
    if (execution && execution.signal === 'SIGTERM') {
        errorMessages.push('Execution timed out.');
        console.log("Exe")
    }

    // Compare actual output with expected output
    const testCasePassed = actualOutput === expectedOutput.trim();

    // Logging the outputs for debugging
    console.log('Input:', formattedInput);
    console.log('Expected Output:', expectedOutput.trim());
    console.log('Actual Output:', actualOutput);
    console.log('Test Case Passed:', testCasePassed);

    return {
        input,
        args: "",
        state: testCasePassed ? "Execute" : "Error",
        out: actualOutput,
        err: errorMessages.filter(msg => msg), // Remove empty messages
        exitCode,
        runTime: Math.round(endRunTime),
        memoryUsageInMB: memoryUsageInMB.toFixed(2), // Consistent memory usage
        testCasePassed 
    };
}



// Start the server and listen on the specified port
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

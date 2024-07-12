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
    } else if (language === 'c') {
        compileResult = compileC(code);
    }else if (language === 'python') {
        compileResult = compilePython(code);
    } else if (language === 'java') {
        compileResult = compileJava(code);
    } else if (language === 'javascript') {
        compileResult = compileJavaScript(code);
    }else if (language === 'ruby') {
        compileResult = compileRuby(code);
    }else if (language === 'csharp') {
        compileResult = compileCSharp(code);
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

// Function to compile c code
function compileC(code) {
    const tempFile = 'temp.c';
    fs.writeFileSync(tempFile, code);
    const compile = spawnSync('gcc', [tempFile, '-o', 'temp.out']);
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



// Function to compile Ruby code
function compileRuby(code) {
    const tempFile = path.join(__dirname, 'temp.rb');
    try {
        fs.writeFileSync(tempFile, code);
        const execution = spawnSync('ruby', [tempFile], { input: code, encoding: 'utf-8', timeout: 5000 });

        return {
            exitCode: execution.status !== null ? execution.status : 1,
            message: execution.status === 0 ? ['Compiled Successfully'] : [execution.stderr.toString()],
            filePath: tempFile,
        };
    } catch (error) {
        console.error('Error executing Ruby:', error);
        return {
            exitCode: 1,
            message: ['Error executing Ruby'],
            filePath: tempFile,
        };
    }
}



// Function to compile C# code
function compileCSharp(code) {
    const tempDir = path.join(__dirname, 'temp_csharp');
    const tempFile = path.join(tempDir, 'Program.cs');
    const projectFile = path.join(tempDir, 'temp_csharp.csproj');

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(tempFile, code);

    // Created a minimal C# project file if it doesn't exist
    if (!fs.existsSync(projectFile)) {
        fs.writeFileSync(projectFile, `
            <Project Sdk="Microsoft.NET.Sdk">
                <PropertyGroup>
                    <OutputType>Exe</OutputType>
                    <TargetFramework>netcoreapp3.1</TargetFramework>
                </PropertyGroup>
            </Project>
        `);
    }

    const compile = spawnSync('dotnet', ['build', tempDir, '-c', 'Release']);

    const compileError = compile.stderr.toString().trim();
    if (compile.error || compile.status !== 0) {
        return {
            exitCode: compile.status !== null ? compile.status : 1,
            message: [compileError || `Error compiling C#: ${compile.error?.message || 'Unknown error'}`],
            filePath: null,
        };
    }

    const dllPath = path.join(tempDir, 'bin', 'Release', 'netcoreapp3.1', 'temp_csharp.dll');
    if (!fs.existsSync(dllPath)) {
        return {
            exitCode: 1,
            message: ['Error compiling C#: DLL not found'],
            filePath: null,
        };
    }

    return {
        exitCode: 0,
        message: ['Compiled Successfully'],
        filePath: dllPath,
    };
}



// Function to run test cases
function runTestCase(filePath, input, expectedOutput, language) {
    const startRunTime = process.hrtime();
    const startMemory = process.memoryUsage().heapUsed;

    let execution;
    let actualOutput = '';
    let errorMessages = [];
    let exitCode = 0;

    // Prepare formatted input for prompts
    const inputs = input.split('\n').map(line => line.trim());


    // Execute the code based on the language
    if (language === 'cpp' || language === 'c') {
        execution = spawnSync('./temp.out', { input: inputs.join('\n'), encoding: 'utf-8', timeout: 5000 }); // Adjust timeout as needed
    } else if (language === 'python') {
        execution = spawnSync('python', [filePath], { input: inputs.join('\n'), encoding: 'utf-8', timeout: 5000 }); 
    } else if (language === 'java') {
        execution = spawnSync('java', ['-cp', path.dirname(filePath), 'Main'], { input: inputs.join('\n'), encoding: 'utf-8', timeout: 5000 }); 
    } else if (language === 'javascript') {
        execution = spawnSync('node', [filePath], { input: inputs.join('\n'), encoding: 'utf-8', timeout: 5000 }); 
    }else if (language === 'ruby') {
        execution = spawnSync('ruby', [filePath], { input: inputs.join('\n'), encoding: 'utf-8', timeout: 5000 }); // Add Ruby execution here
    }else if (language === 'csharp') {
        execution = spawnSync('dotnet', [filePath], { input: inputs.join('\n'), encoding: 'utf-8', timeout: 5000 });
    }

 // Capture actual output, error messages, and exit code
 if (execution) {
    actualOutput = execution.stdout ? execution.stdout.toString().trim() : '';
    errorMessages = execution.stderr ? execution.stderr.toString().split('\n').filter(msg => msg.trim() !== '') : [];
    exitCode = execution.status !== null ? execution.status : 1; // Assume failure if status is null
}

// Calculated runtime and memory usage
const endRunTime = process.hrtime(startRunTime)[1] / 1000000; // Convert to milliseconds
const endMemory = process.memoryUsage().heapUsed;
const memoryUsageInMB = (endMemory - startMemory) / 1024 / 1024;

//state based on exitCode
const state = exitCode === 0 ? 'Execute' : 'Error';

// Logging the outputs for debugging (optional)
console.log('Input:', inputs.join('\n'));
console.log('Expected Output:', expectedOutput.trim());
console.log('Actual Output:', actualOutput);
console.log('Error Messages:', errorMessages);

return {
    input,
    args: '',
    state,
    out: actualOutput,
    err: errorMessages,
    exitCode,
    runTime: Math.round(endRunTime),
    memoryUsageInMB: memoryUsageInMB.toFixed(2),
    testCasePassed: state === 'Execute',
};
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});








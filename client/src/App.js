// app.js
import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [code, setCode] = useState('');
  const [results, setResults] = useState([]);
  const [testCases] = useState([
    { input: "1 2", output: "2" },
    { input: "5 10", output: "50" },
    { input: "0 0", output: "0" }
  ]);

  const runCode = async () => {
    try {
      const response = await axios.post('http://localhost:8000/run', { code });
      setResults(response.data.results);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <h1>Online Coding Platform</h1>
      <div>
        <h2>Enter C++ Code to Add 2 Numbers taking input from User:</h2>
        <textarea 
          value={code} 
          onChange={e => setCode(e.target.value)} 
          rows={10} 
          cols={50}
          placeholder="// Write your C++ code here"
        />
      </div>
      <button onClick={runCode}>Run Code</button>
      <div>
        <h2>Test Cases:</h2>
        <ul>
          {testCases.map((testCase, index) => (
            <li key={index}>
              Test Case {index + 1}: Input: {testCase.input}, Output: {testCase.output}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Test Case Results:</h2>
        <ul>
          {results.map((result, index) => (
            <li key={index}>
              Test Case {index + 1}: {result ? 'Passed' : 'Failed'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;

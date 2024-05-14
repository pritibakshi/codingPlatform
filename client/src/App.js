// app.js
import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [code, setCode] = useState('');
  const [results, setResults] = useState([]);
  const [language, setLanguage] = useState('cpp'); // Default to C++

  const testCases = [
    { input: "1 2", output: "3" },
    { input: "5 10", output: "15" },
    { input: "0 0", output: "0" }
  ];

  const runCode = async () => {
    try {
      const response = await axios.post('http://localhost:8000/run', { language, code });
      setResults(response.data.results);
      console.log(response.data.results)
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <h1>Online Coding Platform</h1>
      <div>
        <h2>Select Language:</h2>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="cpp">C++</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="javascript">JavaScript (Node.js)</option>
        </select>
      </div>
      <div>
        <h2>Enter Code:</h2>
        <textarea 
          value={code} 
          onChange={e => setCode(e.target.value)} 
          rows={10} 
          cols={50}
          placeholder="// Write your code here"
        />
      </div>
      <button onClick={runCode}>Run Code</button>
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
    </div>
  );
}

export default App;

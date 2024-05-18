// app.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [code, setCode] = useState('');
  const [results, setResults] = useState([]);
  const [language, setLanguage] = useState('cpp'); // Default to C++
  const [executionTimeInMs, setExecutionTime] = useState(0);
  const [memoryUsageInMB, setMemoryUsed] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [remainingTime, setRemainingTime] = useState(10 * 60); // Initial remaining time in seconds
  const [timerId, setTimerId] = useState(null);

  useEffect(() => {
    if (timerEnabled && remainingTime > 0) {
      // Start the countdown timer
      const id = setInterval(() => {
        setRemainingTime(prevTime => {
          if (prevTime === 0) {
            // If time is up, stop the timer
            clearInterval(id);
            setTimerEnabled(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      // Store the timer ID
      setTimerId(id);

      // Cleanup function to stop the timer when component unmounts or timer is reset
      return () => clearInterval(id);
    }
  }, [timerEnabled, remainingTime]);

  useEffect(() => {
    if (remainingTime === 0) {
      clearInterval(timerId);
      setTimerEnabled(false);
    }
  }, [remainingTime, timerId]);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  const testCases = [
    { input: "1 2", output: "3" },
    { input: "5 10", output: "15" },
    { input: "0 0", output: "0" }
  ];

  const runCode = async () => {
    // Start the timer when code execution begins
    setTimerEnabled(true);

    try {
      const response = await axios.post('http://localhost:8000/run', { language, code });
      setResults(response.data.results);
      setExecutionTime(response.data.executionTimeInMs);
      setMemoryUsed(response.data.memoryUsageInMB);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      // Reset the timer when code execution completes
      setTimerEnabled(false);
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
        <h2>Timer:</h2>
        <p>{formatTime(remainingTime)}</p>
        {!timerEnabled && remainingTime === 10 * 60 && <button onClick={() => setTimerEnabled(true)}>Start Timer</button>}
      </div>
      <div>
        <h2>Test Case Results:</h2>
        <ul>
          {Array.isArray(results) && results.map((result, index) => (
            <li key={index}>
              Test Case {index + 1}: {result ? 'Passed' : 'Failed'}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Execution Stats:</h2>
        <p>Execution Time: {executionTimeInMs} ms</p>
        <p>Memory Used: {memoryUsageInMB} MB</p>
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

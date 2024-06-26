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
  const [customTestCases, setCustomTestCases] = useState([]);
  const [error, setError] = useState(null); // To store any errors

  // useEffect to handle the countdown timer
  useEffect(() => {
    if (timerEnabled && remainingTime > 0) {
      const id = setInterval(() => {
        setRemainingTime(prevTime => {
          if (prevTime === 0) {
            clearInterval(id); // If time is up, stop the timer
            setTimerEnabled(false);
            return 0;
          }
          return prevTime - 1; // Decrease the remaining time by 1 second
        });
      }, 1000);

      setTimerId(id); // Store the timer ID

      // Cleanup function to stop the timer when component unmounts or timer is reset
      return () => clearInterval(id);
    }
  }, [timerEnabled, remainingTime]);

  // useEffect to clear the timer when time reaches 0
  useEffect(() => {
    if (remainingTime === 0) {
      clearInterval(timerId);
      setTimerEnabled(false);
    }
  }, [remainingTime, timerId]);

  // Format time in mm:ss format
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  };

  // Handle adding new custom test case
  const handleAddTestCase = () => {
    setCustomTestCases([...customTestCases, { input: '', output: '' }]);
  };

  // Handle changes in custom test case inputs/outputs
  const handleTestCaseChange = (index, field, value) => {
    const updatedTestCases = customTestCases.map((testCase, i) =>
      i === index ? { ...testCase, [field]: value } : testCase
    );
    setCustomTestCases(updatedTestCases);
  };

  // Function to handle the response from the backend
  const handleResponse = (response) => {
    const updatedResults = response.results.map(result => ({
      ...result,
      passed: result.state === 'Execute'
    }));

    setResults(updatedResults);
    setExecutionTime(response.executionTimeInMs);
    setMemoryUsed(response.memoryUsageInMB);

    // Check for timeout errors in each result and update UI
    updatedResults.forEach((result, index) => {
      if (result.state === 'Error' && result.err.includes('Execution timed out.')) {
        const newResults = [...results];
        newResults[index] = { ...result, error: 'Execution timed out.' };
        setResults(newResults);
      }
    });
  };

  // Run the code and get results
  const runCode = async () => {
    setTimerEnabled(true); // Start the timer when code execution begins
    setError(null); // Reset any previous error

    try {
      const response = await axios.post('http://localhost:8000/run', { language, code, customTestCases });
      handleResponse(response.data);
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred while running the code. Please try again.');
    } finally {
      setTimerEnabled(false); // Reset the timer when code execution completes
    }
  };

  return (
    <div>
      <h1>Online Coding Platform</h1>
      <div>
        <h2>Select Language:</h2>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="cpp">C++</option>
          <option value="C">C</option>
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
          {results.map((result, index) => (
            <li key={index}>
              Test Case {index + 1}: {result.passed ? 'Passed' : 'Failed'}
              {result.error && <span style={{ color: 'red' }}> - {result.error}</span>}
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
        <h2>Custom Test Cases:</h2>
        {customTestCases.map((testCase, index) => (
          <div key={index}>
            <input
              type="text"
              placeholder={`Input ${index + 1}`}
              value={testCase.input}
              onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
            />
            <input
              type="text"
              placeholder={`Expected Output ${index + 1}`}
              value={testCase.output}
              onChange={(e) => handleTestCaseChange(index, 'output', e.target.value)}
            />
          </div>
        ))}
        <button onClick={handleAddTestCase}>Add Test Case</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display any error */}
    </div>
  );
}

export default App;



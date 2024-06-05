import React from 'react';
import './App.css';  // Import the CSS file
import FeedbackTable from './components/FeedbackTable';
import SentimentLineChart from './components/SentimentLineChart';

const App = () => {
  return (
    <div className="App">
      <h1>Employee Feedback Summary</h1>
      <div className="container">
        <FeedbackTable />
        <div className="chart-container">
          <SentimentLineChart />
        </div>
      </div>
    </div>
  );
};

export default App;

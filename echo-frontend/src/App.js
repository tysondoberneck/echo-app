import React from 'react';
import './App.css';
import FeedbackTable from './components/FeedbackTable';
import SentimentLineChart from './components/SentimentLineChart';
import AnonymousPieChart from './components/AnonymousPieChart';

const App = () => {
  return (
    <div className="App">
      <h1>Employee Feedback Summary</h1>
      <div className="container">
        <FeedbackTable />
        <div className="chart-container">
          <SentimentLineChart />
          <div className="pie-chart-container">
            <AnonymousPieChart />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

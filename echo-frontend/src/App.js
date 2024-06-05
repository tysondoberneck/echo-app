import React from 'react';
import FeedbackTable from './components/FeedbackTable';
import SentimentLineChart from './components/SentimentLineChart';

const App = () => {
  return (
    <div className="App">
      <h1>Employee Feedback Summary</h1>
      <FeedbackTable />
      <SentimentLineChart />
    </div>
  );
};

export default App;

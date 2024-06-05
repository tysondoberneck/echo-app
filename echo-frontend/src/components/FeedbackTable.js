import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FeedbackTable = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:80/api/feedback');
        setFeedback(response.data);
        setLoading(false);
      } catch (error) {
        setError(error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Sentiment Category</th>
          <th>Average Sentiment Score</th>
          <th>Summary Text</th>
          <th>All Numbered Posts</th>
          <th>Detailed Summary</th>
          <th>Number of Posts</th>
        </tr>
      </thead>
      <tbody>
        {feedback.map((item, index) => (
          <tr key={index}>
            <td>{item.SENTIMENT_CATEGORY}</td>
            <td>{item.AVG_SENTIMENT_SCORE}</td>
            <td>{item.SUMMARY_TEXT}</td>
            <td>{item.ALL_NUMBERED_POSTS}</td>
            <td>{item.DETAILED_SUMMARY}</td>
            <td>{item.NUMBER_OF_POSTS}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default FeedbackTable;

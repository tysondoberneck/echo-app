import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const SentimentLineChart = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{
      label: 'Sentiment Score Over Time',
      data: [],
      borderColor: 'rgba(75,192,192,1)',
      backgroundColor: 'rgba(75,192,192,0.2)',
    }]
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:80/api/sentiment');
        const sentimentData = response.data;

        const labels = sentimentData.map(item => new Date(item.EVENT_TIME).toLocaleDateString());
        const data = sentimentData.map(item => item.SENTIMENT_SCORE);

        setChartData({
          labels,
          datasets: [{
            label: 'Sentiment Score Over Time',
            data,
            borderColor: 'rgba(75,192,192,1)',
            backgroundColor: 'rgba(75,192,192,0.2)',
          }]
        });
      } catch (error) {
        console.error('Error fetching sentiment data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2>Sentiment Score Over Time</h2>
      <Line data={chartData} />
    </div>
  );
};

export default SentimentLineChart;

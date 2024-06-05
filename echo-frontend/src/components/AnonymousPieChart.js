import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const AnonymousPieChart = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{
      label: '# of Posts',
      data: [],
      backgroundColor: [
        'rgba(54, 162, 235, 0.2)', // Color for "With Name"
        'rgba(255, 99, 132, 0.2)'  // Color for "Anonymous"
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)'
      ],
      borderWidth: 1,
    }],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:80/api/botpostcounts');
        const data = response.data;

        const labels = data.map(item => item.IS_BOT_POST ? 'Anonymous' : 'With Name');
        const postCounts = data.map(item => item.POST_COUNT);

        setChartData({
          labels,
          datasets: [{
            label: '# of Posts',
            data: postCounts,
            backgroundColor: [
              'rgba(54, 162, 235, 0.2)', // Color for "With Name"
              'rgba(255, 99, 132, 0.2)'  // Color for "Anonymous"
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1,
          }],
        });
      } catch (error) {
        console.error('Error fetching bot post counts:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2>Post Counts: Anonymous vs With Name</h2>
      <Pie data={chartData} />
    </div>
  );
};

export default AnonymousPieChart;

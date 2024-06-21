require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

async function exchangeToken() {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const longLivedToken = process.env.SLACK_TOKEN;

  try {
    const response = await axios.post('https://slack.com/api/oauth.v2.exchange', null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        token: longLivedToken
      }
    });

    if (response.data.ok) {
      console.log('Token exchanged successfully:', response.data);

      const newAccessToken = response.data.access_token;
      const newRefreshToken = response.data.refresh_token;

      console.log('New Access Token:', newAccessToken);
      console.log('New Refresh Token:', newRefreshToken);

      // Update .env file
      const envConfig = fs.readFileSync('.env', 'utf-8').split('\n').filter(Boolean);
      const newEnvConfig = envConfig.map(line => {
        if (line.startsWith('SLACK_ACCESS_TOKEN=')) return `SLACK_ACCESS_TOKEN=${newAccessToken}`;
        if (line.startsWith('SLACK_REFRESH_TOKEN=')) return `SLACK_REFRESH_TOKEN=${newRefreshToken}`;
        return line;
      }).join('\n');

      fs.writeFileSync('.env', newEnvConfig);
      console.log('Updated .env file with new tokens');
    } else {
      console.error('Error exchanging token:', response.data.error);
    }
  } catch (error) {
    console.error('Error exchanging token:', error);
  }
}

exchangeToken();

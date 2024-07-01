const axios = require('axios');
const { updateTokensInSnowflake } = require('./database');

async function isAccessTokenExpired(accessToken) {
  try {
    const response = await axios.post('https://slack.com/api/auth.test', null, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return !response.data.ok && response.data.error === 'token_expired';
  } catch (error) {
    console.error('Error checking access token status:', error.message);
    throw error;
  }
}

async function refreshAccessToken(refreshToken) {
  console.log('Refreshing access token...');
  try {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      params: {
        grant_type: 'refresh_token',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: refreshToken,
      },
    });

    console.log('Response from Slack:', response.data);

    if (response.data.ok) {
      console.log('Token refreshed successfully.');
      const newAccessToken = response.data.access_token;
      console.log('New Access Token:', newAccessToken);

      // Update Snowflake with new access token
      await updateTokensInSnowflake(newAccessToken);

      console.log('Access token updated in Snowflake.');
    } else {
      console.error('Error refreshing token:', response.data.error);
      throw new Error(response.data.error);
    }
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    throw error;
  }
}

module.exports = {
  isAccessTokenExpired,
  refreshAccessToken,
};

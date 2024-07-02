const axios = require('axios');
const { updateAccessTokenInSnowflake, updateRefreshTokenInSnowflake, getTokensFromSnowflake } = require('./database');

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

async function initiateOAuthFlow() {
  const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.CLIENT_ID}&scope=${process.env.SLACK_SCOPES}&redirect_uri=${process.env.REDIRECT_URI}`;
  console.log('Please authorize the app by visiting this URL:', oauthUrl);
}

module.exports = {
  isAccessTokenExpired,
  initiateOAuthFlow,
};

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
  const scopes = process.env.SLACK_SCOPES || 'channels:history,channels:read,chat:write,commands,groups:history,groups:read,im:history,im:write,incoming-webhook,reactions:read,triggers:write,users:read';
  const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${process.env.CLIENT_ID}&scope=${scopes}&redirect_uri=${process.env.REDIRECT_URI}`;
  console.log('Please authorize the app by visiting this URL:', oauthUrl);
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
      const newRefreshToken = response.data.refresh_token;

      // Update Snowflake with new access token
      await updateAccessTokenInSnowflake(newAccessToken);

      // Return the latest tokens
      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken
      };
    } else {
      if (response.data.error === 'invalid_refresh_token') {
        console.error('Invalid refresh token. Re-initiating OAuth flow.');
        await initiateOAuthFlow();
      } else {
        console.error('Error refreshing token:', response.data.error);
        throw new Error(response.data.error);
      }
    }
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    throw error;
  }
}

async function ensureTokensMatchAndRefresh() {
  const storedTokens = await getTokensFromSnowflake();
  const storedRefreshToken = storedTokens.REFRESH_TOKEN;

  try {
    // Refresh the access token using the stored refresh token
    const latestTokens = await refreshAccessToken(storedRefreshToken);

    if (storedRefreshToken !== latestTokens.refresh_token) {
      console.log('Updating refresh token in Snowflake.');
      await updateRefreshTokenInSnowflake(latestTokens.refresh_token);
    }

    return latestTokens;
  } catch (error) {
    if (error.message === 'invalid_refresh_token') {
      console.error('Re-initiating OAuth flow due to invalid refresh token.');
      await initiateOAuthFlow();
    } else {
      throw error;
    }
  }
}

module.exports = {
  isAccessTokenExpired,
  refreshAccessToken,
  ensureTokensMatchAndRefresh,
};

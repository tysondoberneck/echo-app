require('dotenv').config();
const { App } = require('@slack/bolt');
const axios = require('axios');
const { getTokensFromSnowflake, updateTokensInSnowflake } = require('./snowflake/tokens');

let app;
let botUserId;

async function initializeTokens() {
  try {
    console.log('Initializing tokens...');
    const tokens = await getTokensFromSnowflake();
    let slackToken = tokens.ACCESS_TOKEN || process.env.SLACK_ACCESS_TOKEN;
    let refreshToken = tokens.REFRESH_TOKEN || process.env.SLACK_REFRESH_TOKEN;

    console.log('Slack Token:', slackToken);
    console.log('Refresh Token:', refreshToken);

    await initializeApp(slackToken, refreshToken);
    scheduleTokenRotation(refreshToken);
  } catch (error) {
    console.error('Failed to load tokens from Snowflake:', error);
  }
}

async function initializeApp(slackToken, refreshToken) {
  try {
    console.log('Creating app with provided token...');
    app = await createApp(slackToken);
    const authTestResponse = await app.client.auth.test();
    botUserId = authTestResponse.user_id;
    console.log('Tokens and bot user ID loaded from Snowflake');
  } catch (error) {
    if (error.code === 'slack_webapi_platform_error' && error.data.error === 'token_expired') {
      console.log('Token expired, refreshing token...');
      const refreshedTokens = await refreshAccessToken(refreshToken);
      const slackToken = refreshedTokens.access_token;
      const refreshToken = refreshedTokens.refresh_token;

      console.log('Reinitializing app with refreshed token...');
      await reinitializeApp(slackToken, refreshToken);
      scheduleTokenRotation(refreshToken);
    } else {
      console.error('Error initializing app:', error);
      throw error;
    }
  }
}

async function reinitializeApp(slackToken, refreshToken) {
  try {
    app = await createApp(slackToken);
    const authTestResponse = await app.client.auth.test();
    botUserId = authTestResponse.user_id;
    console.log('Tokens and bot user ID refreshed and reloaded');

    // Update Snowflake with new tokens
    await updateTokensInSnowflake(slackToken, refreshToken);
  } catch (error) {
    console.error('Error reinitializing app:', error);
    throw error;
  }
}

async function createApp(token) {
  console.log('Creating app instance...');
  const appInstance = new App({
    token: token,
    signingSecret: process.env.SIGNING_SECRET,
  });

  console.log('Starting app instance...');
  await appInstance.start(process.env.PORT || 3000);

  return appInstance;
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

    if (response.data.ok) {
      console.log('Token refreshed successfully.');
      const newAccessToken = response.data.access_token;
      const newRefreshToken = response.data.refresh_token;

      console.log('New Access Token:', newAccessToken);
      console.log('New Refresh Token:', newRefreshToken);

      // Update Snowflake with new tokens
      await updateTokensInSnowflake(newAccessToken, newRefreshToken);

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken
      };
    } else {
      console.error('Error refreshing tokens:', response.data.error);
      throw new Error(response.data.error);
    }
  } catch (error) {
    console.error('Error refreshing tokens:', error.message);
    throw error;
  }
}

function scheduleTokenRotation(refreshToken) {
  const TOKEN_REFRESH_INTERVAL = 11 * 60 * 60 * 1000; // 11 hours
  setInterval(async () => {
    try {
      console.log('Scheduled token refresh...');
      const refreshedTokens = await refreshAccessToken(refreshToken);
      refreshToken = refreshedTokens.refresh_token; // Update the refresh token
    } catch (error) {
      console.error('Scheduled token refresh failed:', error);
    }
  }, TOKEN_REFRESH_INTERVAL);
}

async function ensureWebClientInitialized() {
  if (!app) {
    console.log('App is not initialized, initializing tokens...');
    await initializeTokens();
  }
}

function getAppInstance() {
  return app;
}

function getWebClient() {
  if (!app) {
    throw new Error('App is not initialized.');
  }
  return app.client;
}

async function getBotUserId() {
  if (!botUserId) {
    await ensureWebClientInitialized();
    const authTestResponse = await app.client.auth.test();
    botUserId = authTestResponse.user_id;
  }
  return botUserId;
}

async function handleApiCall(apiCallFunction) {
  try {
    return await apiCallFunction();
  } catch (error) {
    if (error.code === 'slack_webapi_platform_error' && error.data.error === 'token_expired') {
      console.log('Token expired during API call, refreshing token...');
      const tokens = await getTokensFromSnowflake();
      const refreshedTokens = await refreshAccessToken(tokens.REFRESH_TOKEN || process.env.SLACK_REFRESH_TOKEN);
      const slackToken = refreshedTokens.access_token;
      const refreshToken = refreshedTokens.refresh_token;

      console.log('Reinitializing app with refreshed token...');
      await reinitializeApp(slackToken, refreshToken);
      scheduleTokenRotation(refreshToken);

      // Retry the API call after refreshing the token
      return await apiCallFunction();
    } else {
      console.error('API call failed:', error);
      throw error;
    }
  }
}

module.exports = {
  initializeTokens,
  ensureWebClientInitialized,
  getAppInstance,
  getWebClient,
  getBotUserId,
  handleApiCall
};

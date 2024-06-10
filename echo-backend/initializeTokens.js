require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const axios = require('axios');
const { getTokensFromSnowflake, updateTokensInSnowflake } = require('./snowflake/tokens');

let slackToken;
let refreshToken;
let web;
let botUserId;

async function initializeTokens() {
  try {
    const tokens = await getTokensFromSnowflake();
    slackToken = tokens.access_token || tokens.ACCESS_TOKEN;
    refreshToken = tokens.refresh_token || tokens.REFRESH_TOKEN;
    web = new WebClient(slackToken);

    // Fetch bot user ID
    const authTestResponse = await web.auth.test();
    botUserId = authTestResponse.user_id;

    console.log('Tokens and bot user ID loaded from Snowflake');
  } catch (error) {
    console.error('Failed to load tokens from Snowflake:', error);
  }
}

async function ensureWebClientInitialized() {
  if (!web) {
    await initializeTokens();
  }
}

async function refreshAccessToken() {
  try {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }
    });

    if (response.data.ok) {
      const newAccessToken = response.data.access_token;
      const newRefreshToken = response.data.refresh_token;

      await updateTokensInSnowflake(newAccessToken, newRefreshToken);

      slackToken = newAccessToken;
      refreshToken = newRefreshToken;
      web = new WebClient(slackToken);

      // Fetch bot user ID
      const authTestResponse = await web.auth.test();
      botUserId = authTestResponse.user_id;

      console.log('Tokens and bot user ID refreshed successfully');
    } else {
      console.error('Error refreshing tokens:', response.data.error);
    }
  } catch (error) {
    console.error('Error refreshing tokens:', error);
  }
}

function getWebClient() {
  return web;
}

function getBotUserId() {
  return botUserId;
}

module.exports = {
  initializeTokens,
  ensureWebClientInitialized,
  refreshAccessToken,
  getWebClient,
  getBotUserId
};

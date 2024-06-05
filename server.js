require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { WebClient } = require('@slack/web-api');
const axios = require('axios');
const cors = require('cors');
const { storeRawEventInSnowflake, getTokensFromSnowflake, updateTokensInSnowflake, getSummarizedData, getSentimentData } = require('./snowflake');

const app = express();
app.use(bodyParser.json());
app.use(cors());

let slackToken;
let refreshToken;
let web;

async function initializeTokens() {
  try {
    const tokens = await getTokensFromSnowflake();
    slackToken = tokens.ACCESS_TOKEN;
    refreshToken = tokens.REFRESH_TOKEN;
    web = new WebClient(slackToken);
    console.log('Tokens loaded from Snowflake');
  } catch (error) {
    console.error('Failed to load tokens from Snowflake:', error);
  }
}

async function ensureWebClientInitialized() {
  if (!web) {
    await initializeTokens();
  }
}

initializeTokens();

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

      console.log('Tokens refreshed successfully');
    } else {
      console.error('Error refreshing tokens:', response.data.error);
    }
  } catch (error) {
    console.error('Error refreshing tokens:', error);
  }
}

async function postMessageToChannel(text) {
  try {
    await ensureWebClientInitialized();
    await web.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text,
      username: 'Anonymous',
    });
    console.log('Message posted anonymously to #your-voice');
  } catch (error) {
    if (error.code === 'slack_webapi_platform_error' && error.data.error === 'token_expired') {
      console.log('Access token expired. Refreshing token...');
      await refreshAccessToken();

      await web.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_ID,
        text,
        username: 'Anonymous',
      });
      console.log('Message posted anonymously to #your-voice after refreshing token');
    } else {
      console.error('Error posting message:', error);
    }
  }
}

app.post('/slack/events', async (req, res) => {
  console.log('Received a request from Slack:', JSON.stringify(req.body, null, 2));

  if (req.body.type === 'url_verification') {
    res.status(200).send(req.body.challenge);
    return;
  }

  const event = req.body.event;
  if (event) {
    console.log('Event received:', JSON.stringify(event, null, 2));
    if (event.type === 'message') {
      if (event.channel === process.env.SLACK_CHANNEL_ID) {
        console.log('Message received in #your-voice:', event.text);
        await storeRawEventInSnowflake(req.body).catch(error => console.error(error));
      } else if (event.channel_type === 'im') {
        console.log('Direct message received:', event.text);
        await postMessageToChannel(event.text);
      } else {
        console.log('Event type or channel mismatch:', event);
      }
    } else if (event.type === 'reaction_added') {
      console.log('Reaction added:', event.reaction);
      await storeRawEventInSnowflake(req.body).catch(error => console.error(error));
    } else {
      console.log('Event type or channel mismatch:', event);
    }
  } else {
    console.log('No event found in request:', req.body);
  }

  res.status(200).send('Event received');
});

app.get('/api/feedback', async (req, res) => {
  try {
    const data = await getSummarizedData();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching summarized data:', error);
    res.status(500).send('Error fetching summarized data');
  }
});

app.get('/api/sentiment', async (req, res) => {
  try {
    const data = await getSentimentData();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching sentiment data:', error);
    res.status(500).send('Error fetching sentiment data');
  }
});

app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const result = await web.oauth.v2.access({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code,
      redirect_uri: process.env.REDIRECT_URI,
    });

    console.log('OAuth Access Result:', result);

    await updateTokensInSnowflake(result.access_token, result.refresh_token);

    slackToken = result.access_token;
    refreshToken = result.refresh_token;
    web = new WebClient(slackToken);

    res.send('OAuth authorization successful!');
  } catch (error) {
    console.error('OAuth Access Error:', error);
    res.status(500).send('OAuth authorization failed.');
  }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

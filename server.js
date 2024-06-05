require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { WebClient } = require('@slack/web-api');
const axios = require('axios');
const { storeRawEventInSnowflake } = require('./snowflake');

const app = express();
app.use(bodyParser.json());

let slackToken = process.env.SLACK_ACCESS_TOKEN;
let refreshToken = process.env.SLACK_REFRESH_TOKEN;
let web = new WebClient(slackToken);

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
      process.env.SLACK_ACCESS_TOKEN = response.data.access_token;
      process.env.SLACK_REFRESH_TOKEN = response.data.refresh_token;
      slackToken = process.env.SLACK_ACCESS_TOKEN;
      refreshToken = process.env.SLACK_REFRESH_TOKEN;
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

      // Retry posting the message with the new token
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
        await storeRawEventInSnowflake(req.body);
      } else if (event.channel_type === 'im') {
        // Handle direct messages to the bot
        console.log('Direct message received:', event.text);
        await postMessageToChannel(event.text);
      } else {
        console.log('Event type or channel mismatch:', event);
      }
    } else if (event.type === 'reaction_added') {
      console.log('Reaction added:', event.reaction);
      await storeRawEventInSnowflake(req.body);
    } else {
      console.log('Event type or channel mismatch:', event);
    }
  } else {
    console.log('No event found in request:', req.body);
  }

  res.status(200).send('Event received');
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

    // Update environment variables or secure storage with new tokens
    process.env.SLACK_ACCESS_TOKEN = result.access_token;
    process.env.SLACK_REFRESH_TOKEN = result.refresh_token;
    process.env.SLACK_BOT_USER_ID = result.bot_user_id;
    process.env.SLACK_TEAM_ID = result.team.id;

    slackToken = process.env.SLACK_ACCESS_TOKEN;
    refreshToken = process.env.SLACK_REFRESH_TOKEN;
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

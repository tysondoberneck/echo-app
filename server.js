require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { WebClient } = require('@slack/web-api');
const { storeRawEventInSnowflake } = require('./snowflake');

const app = express();
app.use(bodyParser.json());

const slackToken = process.env.SLACK_ACCESS_TOKEN;
const web = new WebClient(slackToken);

app.post('/slack/events', async (req, res) => {
  console.log('Received a request from Slack:', JSON.stringify(req.body, null, 2));

  if (req.body.type === 'url_verification') {
    res.status(200).send(req.body.challenge);
    return;
  }

  const event = req.body.event;
  if (event) {
    console.log('Event received:', JSON.stringify(event, null, 2));
    if (event.type === 'message' && event.channel === process.env.SLACK_CHANNEL_ID) {
      console.log('Message received:', event.text);
      await storeRawEventInSnowflake(req.body);
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

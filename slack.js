require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { WebClient } = require('@slack/web-api');
const { storeEventInSnowflake } = require('./snowflake');

const app = express();
app.use(bodyParser.json());

const slackToken = process.env.SLACK_TOKEN;
const verificationToken = process.env.VERIFICATION_TOKEN;

// Initialize Slack WebClient
const web = new WebClient(slackToken);

// Verify Slack requests
app.post('/slack/events', (req, res) => {
  console.log('Received a request from Slack:', JSON.stringify(req.body, null, 2));

  if (req.body.token !== verificationToken) {
    console.error('Verification token mismatch');
    return res.status(400).send('Verification token mismatch');
  }

  // Handle the URL verification challenge
  if (req.body.type === 'url_verification') {
    console.log('URL verification request');
    return res.status(200).send({ challenge: req.body.challenge });
  }

  // Handle the event
  const event = req.body.event;
  if (event) {
    console.log('Event received:', JSON.stringify(event, null, 2));
    if (event.type === 'message' && event.channel === process.env.SLACK_CHANNEL_ID) {
      // Process the message
      console.log('Message received:', event.text);
      // Store the event in Snowflake
      storeEventInSnowflake(event);
    } else if (event.type === 'reaction_added') {
      // Process the reaction
      console.log('Reaction event received:', event.reaction);
      // Store the reaction event in Snowflake
      storeEventInSnowflake(event);
    } else {
      console.log('Event type or channel mismatch:', event);
    }
  } else {
    console.log('No event found in request:', req.body);
  }

  // Respond to Slack
  res.status(200).send('Event received');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

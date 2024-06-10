require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { handleSlackEvents, handleSlackActions } = require('./eventHandlers');
const { handleFeedback, handleSentiment, handleBotPostCounts } = require('./apiHandlers');
const { initializeTokens } = require('./initializeTokens');
const oauthRouter = require('./oauth');
const commandsRouter = require('./commands'); // Import the commands router

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

initializeTokens();

// Initialize the scheduler
require('./scheduler');

app.use('/oauth', oauthRouter); // Use the OAuth router
app.use('/commands', commandsRouter); // Use the commands router
app.post('/slack/events', handleSlackEvents); // Handle Slack events
app.post('/slack/actions', bodyParser.urlencoded({ extended: true }), (req, res, next) => {
  console.log('Received action:', req.body); // Log the entire payload for debugging
  next();
}, handleSlackActions); // Handle Slack actions

app.get('/api/feedback', handleFeedback);
app.get('/api/sentiment', handleSentiment);
app.get('/api/botpostcounts', handleBotPostCounts);

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

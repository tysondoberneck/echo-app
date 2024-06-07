require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { handleSlackEvents } = require('./eventHandlers');
const { handleFeedback, handleSentiment, handleBotPostCounts } = require('./apiHandlers');
const { initializeTokens } = require('./initializeTokens');
const oauthRouter = require('./oauth');  // Ensure this line is included

const app = express();
app.use(bodyParser.json());
app.use(cors());

initializeTokens();

// Initialize the scheduler
require('./scheduler');

app.use('/oauth', oauthRouter);  // Ensure this line is included
app.post('/slack/events', handleSlackEvents);

app.get('/api/feedback', handleFeedback);
app.get('/api/sentiment', handleSentiment);
app.get('/api/botpostcounts', handleBotPostCounts);

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

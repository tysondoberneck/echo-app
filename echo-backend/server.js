require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { handleSlackEvents } = require('./eventHandlers');
const { handleFeedback, handleSentiment, handleBotPostCounts } = require('./apiHandlers');
const { initializeTokens } = require('./initializeTokens');

const app = express();
app.use(bodyParser.json());
app.use(cors());

initializeTokens();

// Initialize the scheduler
require('./scheduler');

app.post('/slack/events', handleSlackEvents);

app.get('/api/feedback', handleFeedback);

app.get('/api/sentiment', handleSentiment);

app.get('/api/botpostcounts', handleBotPostCounts);

app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const { getWebClient, updateTokensInSnowflake } = require('./initializeTokens');
    const web = getWebClient();
    const result = await web.oauth.v2.access({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code,
      redirect_uri: process.env.REDIRECT_URI,
    });

    console.log('OAuth Access Result:', result);

    await updateTokensInSnowflake(result.access_token, result.refresh_token);

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

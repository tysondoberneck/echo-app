const express = require('express');
const axios = require('axios');
const { updateTokensInSnowflake } = require('./snowflake/tokens');

const router = express.Router();

router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    res.status(400).send('Missing authorization code');
    return;
  }

  try {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
        redirect_uri: process.env.REDIRECT_URI,
      },
    });

    if (response.data.ok) {
      const { access_token, refresh_token, bot_user_id } = response.data;

      // Update tokens in Snowflake
      await updateTokensInSnowflake(access_token, refresh_token);

      res.send('OAuth authorization successful!');
    } else {
      console.error('OAuth Access Error:', response.data.error);
      res.status(500).send(`OAuth authorization failed: ${response.data.error}`);
    }
  } catch (error) {
    console.error('OAuth Access Error:', error);
    res.status(500).send('OAuth authorization failed.');
  }
});

module.exports = router;

const express = require('express');
const { ensureWebClientInitialized, getWebClient } = require('./initializeTokens');

const router = express.Router();

router.post('/echo', async (req, res) => {
  const { channel_id, user_id, text } = req.body;

  try {
    // Ensure the WebClient is initialized
    await ensureWebClientInitialized();
    const web = getWebClient();

    // Log the received command data
    console.log('Received command:', req.body);

    // Send a message to the channel
    await web.chat.postMessage({
      channel: channel_id,
      text: 'Command executed successfully'
    });

    res.status(200).send(); // Respond to Slack immediately to acknowledge the command
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;

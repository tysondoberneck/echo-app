const express = require('express');
const { ensureWebClientInitialized, getWebClient } = require('./initializeTokens');
const { openFeedbackModal } = require('./modals');
const { getSummaryFromSnowflake } = require('./snowflake/summaryRequest'); // Import the function to get summary

const router = express.Router();

router.post('/echo', async (req, res) => {
  const { trigger_id, text } = req.body;
  await ensureWebClientInitialized();
  const web = getWebClient();

  try {
    const args = text.split(' ');

    switch (args[0]) {
      case 'help':
        const helpMessage = `
          Available /echo commands:
          - /echo help: Show this help message
          - /echo poll: Create a poll
          - /echo feedback: Submit feedback anonymously
          - /echo summary positive: Get a summary of the positive feedback
          - /echo summary negative: Get a summary of the negative feedback
          - /echo status: Check the status of the bot
        `;
        await web.chat.postMessage({ channel: req.body.channel_id, text: helpMessage });
        break;

      case 'poll':
        await openPollModal(trigger_id); // Ensure this function is defined if used
        break;

      case 'feedback':
        await openFeedbackModal(trigger_id);
        break;

      case 'summary':
        if (args[1] === 'positive' || args[1] === 'negative') {
          const sentiment = args[1];
          const summary = await getSummaryFromSnowflake(sentiment);
          await web.chat.postMessage({ channel: req.body.channel_id, text: summary });
        } else {
          await web.chat.postMessage({ channel: req.body.channel_id, text: 'Please specify "positive" or "negative" for the summary.' });
        }
        break;

      case 'status':
        const statusMessage = 'Echo bot is running smoothly.';
        await web.chat.postMessage({ channel: req.body.channel_id, text: statusMessage });
        break;

      default:
        await web.chat.postMessage({ channel: req.body.channel_id, text: 'Command executed successfully' });
        break;
    }

    res.status(200).send();
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;

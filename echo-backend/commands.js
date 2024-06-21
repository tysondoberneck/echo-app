const express = require('express');
const { ensureWebClientInitialized, getWebClient } = require('./initializeTokens');
const { openFeedbackModal, openSettingsModal, openPollModal } = require('./modals'); // Added openPollModal
const { getUserSettings } = require('./snowflake/settings');

const router = express.Router();

router.post('/echo', async (req, res) => {
  console.log('Received /echo command:', req.body);
  const { trigger_id, text, user_id } = req.body;
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
          - /echo summary: Get a summary of the recent feedback
          - /echo status: Check the status of the bot
          - /echo settings: Open admin settings
        `;
        await web.chat.postMessage({ channel: req.body.channel_id, text: helpMessage });
        break;

      case 'poll':
        await openPollModal(trigger_id);
        break;

      case 'feedback':
        await openFeedbackModal(trigger_id);
        break;

      case 'summary':
        // Placeholder: Replace with actual logic to fetch summary from your database
        const summary = "Summary of recent feedback: ...";
        await web.chat.postMessage({ channel: req.body.channel_id, text: summary });
        break;

      case 'status':
        const statusMessage = 'Echo bot is running smoothly.';
        await web.chat.postMessage({ channel: req.body.channel_id, text: statusMessage });
        break;

      case 'settings':
        const userSettings = await getUserSettings(user_id);
        if (userSettings && userSettings.IS_ADMIN) {
          await openSettingsModal(trigger_id);
        } else {
          await web.chat.postMessage({ channel: req.body.channel_id, text: 'You do not have permission to access settings.' });
        }
        break;

      default:
        await web.chat.postMessage({ channel: req.body.channel_id, text: 'Unknown command. Try /echo help for a list of available commands.' });
        break;
    }

    res.status(200).send();
  } catch (error) {
    console.error('Error handling /echo command:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;

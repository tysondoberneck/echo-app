const { getTokensFromSnowflake } = require('../database');
const { isAccessTokenExpired, refreshAccessToken } = require('../slack');
const { openFeedbackModal } = require('../modals/modal');

module.exports = function(receiver, app) {
  receiver.router.post('/commands/echo', async (req, res) => {
    console.log('Received /echo command:', req.body);
    const { trigger_id, text, user_id, channel_id } = req.body;

    try {
      const tokens = await getTokensFromSnowflake();
      if (await isAccessTokenExpired(tokens.ACCESS_TOKEN)) {
        await refreshAccessToken(tokens.REFRESH_TOKEN);
      }

      const updatedTokens = await getTokensFromSnowflake();

      if (text.trim() === 'feedback') {
        await openFeedbackModal(app, trigger_id, updatedTokens.ACCESS_TOKEN);
      } else {
        await app.client.chat.postMessage({
          token: updatedTokens.ACCESS_TOKEN,
          channel: channel_id,
          text: 'Unknown command. Try /echo feedback to submit feedback.',
        });
      }

      res.status(200).send();
    } catch (error) {
      console.error('Error handling /echo command:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  receiver.router.post('/slack/actions', async (req, res) => {
    console.log('Received action:', req.body);
    try {
      const payload = JSON.parse(req.body.payload);
      console.log('Parsed payload:', payload);

      const tokens = await getTokensFromSnowflake();
      console.log('Fetched tokens:', tokens);
      
      if (await isAccessTokenExpired(tokens.ACCESS_TOKEN)) {
        await refreshAccessToken(tokens.REFRESH_TOKEN);
      }
      const updatedTokens = await getTokensFromSnowflake();
      // console.log('Updated tokens:', updatedTokens);

      if (payload.type === 'shortcut' && payload.callback_id === 'leave_anon_feedback') {
        console.log('Shortcut triggered:', payload);
        await openFeedbackModal(app, payload.trigger_id, updatedTokens.ACCESS_TOKEN);
        res.status(200).send();
      } else if (payload.type === 'view_submission' && payload.view.callback_id === 'feedback_modal') {
        const feedback = payload.view.state.values.feedback_block.feedback.value;
        const channelId = process.env.SLACK_CHANNEL_ID; // Use your channel ID from environment variables

        try {
          await app.client.chat.postMessage({
            token: updatedTokens.ACCESS_TOKEN,
            channel: channelId,
            text: `Anonymous feedback: ${feedback}`,
          });
          console.log('Feedback posted to Slack channel');
          res.status(200).send();
        } catch (error) {
          console.error('Error posting feedback to Slack channel:', error);
          res.status(500).send('Internal Server Error');
        }
      } else {
        console.log('Unexpected payload type or callback_id:', payload.type, payload.callback_id);
        res.status(400).send();
      }
    } catch (error) {
      console.error('Error handling action:', error);
      res.status(400).send('Bad Request');
    }
  });
};

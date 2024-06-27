const { getTokensFromSnowflake } = require('../database');
const { isAccessTokenExpired, refreshAccessToken } = require('../slack');
const { openFeedbackModal } = require('../modals/modal');

module.exports = function(receiver, app) {
  receiver.router.post('/commands/echo', async (req, res) => {
    console.log('Received /echo command:', req.body);
    const { trigger_id, text, user_id, channel_id } = req.body;

    try {
      const tokens = await getTokensFromSnowflake();
    //   console.log('Fetched tokens from Snowflake:', tokens);
      if (await isAccessTokenExpired(tokens.ACCESS_TOKEN)) {
        await refreshAccessToken(tokens.REFRESH_TOKEN);
      }

      const updatedTokens = await getTokensFromSnowflake();
    //   console.log('Updated tokens:', updatedTokens);

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
    const payload = JSON.parse(req.body.payload);

    if (payload.type === 'view_submission' && payload.view.callback_id === 'feedback_modal') {
    //   console.log('Received feedback modal submission:', payload.view);

      const feedback = payload.view.state.values.feedback_block.feedback.value;
      const channelId = 'C075HRFGHDF'; // Replace with your channel ID

      try {
        const tokens = await getTokensFromSnowflake();
        // console.log('Fetched tokens from Snowflake:', tokens);

        await app.client.chat.postMessage({
          token: tokens.ACCESS_TOKEN, // Ensure the correct token is used
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
      res.status(400).send();
    }
  });
};

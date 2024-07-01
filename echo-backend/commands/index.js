const { getTokensFromSnowflake, fetchSummaryFromSnowflake } = require('../database');
const { isAccessTokenExpired, refreshAccessToken } = require('../slack');
const { openFeedbackModal, openSummaryModal } = require('../modals/modal');
const { format } = require('date-fns'); // Import date-fns for date formatting

// Helper function to get the current date and time as a formatted string
function getCurrentDateTime() {
  return format(new Date(), 'MM-dd-yyyy hh:mma'); // Format date as 'MM-dd-yyyy hh:mma'
}

module.exports = function(receiver, app) {
  receiver.router.post('/commands/echo', async (req, res) => {
    console.log(`[${getCurrentDateTime()}] Received /echo command:`, req.body);
    const { trigger_id, text, user_id, channel_id, team_id, response_url } = req.body;

    try {
      const tokens = await getTokensFromSnowflake();
      if (await isAccessTokenExpired(tokens.ACCESS_TOKEN)) {
        await refreshAccessToken(tokens.REFRESH_TOKEN);
      }

      const updatedTokens = await getTokensFromSnowflake();

      if (text.trim() === 'feedback') {
        await openFeedbackModal(app, trigger_id, updatedTokens.ACCESS_TOKEN);
        res.status(200).send(''); // Immediate response to clear the command text
      } else if (text.trim() === 'summary') {
        // Log the channel ID to verify it's being passed correctly
        console.log(`[${getCurrentDateTime()}] Channel ID:`, channel_id);
        
        await openSummaryModal(app, trigger_id, updatedTokens.ACCESS_TOKEN, channel_id, team_id); // Pass channel_id and team_id
        res.status(200).send(''); // Immediate response to clear the command text
      } else {
        await app.client.chat.postEphemeral({
          token: updatedTokens.ACCESS_TOKEN,
          channel: channel_id,
          user: user_id,
          text: 'Unknown command. Try /echo feedback to submit feedback or /echo summary to get the feedback summary.',
        });

        res.status(200).send();
      }
    } catch (error) {
      console.error(`[${getCurrentDateTime()}] Error handling /echo command:`, error);
      res.status(500).send('Internal Server Error');
    }
  });

  receiver.router.post('/slack/actions', async (req, res) => {
    console.log(`[${getCurrentDateTime()}] Received action:`, req.body);
    try {
      const payload = JSON.parse(req.body.payload);
      console.log(`[${getCurrentDateTime()}] Parsed payload:`, payload);

      const tokens = await getTokensFromSnowflake();
      console.log(`[${getCurrentDateTime()}] Fetched tokens:`, tokens);

      if (await isAccessTokenExpired(tokens.ACCESS_TOKEN)) {
        await refreshAccessToken(tokens.REFRESH_TOKEN);
      }
      const updatedTokens = await getTokensFromSnowflake();

      if (payload.type === 'shortcut' && payload.callback_id === 'leave_anon_feedback') {
        console.log(`[${getCurrentDateTime()}] Shortcut triggered:`, payload);
        await openFeedbackModal(app, payload.trigger_id, updatedTokens.ACCESS_TOKEN);
        res.status(200).send();
      } else if (payload.type === 'shortcut' && payload.callback_id === 'get_summarized_feedback') {
        console.log(`[${getCurrentDateTime()}] Shortcut triggered for summary:`, payload);
        
        // Fetch the user's IM channel
        const result = await app.client.conversations.open({
          token: updatedTokens.ACCESS_TOKEN,
          users: payload.user.id,
        });
        const channel_id = result.channel.id;
        
        await openSummaryModal(app, payload.trigger_id, updatedTokens.ACCESS_TOKEN, channel_id, payload.team.id);
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
          console.log(`[${getCurrentDateTime()}] Feedback posted to Slack channel`);
          res.status(200).send();
        } catch (error) {
          console.error(`[${getCurrentDateTime()}] Error posting feedback to Slack channel:`, error);
          res.status(500).send('Internal Server Error');
        }
      } else if (payload.type === 'view_submission' && payload.view.callback_id === 'summary_modal') {
        const sentimentCategory = payload.view.state.values.sentiment_category_block.sentiment_category.selected_option.value;
        const initialChannelId = payload.view.private_metadata.split(',')[0]; // Retrieve channel_id from private_metadata
        const teamId = payload.view.private_metadata.split(',')[1]; // Retrieve team_id from private_metadata

        // Log the initialChannelId and teamId to verify they are being set correctly
        console.log(`[${getCurrentDateTime()}] Initial Channel ID:`, initialChannelId);
        console.log(`[${getCurrentDateTime()}] Team ID:`, teamId);

        try {
          const summary = await fetchSummaryFromSnowflake(sentimentCategory, teamId);

          // Format the date range
          const formattedStartDate = format(new Date(summary.FEEDBACK_START_DATE), 'MMM dd');
          const formattedEndDate = format(new Date(summary.FEEDBACK_END_DATE), 'MMM dd');

          const message = `For the week of ${formattedStartDate} to ${formattedEndDate}, the summarized feedback is: ${summary.DETAILED_SUMMARY}`;

          // Post the message to the 'your-voice' channel, visible only to the user
          await app.client.chat.postEphemeral({
            token: updatedTokens.ACCESS_TOKEN,
            channel: initialChannelId, // Use the channel_id from the initial command
            user: payload.user.id,
            text: message,
          });

          res.status(200).send();
        } catch (error) {
          console.error(`[${getCurrentDateTime()}] Error fetching summary:`, error);
          await app.client.chat.postEphemeral({
            token: updatedTokens.ACCESS_TOKEN,
            channel: initialChannelId, // Use the channel_id from the initial command
            user: payload.user.id,
            text: 'Failed to fetch the summary. Please try again later.',
          });
        }

        res.status(200).send();
      } else {
        console.log(`[${getCurrentDateTime()}] Unexpected payload type or callback_id:`, payload.type, payload.callback_id);
        res.status(400).send();
      }
    } catch (error) {
      console.error(`[${getCurrentDateTime()}] Error handling action:`, error);
      res.status(400).send('Bad Request');
    }
  });
};

// commands/index.js

const { getTokensFromSnowflake, fetchSummaryFromSnowflake } = require('../database');
const { isAccessTokenExpired, refreshAccessToken } = require('../slack');
const { openFeedbackModal, openSummaryModal, openIntroModal, openDirectFeedbackModal } = require('../modals'); // Import from the new index.js
const { format } = require('date-fns');

// Helper function to get the current date and time as a formatted string
function getCurrentDateTime() {
  return format(new Date(), 'MM-dd-yyyy hh:mma'); // Format date as 'MM-dd-yyyy hh:mma'
}

// Helper function to get the ID of the 'your-voice' channel
async function getYourVoiceChannelId(app, token, teamId) {
  try {
    const result = await app.client.conversations.list({
      token,
      team_id: teamId,
    });

    const channel = result.channels.find(c => c.name === 'your-voice');
    if (!channel) {
      throw new Error(`'your-voice' channel not found for team ${teamId}`);
    }
    return channel.id;
  } catch (error) {
    console.error(`[${getCurrentDateTime()}] Error fetching 'your-voice' channel ID:`, error);
    throw error;
  }
}

module.exports = function(receiver, app) {
  receiver.router.post('/commands/echo', async (req, res) => {
    console.log(`[${getCurrentDateTime()}] Received /echo command:`, req.body);
    const { trigger_id, user_id, channel_id, team_id, response_url } = req.body;

    try {
      const tokens = await getTokensFromSnowflake();
      if (await isAccessTokenExpired(tokens.ACCESS_TOKEN)) {
        await refreshAccessToken(tokens.REFRESH_TOKEN);
      }

      const updatedTokens = await getTokensFromSnowflake();

      // Open the intro modal instead of redirecting to other commands
      await openIntroModal(app, trigger_id, updatedTokens.ACCESS_TOKEN);
      res.status(200).send(''); // Immediate response to clear the command text
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
        const userId = payload.user.id;

        // Log the initialChannelId and teamId to verify they are being set correctly
        console.log(`[${getCurrentDateTime()}] Team ID:`, payload.team.id);

        try {
          // Fetch the 'your-voice' channel ID dynamically
          const yourVoiceChannelId = await getYourVoiceChannelId(app, updatedTokens.ACCESS_TOKEN, payload.team.id);
          console.log(`[${getCurrentDateTime()}] Your-Voice Channel ID:`, yourVoiceChannelId);

          const summary = await fetchSummaryFromSnowflake(sentimentCategory, payload.team.id);

          // Format the date range
          const formattedStartDate = format(new Date(summary.FEEDBACK_START_DATE), 'MMM dd');
          const formattedEndDate = format(new Date(summary.FEEDBACK_END_DATE), 'MMM dd');

          const message = `For the week of ${formattedStartDate} to ${formattedEndDate}, the summarized feedback is: ${summary.DETAILED_SUMMARY}`;

          // Post the message to the 'your-voice' channel, visible only to the user
          await app.client.chat.postEphemeral({
            token: updatedTokens.ACCESS_TOKEN,
            channel: yourVoiceChannelId, // Use the dynamically fetched channel_id for your-voice
            user: userId,
            text: message,
          });

          res.status(200).send();
        } catch (error) {
          console.error(`[${getCurrentDateTime()}] Error fetching summary:`, error);
          await app.client.chat.postEphemeral({
            token: updatedTokens.ACCESS_TOKEN,
            channel: yourVoiceChannelId, // Use the dynamically fetched channel_id for your-voice
            user: userId,
            text: 'Failed to fetch the summary. Please try again later.',
          });
        }

        res.status(200).send();
      } else if (payload.type === 'block_actions') {
        // Handle button actions from the intro modal
        if (payload.actions[0].action_id === 'submit_feedback') {
          // Update the intro modal to feedback modal
          await app.client.views.update({
            token: updatedTokens.ACCESS_TOKEN,
            view_id: payload.view.id,
            view: {
              type: 'modal',
              callback_id: 'feedback_modal',
              title: {
                type: 'plain_text',
                text: 'Submit Feedback'
              },
              blocks: [
                {
                  type: 'section',
                  block_id: 'NxjKj',
                  text: {
                    type: 'mrkdwn',
                    text: 'Your feedback will be posted anonymously.'
                  }
                },
                {
                  type: 'input',
                  block_id: 'feedback_block',
                  label: {
                    type: 'plain_text',
                    text: 'Feedback'
                  },
                  element: {
                    type: 'plain_text_input',
                    action_id: 'feedback',
                    multiline: true
                  }
                }
              ],
              submit: {
                type: 'plain_text',
                text: 'Submit'
              },
              close: {
                type: 'plain_text',
                text: 'Cancel'
              }
            }
          });
          res.status(200).send();
        } else if (payload.actions[0].action_id === 'get_summary') {
          // Update the intro modal to summary modal
          await app.client.views.update({
            token: updatedTokens.ACCESS_TOKEN,
            view_id: payload.view.id,
            view: {
              type: 'modal',
              callback_id: 'summary_modal',
              title: {
                type: 'plain_text',
                text: 'Get Summary'
              },
              blocks: [
                {
                  type: 'input',
                  block_id: 'sentiment_category_block',
                  label: {
                    type: 'plain_text',
                    text: 'Feedback Type'
                  },
                  element: {
                    type: 'static_select',
                    action_id: 'sentiment_category',
                    options: [
                      {
                        text: {
                          type: 'plain_text',
                          text: 'Positive'
                        },
                        value: 'positive'
                      },
                      {
                        text: {
                          type: 'plain_text',
                          text: 'Negative'
                        },
                        value: 'negative'
                      }
                    ]
                  }
                }
              ],
              submit: {
                type: 'plain_text',
                text: 'Get Summary'
              },
              close: {
                type: 'plain_text',
                text: 'Cancel'
              }
            }
          });
          res.status(200).send();
        } else if (payload.actions[0].action_id === 'post_feedback') {
          // Fetch the 'your-voice' channel ID dynamically
          const yourVoiceChannelId = await getYourVoiceChannelId(app, updatedTokens.ACCESS_TOKEN, payload.team.id);
          // Open the direct feedback modal
          await openDirectFeedbackModal(app, payload.trigger_id, updatedTokens.ACCESS_TOKEN, yourVoiceChannelId);
          res.status(200).send();
        }
      } else if (payload.type === 'view_submission' && payload.view.callback_id === 'direct_feedback_modal') {
        const feedback = payload.view.state.values.feedback_block.feedback.value;
        const channelId = payload.view.private_metadata;

        try {
          await app.client.chat.postMessage({
            token: updatedTokens.ACCESS_TOKEN,
            channel: channelId,
            text: feedback,
          });
          console.log(`[${getCurrentDateTime()}] Feedback posted to Slack channel`);
          res.status(200).send();
        } catch (error) {
          console.error(`[${getCurrentDateTime()}] Error posting feedback to Slack channel:`, error);
          res.status(500).send('Internal Server Error');
        }
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

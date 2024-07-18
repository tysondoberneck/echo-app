const { getTokensFromSnowflake, fetchSummaryFromSnowflake } = require('../database');
const { isAccessTokenExpired, refreshAccessToken } = require('../slack');
const { openFeedbackModal, openSummaryModal, openDirectFeedbackModal } = require('../modals');
const { getCurrentDateTime } = require('../utils/dateUtils');
const { getYourVoiceChannelId } = require('../utils/slackUtils');
const { format } = require('date-fns'); // Add this line to import the format function

async function handleSlackActions(req, res, app) {
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

      const result = await app.client.conversations.open({
        token: updatedTokens.ACCESS_TOKEN,
        users: payload.user.id,
      });
      const channel_id = result.channel.id;

      await openSummaryModal(app, payload.trigger_id, updatedTokens.ACCESS_TOKEN, channel_id, payload.team.id);
      res.status(200).send();
    } else if (payload.type === 'view_submission' && payload.view.callback_id === 'feedback_modal') {
      const feedback = payload.view.state.values.feedback_block.feedback.value;
      const channelId = process.env.SLACK_CHANNEL_ID;

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

      console.log(`[${getCurrentDateTime()}] Team ID:`, payload.team.id);

      try {
        const yourVoiceChannelId = await getYourVoiceChannelId(app, updatedTokens.ACCESS_TOKEN, payload.team.id);
        console.log(`[${getCurrentDateTime()}] Your-Voice Channel ID:`, yourVoiceChannelId);

        const summary = await fetchSummaryFromSnowflake(sentimentCategory, payload.team.id);

        const formattedStartDate = format(new Date(summary.FEEDBACK_START_DATE), 'MMM dd');
        const formattedEndDate = format(new Date(summary.FEEDBACK_END_DATE), 'MMM dd');

        const message = `For the week of ${formattedStartDate} to ${formattedEndDate}, the summarized feedback is: ${summary.DETAILED_SUMMARY}`;

        await app.client.chat.postEphemeral({
          token: updatedTokens.ACCESS_TOKEN,
          channel: yourVoiceChannelId,
          user: userId,
          text: message,
        });

        res.status(200).send();
      } catch (error) {
        console.error(`[${getCurrentDateTime()}] Error fetching summary:`, error);
        await app.client.chat.postEphemeral({
          token: updatedTokens.ACCESS_TOKEN,
          channel: payload.user.id,
          user: userId,
          text: 'Failed to fetch the summary. Please try again later.',
        });
      }

      res.status(200).send();
    } else if (payload.type === 'block_actions') {
      if (payload.actions[0].action_id === 'submit_feedback') {
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
        const yourVoiceChannelId = await getYourVoiceChannelId(app, updatedTokens.ACCESS_TOKEN, payload.team.id);
        console.log(`Opening direct feedback modal with channel ID: ${yourVoiceChannelId}`);
        await openDirectFeedbackModal(app, payload.trigger_id, updatedTokens.ACCESS_TOKEN, yourVoiceChannelId);
        console.log('Direct feedback modal opened.');
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
}

module.exports = {
  handleSlackActions,
};

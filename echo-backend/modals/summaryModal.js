// echo-backend/modals/summaryModal.js

async function openSummaryModal(app, trigger_id, token, channel_id, team_id) {
    try {
      await app.client.views.open({
        token: token,
        trigger_id: trigger_id,
        view: {
          type: 'modal',
          callback_id: 'summary_modal',
          private_metadata: `${channel_id},${team_id}`, // Store channel_id and team_id in private_metadata
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
    } catch (error) {
      console.error('Error opening summary modal:', error);
    }
  }
  
  module.exports = { openSummaryModal };
  
// echo-backend/modals/directFeedbackModal.js

async function openDirectFeedbackModal(app, trigger_id, token, channelId) {
    try {
      await app.client.views.open({
        token: token,
        trigger_id: trigger_id,
        view: {
          type: 'modal',
          callback_id: 'direct_feedback_modal',
          private_metadata: channelId, // Store channel_id in private_metadata
          title: {
            type: 'plain_text',
            text: 'Post Feedback'
          },
          blocks: [
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
            text: 'Post'
          },
          close: {
            type: 'plain_text',
            text: 'Cancel'
          }
        }
      });
    } catch (error) {
      console.error('Error opening direct feedback modal:', error);
    }
  }
  
  module.exports = { openDirectFeedbackModal };
  
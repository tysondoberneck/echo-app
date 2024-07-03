// echo-backend/modals/feedbackModal.js

async function openFeedbackModal(app, trigger_id, token) {
    try {
      await app.client.views.open({
        token: token,
        trigger_id: trigger_id,
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
    } catch (error) {
      console.error('Error opening feedback modal:', error);
    }
  }
  
  module.exports = { openFeedbackModal };
  
// echo-backend/modals/introModal.js

async function openIntroModal(app, trigger_id, token) {
    try {
      await app.client.views.open({
        token: token,
        trigger_id: trigger_id,
        view: {
          type: 'modal',
          callback_id: 'intro_modal',
          title: {
            type: 'plain_text',
            text: 'Welcome to Echo'
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Welcome to Echo! Echo is designed to help you share your anonymous feedback and get a summary of team sentiments. Choose an option below to get started:'
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Submit Anonymous Feedback'
                  },
                  action_id: 'submit_feedback'
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Get Summary'
                  },
                  action_id: 'get_summary'
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Post Feedback to Channel'
                  },
                  action_id: 'post_feedback'
                }
              ]
            }
          ],
          close: {
            type: 'plain_text',
            text: 'Close'
          }
        }
      });
    } catch (error) {
      console.error('Error opening intro modal:', error);
    }
  }
  
  module.exports = { openIntroModal };
  
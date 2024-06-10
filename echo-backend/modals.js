const { getWebClient } = require('./initializeTokens');

const openFeedbackModal = async (trigger_id) => {
  const web = getWebClient();
  
  const modalView = {
    type: 'modal',
    callback_id: 'feedback_modal',
    title: {
      type: 'plain_text',
      text: 'Submit Feedback'
    },
    submit: {
      type: 'plain_text',
      text: 'Submit'
    },
    close: {
      type: 'plain_text',
      text: 'Cancel'
    },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Your feedback will be posted anonymously.'
        }
      },
      {
        type: 'input',
        block_id: 'feedback_block',
        element: {
          type: 'plain_text_input',
          multiline: true,
          action_id: 'feedback',
          placeholder: {
            type: 'plain_text',
            text: 'Enter your feedback'
          }
        },
        label: {
          type: 'plain_text',
          text: 'Feedback'
        }
      }
    ]
  };

  await web.views.open({
    trigger_id: trigger_id,
    view: modalView
  });
};

module.exports = { openFeedbackModal };

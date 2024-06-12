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

const openSettingsModal = async (trigger_id) => {
  const web = getWebClient();
  
  const modalView = {
    type: 'modal',
    callback_id: 'settings_modal',
    title: {
      type: 'plain_text',
      text: 'Admin Settings'
    },
    submit: {
      type: 'plain_text',
      text: 'Save'
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
          text: 'Manage admin settings and preferences.'
        }
      },
      {
        type: 'input',
        block_id: 'admin_users_block',
        element: {
          type: 'multi_users_select',
          action_id: 'admin_users',
          placeholder: {
            type: 'plain_text',
            text: 'Select users to grant admin access'
          }
        },
        label: {
          type: 'plain_text',
          text: 'Grant Admin Access'
        }
      }
    ]
  };

  await web.views.open({
    trigger_id: trigger_id,
    view: modalView
  });
};

module.exports = { openFeedbackModal, openSettingsModal };

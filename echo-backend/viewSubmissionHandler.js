const { getWebClient } = require('./initializeTokens');

async function handleViewSubmission(view) {
  const web = getWebClient();
  const feedback = view.state.values.feedback_block.feedback.value;
  const channelId = process.env.SLACK_CHANNEL_ID;

  console.log('Handling view submission');
  console.log('Feedback:', feedback);
  console.log('Channel ID:', channelId);

  try {
    // Post the feedback to the Slack channel
    const result = await web.chat.postMessage({
      channel: channelId,
      text: `Anonymous feedback: ${feedback}`
    });

    console.log('Feedback posted to Slack:', result);
  } catch (error) {
    console.error('Error posting feedback to Slack:', error);
    throw new Error('Failed to post feedback to Slack');
  }
}

async function handlePollSubmission(view) {
  const web = getWebClient();
  const pollQuestion = view.state.values.poll_question_block.poll_question.value;
  const pollOptions = view.state.values.poll_options_block.poll_options.value.split(',').map(option => option.trim());
  const channelId = process.env.SLACK_CHANNEL_ID;

  console.log('Handling poll submission');
  console.log('Poll Question:', pollQuestion);
  console.log('Poll Options:', pollOptions);
  console.log('Channel ID:', channelId);

  try {
    // Create poll blocks
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${pollQuestion}*`
        }
      },
      {
        type: 'actions',
        block_id: 'poll_actions',
        elements: pollOptions.map((option, index) => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: option
          },
          value: `poll_option_${index}`
        }))
      }
    ];

    // Post the poll to the Slack channel
    const result = await web.chat.postMessage({
      channel: channelId,
      blocks: blocks
    });

    console.log('Poll posted to Slack:', result);
  } catch (error) {
    console.error('Error posting poll to Slack:', error);
    throw new Error('Failed to post poll to Slack');
  }
}

module.exports = {
  handleViewSubmission,
  handlePollSubmission
};

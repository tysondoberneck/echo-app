const cron = require('node-cron');
const { getWebClient, ensureWebClientInitialized } = require('./initializeTokens');
const { getAllUsersInChannel } = require('./slackUtils');
const { getWeeklySummary, getWeeklyOpenEndedQuestion } = require('./snowflake/weeklyFeedbackSummary');

// Function to send weekly summary
async function sendWeeklySummary() {
  const web = getWebClient();  // Get the WebClient instance
  try {
    await ensureWebClientInitialized();
    const summary = await getWeeklySummary();
    
    const message = summary.map(s => {
      const formattedStartDate = s.FEEDBACK_START_DATE.split('T')[0];
      const formattedEndDate = s.FEEDBACK_END_DATE.split('T')[0];
      
      return `
Here is the feedback for the week of ${formattedStartDate} to ${formattedEndDate}:

*${s.SENTIMENT_CATEGORY.charAt(0).toUpperCase() + s.SENTIMENT_CATEGORY.slice(1)} Feedback:*
${s.SUMMARY_TEXT}
      `;
    }).join('\n\n');

    const users = await getAllUsersInChannel(process.env.SLACK_CHANNEL_ID);

    users.forEach(user => {
      web.chat.postMessage({
        channel: user,
        text: message,
      }).catch(error => console.error('Error sending weekly summary to user:', error));
    });

    console.log('Weekly summary sent to users');
  } catch (error) {
    console.error('Error sending weekly summary:', error);
  }
}

// Function to post weekly open-ended question
async function postWeeklyOpenEndedQuestion() {
  const web = getWebClient();  // Get the WebClient instance
  try {
    await ensureWebClientInitialized();
    const question = await getWeeklyOpenEndedQuestion();
    
    await web.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: `Here's an open-ended question based on last week's feedback:\n\n${question}`,
    });
    
    console.log('Open-ended question posted to #your-voice');
  } catch (error) {
    console.error('Error posting open-ended question:', error);
  }
}

// Schedule task to run every Friday at 9 AM
cron.schedule('0 9 * * 5', () => {
  console.log('Running scheduled task: Sending weekly summary');
  sendWeeklySummary();
});

// Schedule task to run every Tuesday at 9 AM
cron.schedule('0 9 * * 2', () => {
  console.log('Running scheduled task: Posting open-ended question');
  postWeeklyOpenEndedQuestion();
});

module.exports = { sendWeeklySummary, postWeeklyOpenEndedQuestion };

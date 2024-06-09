const cron = require('node-cron');
const { getWebClient, ensureWebClientInitialized } = require('./initializeTokens');
const { getWeeklySummary, getOpenEndedQuestion } = require('./snowflake/weeklyFeedbackSummary');
const { getAllUsersInChannel } = require('./slackUtils');

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
${s.DETAILED_SUMMARY}
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

// Function to send weekly open-ended question
async function sendWeeklyQuestion() {
  const web = getWebClient();  // Get the WebClient instance
  try {
    await ensureWebClientInitialized();
    const question = await getOpenEndedQuestion();
    
    web.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: question,
    }).catch(error => console.error('Error sending weekly question:', error));

    console.log('Weekly question sent to #your-voice');
  } catch (error) {
    console.error('Error sending weekly question:', error);
  }
}

// Schedule task to run every Friday at 9 AM for the weekly summary
cron.schedule('0 9 * * 5', () => {
  console.log('Running scheduled task: Sending weekly summary');
  sendWeeklySummary();
});

// Schedule task to run every Tuesday at 9 AM for the weekly open-ended question
cron.schedule('0 9 * * 2', () => {
  console.log('Running scheduled task: Sending weekly question');
  sendWeeklyQuestion();
});

module.exports = { sendWeeklySummary, sendWeeklyQuestion };

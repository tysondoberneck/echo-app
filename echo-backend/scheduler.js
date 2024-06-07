const cron = require('node-cron');
const { getWebClient, ensureWebClientInitialized } = require('./initializeTokens');
const { getAllUsersInChannel } = require('./slackUtils');
const { getWeeklySummary } = require('./snowflake/weeklyFeedbackSummary');

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

// Schedule task to run every Monday at 9 AM
cron.schedule('0 9 * * 1', () => {
  console.log('Running scheduled task: Sending weekly summary');
  sendWeeklySummary();
});

module.exports = { sendWeeklySummary };

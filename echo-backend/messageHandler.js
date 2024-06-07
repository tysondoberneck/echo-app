const { web, ensureWebClientInitialized, refreshAccessToken } = require('./initializeTokens');

async function postMessageToChannel(text) {
  try {
    await ensureWebClientInitialized();
    await web.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text,
      username: 'Anonymous',
    });
    console.log('Message posted anonymously to #your-voice');
  } catch (error) {
    if (error.code === 'slack_webapi_platform_error' && error.data.error === 'token_expired') {
      console.log('Access token expired. Refreshing token...');
      await refreshAccessToken();

      await web.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_ID,
        text,
        username: 'Anonymous',
      });
      console.log('Message posted anonymously to #your-voice after refreshing token');
    } else {
      console.error('Error posting message:', error);
    }
  }
}

module.exports = { postMessageToChannel };

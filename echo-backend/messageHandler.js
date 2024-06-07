const { getWebClient, ensureWebClientInitialized, refreshAccessToken } = require('./initializeTokens');

async function postMessageToChannel(text) {
  const web = getWebClient();  // Get the WebClient instance
  try {
    await ensureWebClientInitialized();
    await web.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text,
      username: 'Anonymous',
    });
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Message posted anonymously to #your-voice: ${text} from messageHandler`);
  } catch (error) {
    if (error.code === 'slack_webapi_platform_error' && error.data.error === 'token_expired') {
      console.log('Access token expired. Refreshing token...');
      await refreshAccessToken();

      await web.chat.postMessage({
        channel: process.env.SLACK_CHANNEL_ID,
        text,
        username: 'Anonymous',
      });
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Message posted anonymously to #your-voice after refreshing token: ${text} from messageHandler`);
    } else {
      console.error('Error posting message:', error);
    }
  }
}

module.exports = { postMessageToChannel };

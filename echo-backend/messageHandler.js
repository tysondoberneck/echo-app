const { getWebClient, ensureWebClientInitialized, refreshAccessToken } = require('./initializeTokens');

async function postMessageToChannel(text) {
  const web = getWebClient();  // Get the WebClient instance
  try {
    await ensureWebClientInitialized();
    await postMessage(web, text);
  } catch (error) {
    if (error.code === 'slack_webapi_platform_error' && error.data.error === 'token_expired') {
      console.log('Access token expired. Refreshing token...');
      await refreshAccessToken();
      const newWeb = getWebClient();
      await postMessage(newWeb, text);
    } else {
      console.error('Error posting message:', error);
    }
  }
}

async function postMessage(web, text) {
  try {
    await web.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text,
      username: 'Anonymous',
    });
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Message posted anonymously to #your-voice: ${text}`);
  } catch (error) {
    throw error;
  }
}

module.exports = { postMessageToChannel };

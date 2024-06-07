const { getWebClient, ensureWebClientInitialized } = require('./initializeTokens');

async function getAllUsersInChannel(channelId) {
  const web = getWebClient();  // Get the WebClient instance
  await ensureWebClientInitialized();

  try {
    const result = await web.conversations.members({
      channel: channelId
    });

    if (result.ok) {
      return result.members;
    } else {
      console.error('Error fetching channel members:', result.error);
      return [];
    }
  } catch (error) {
    console.error('Error fetching channel members:', error);
    return [];
  }
}

module.exports = { getAllUsersInChannel };

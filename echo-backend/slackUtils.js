const { getAppInstance, ensureWebClientInitialized } = require('./initializeTokens');

async function getAllUsersInChannel(channelId) {
  const app = getAppInstance();
  await ensureWebClientInitialized();

  try {
    const result = await app.client.conversations.members({
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

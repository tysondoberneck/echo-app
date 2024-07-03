// echo-backend/utils/slackUtils.js

async function getYourVoiceChannelId(app, token, teamId) {
    try {
      const result = await app.client.conversations.list({
        token,
        team_id: teamId,
      });
  
      const channel = result.channels.find(c => c.name === 'your-voice');
      if (!channel) {
        throw new Error(`'your-voice' channel not found for team ${teamId}`);
      }
      return channel.id;
    } catch (error) {
      console.error(`Error fetching 'your-voice' channel ID:`, error);
      throw error;
    }
  }
  
  module.exports = {
    getYourVoiceChannelId,
  };
  
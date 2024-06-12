require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const axios = require('axios');
const { getTokensFromSnowflake, updateTokensInSnowflake } = require('./snowflake/tokens');

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  stateSecret: 'my-state-secret',
  scopes: ['channels:history', 'channels:read', 'chat:write', 'chat:write.public', 'commands', 'groups:history', 'groups:read', 'im:history', 'im:write', 'incoming-webhook', 'reactions:read', 'users:read'],
  installationStore: {
    storeInstallation: async (installation) => {
      const accessToken = installation.bot.token;
      const refreshToken = installation.bot.refresh_token;
      await updateTokensInSnowflake(accessToken, refreshToken);
    },
    fetchInstallation: async (installQuery) => {
      const tokens = await getTokensFromSnowflake();
      return {
        team: installQuery.teamId,
        enterprise: installQuery.enterpriseId,
        user: installQuery.userId,
        bot: {
          token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        },
      };
    },
  },
});

const app = new App({
  receiver,
  authorize: async ({ teamId, enterpriseId }) => {
    const tokens = await getTokensFromSnowflake();
    return {
      botToken: tokens.access_token,
      botId: process.env.SLACK_BOT_USER_ID,
    };
  },
});

async function refreshAccessToken(refreshToken) {
  try {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }
    });

    if (response.data.ok) {
      const newAccessToken = response.data.access_token;
      const newRefreshToken = response.data.refresh_token;
      await updateTokensInSnowflake(newAccessToken, newRefreshToken);
      return newAccessToken;
    } else {
      console.error('Error refreshing tokens:', response.data.error);
      throw new Error('Failed to refresh token');
    }
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    throw new Error('Failed to refresh token');
  }
}

app.event('message', async ({ event, say }) => {
  try {
    await say(`Hello world, <@${event.user}>!`);
  } catch (error) {
    if (error.data && error.data.error === 'token_expired') {
      const newToken = await refreshAccessToken(event.refresh_token);
      app.client.token = newToken;
      await say(`Hello world, <@${event.user}>!`);
    } else {
      console.error('Error handling message event:', error);
    }
  }
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();

require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const { establishSnowflakeConnection, getTokensFromSnowflake, updateTokensInSnowflake } = require('./database');
const { setupMiddleware } = require('./middleware');
const registerCommands = require('./commands');
const registerEvents = require('./events');

console.log('Starting app.js...');

establishSnowflakeConnection();

const receiver = new ExpressReceiver({
  signingSecret: process.env.SIGNING_SECRET,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  stateSecret: 'my-state-secret',
  scopes: [
    'channels:history', 'channels:read', 'chat:write', 'chat:write.public', 'commands',
    'groups:history', 'groups:read', 'im:history', 'im:write', 'incoming-webhook',
    'reactions:read', 'reactions:write', 'users:read', 'token.rotate', 'token.basic'
  ],
  installationStore: {
    storeInstallation: async (installation) => {
      console.log('Storing installation tokens in Snowflake...');
      const accessToken = installation.bot.token;
      const refreshToken = installation.bot.refresh_token;
      await updateTokensInSnowflake(accessToken, refreshToken); // Ensure the refresh token is not updated
      console.log('Stored installation tokens in Snowflake');
    },
    fetchInstallation: async (installQuery) => {
      // console.log('Fetching tokens from Snowflake...');
      const tokens = await getTokensFromSnowflake();
      // console.log('Fetched tokens from Snowflake:', tokens);
      return {
        team: installQuery.teamId,
        enterprise: installQuery.enterpriseId,
        user: installQuery.userId,
        bot: {
          token: tokens.ACCESS_TOKEN,
          refresh_token: tokens.REFRESH_TOKEN,
          id: process.env.SLACK_BOT_USER_ID,
        },
      };
    },
  },
});

setupMiddleware(receiver);

const app = new App({
  receiver,
});

registerCommands(receiver, app);
registerEvents(app);

(async () => {
  try {
    await app.start(process.env.PORT || 80);
    console.log('⚡️ Bolt app is running!');
  } catch (error) {
    console.error('Error starting Bolt app:', error);
  }
})();

console.log('Finished loading app.js...');

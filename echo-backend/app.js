// app.js

require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const bodyParser = require('body-parser');
const { establishSnowflakeConnection, getTokensFromSnowflake, saveInitialTokensInSnowflake } = require('./database');
const { ensureTokensMatchAndRefresh } = require('./tokenManager'); // Import ensureTokensMatchAndRefresh from tokenManager.js
const { setupMiddleware } = require('./middleware');
const registerCommands = require('./commands');
const registerEvents = require('./events');
const oauthRouter = require('./oauth');

console.log('Starting app.js...');

(async () => {
  try {
    await establishSnowflakeConnection();
    console.log('Successfully connected to Snowflake.');

    // Ensure tokens match and access token is refreshed
    await ensureTokensMatchAndRefresh();
    console.log('Tokens matched and access token refreshed.');

    const receiver = new ExpressReceiver({
      signingSecret: process.env.SIGNING_SECRET,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      stateSecret: process.env.STATE_SECRET,
      installationStore: {
        storeInstallation: async (installation) => {
          console.log('Storing installation tokens in Snowflake...');
          const accessToken = installation.bot.token;
          const refreshToken = installation.bot.refresh_token;
          await saveInitialTokensInSnowflake(accessToken, refreshToken);
          console.log('Stored installation tokens in Snowflake.');
        },
        fetchInstallation: async (installQuery) => {
          const tokens = await getTokensFromSnowflake();
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
    console.log('Middleware set up.');

    const app = new App({
      receiver,
    });

    // Register Slack app commands and events
    registerCommands(receiver, app);
    registerEvents(app);
    console.log('Commands and events registered.');

    // Use receiver's Express app for additional routes
    const expressApp = receiver.app;
    expressApp.use(bodyParser.urlencoded({ extended: true }));
    expressApp.use(bodyParser.json());

    expressApp.use('/oauth', oauthRouter);
    console.log('OAuth router set up at /oauth.');

    await app.start(process.env.PORT || 80);
    console.log('⚡️ Bolt app is running!');
    
  } catch (error) {
    console.error('Error starting Bolt app:', error);
  }
})();

console.log('Finished loading app.js...');

const { getTokensFromSnowflake } = require('../database');
const { isAccessTokenExpired, refreshAccessToken } = require('../slack');
const { storeRawEventInSnowflake } = require('../snowflake/events');

module.exports = function(app) {
  app.event('message', async ({ event }) => {
    console.log('Received message event:', event);
    try {
      const tokens = await getTokensFromSnowflake();
    //   console.log('Fetched tokens from Snowflake:', tokens);
      if (await isAccessTokenExpired(tokens.ACCESS_TOKEN)) {
        await refreshAccessToken(tokens.REFRESH_TOKEN);
      }

      const updatedTokens = await getTokensFromSnowflake();
    //   console.log('Updated tokens:', updatedTokens);

      await storeRawEventInSnowflake(event); // Use the imported function here
      console.log('Event saved to Snowflake');
    } catch (error) {
      console.error('Error handling message event:', error);
    }
  });

  // Add listeners for reaction events
  app.event('reaction_added', async ({ event }) => {
    console.log('Received reaction_added event:', event);
    try {
      await storeRawEventInSnowflake(event);
      console.log('Reaction added event saved to Snowflake');
    } catch (error) {
      console.error('Error handling reaction_added event:', error);
    }
  });

  app.event('reaction_removed', async ({ event }) => {
    console.log('Received reaction_removed event:', event);
    try {
      await storeRawEventInSnowflake(event);
      console.log('Reaction removed event saved to Snowflake');
    } catch (error) {
      console.error('Error handling reaction_removed event:', error);
    }
  });
};

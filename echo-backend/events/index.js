const { getTokensFromSnowflake } = require('../database');
const { isAccessTokenExpired, refreshAccessToken } = require('../slack');
const { storeRawEventInSnowflake } = require('../snowflake/events');
const { format } = require('date-fns'); // Import date-fns for date formatting

// Helper function to get the current date and time as a formatted string
function getCurrentDateTime() {
  return format(new Date(), 'MM-dd-yyyy hh:mma'); // Format date as 'MM-dd-yyyy hh:mma'
}

module.exports = function(app) {
  app.event('message', async ({ event }) => {
    const timestamp = new Date(event.ts * 1000);
    const formattedTimestamp = format(timestamp, 'MM-dd-yyyy hh:mma');

    console.log(`[${getCurrentDateTime()}] Received message event:`, {
      user: event.user,
      type: event.type,
      timestamp: formattedTimestamp,
      text: event.text,
      team: event.team,
      channel: event.channel,
      event_ts: event.ts,
      channel_type: event.channel_type
    });

    try {
      const tokens = await getTokensFromSnowflake();
      if (await isAccessTokenExpired(tokens.ACCESS_TOKEN)) {
        await refreshAccessToken(tokens.REFRESH_TOKEN);
      }

      const updatedTokens = await getTokensFromSnowflake();

      await storeRawEventInSnowflake(event); // Use the imported function here
      console.log(`[${getCurrentDateTime()}] Event saved to Snowflake`);
    } catch (error) {
      console.error(`[${getCurrentDateTime()}] Error handling message event:`, error);
    }
  });

  // Add listeners for reaction events
  app.event('reaction_added', async ({ event }) => {
    const timestamp = new Date(event.ts * 1000);
    const formattedTimestamp = format(timestamp, 'MM-dd-yyyy hh:mma');

    console.log(`[${getCurrentDateTime()}] Received reaction_added event:`, {
      user: event.user,
      type: event.type,
      timestamp: formattedTimestamp,
      reaction: event.reaction,
      item: event.item,
      event_ts: event.ts
    });

    try {
      await storeRawEventInSnowflake(event);
      console.log(`[${getCurrentDateTime()}] Reaction added event saved to Snowflake`);
    } catch (error) {
      console.error(`[${getCurrentDateTime()}] Error handling reaction_added event:`, error);
    }
  });

  app.event('reaction_removed', async ({ event }) => {
    const timestamp = new Date(event.ts * 1000);
    const formattedTimestamp = format(timestamp, 'MM-dd-yyyy hh:mma');

    console.log(`[${getCurrentDateTime()}] Received reaction_removed event:`, {
      user: event.user,
      type: event.type,
      timestamp: formattedTimestamp,
      reaction: event.reaction,
      item: event.item,
      event_ts: event.ts
    });

    try {
      await storeRawEventInSnowflake(event);
      console.log(`[${getCurrentDateTime()}] Reaction removed event saved to Snowflake`);
    } catch (error) {
      console.error(`[${getCurrentDateTime()}] Error handling reaction_removed event:`, error);
    }
  });
};

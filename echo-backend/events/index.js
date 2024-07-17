const { storeRawEventInSnowflake, deleteEventFromSnowflake, deleteReactionEventFromSnowflake } = require('../snowflake/events');
const { format } = require('date-fns');

function getCurrentDateTime() {
  return format(new Date(), 'MM-dd-yyyy hh:mma');
}

function isValidTimestamp(ts) {
  const timestamp = new Date(parseFloat(ts) * 1000);
  return !isNaN(timestamp.getTime());
}

module.exports = function(app) {
  app.event('message', async ({ event }) => {
    const timestamp = new Date(event.ts * 1000);
    const formattedTimestamp = format(timestamp, 'MM-dd-yyyy hh:mma');

    console.log(`[${getCurrentDateTime()}] Received message event:`, {
      user: event.user,
      type: event.type,
      subtype: event.subtype,
      timestamp: formattedTimestamp,
      text: event.text,
      team: event.team,
      channel: event.channel,
      event_ts: event.ts,
      channel_type: event.channel_type
    });

    try {
      if (event.subtype === 'message_deleted') {
        console.log(`[${getCurrentDateTime()}] Detected message_deleted subtype`);
        await deleteEventFromSnowflake(event.previous_message.ts);
        console.log(`[${getCurrentDateTime()}] Deleted message event removed from Snowflake`);
      } else {
        await storeRawEventInSnowflake(event); 
        console.log(`[${getCurrentDateTime()}] Event saved to Snowflake`);
      }
    } catch (error) {
      console.error(`[${getCurrentDateTime()}] Error handling message event:`, error);
    }
  });

  app.event('reaction_added', async ({ event }) => {
    console.log(`[${getCurrentDateTime()}] Received reaction_added event with timestamps:`, {
      item_ts: event.item.ts,
      event_ts: event.event_ts
    });

    if (!isValidTimestamp(event.item.ts) || !isValidTimestamp(event.event_ts)) {
      console.error(`[${getCurrentDateTime()}] Invalid timestamp for reaction_added event:`, event);
      return;
    }

    try {
      const itemTimestamp = new Date(parseFloat(event.item.ts) * 1000);
      const formattedItemTimestamp = format(itemTimestamp, 'MM-dd-yyyy hh:mma');

      console.log(`[${getCurrentDateTime()}] Formatted item timestamp: ${formattedItemTimestamp}`);

      const eventTimestamp = new Date(parseFloat(event.event_ts) * 1000);
      const formattedEventTimestamp = format(eventTimestamp, 'MM-dd-yyyy hh:mma');

      console.log(`[${getCurrentDateTime()}] Formatted event timestamp: ${formattedEventTimestamp}`);

      console.log(`[${getCurrentDateTime()}] Received reaction_added event:`, {
        user: event.user,
        type: event.type,
        timestamp: formattedEventTimestamp,
        reaction: event.reaction,
        item: event.item,
        event_ts: event.event_ts
      });

      await storeRawEventInSnowflake(event);
      console.log(`[${getCurrentDateTime()}] Reaction added event saved to Snowflake`);
    } catch (error) {
      console.error(`[${getCurrentDateTime()}] Error handling reaction_added event:`, error);
    }
  });

  app.event('reaction_removed', async ({ event }) => {
    console.log(`[${getCurrentDateTime()}] Received reaction_removed event with timestamps:`, {
      item_ts: event.item.ts,
      event_ts: event.event_ts
    });

    if (!isValidTimestamp(event.item.ts) || !isValidTimestamp(event.event_ts)) {
      console.error(`[${getCurrentDateTime()}] Invalid timestamp for reaction_removed event:`, event);
      return;
    }

    try {
      const itemTimestamp = new Date(parseFloat(event.item.ts) * 1000);
      const formattedItemTimestamp = format(itemTimestamp, 'MM-dd-yyyy hh:mma');

      console.log(`[${getCurrentDateTime()}] Formatted item timestamp: ${formattedItemTimestamp}`);

      const eventTimestamp = new Date(parseFloat(event.event_ts) * 1000);
      const formattedEventTimestamp = format(eventTimestamp, 'MM-dd-yyyy hh:mma');

      console.log(`[${getCurrentDateTime()}] Formatted event timestamp: ${formattedEventTimestamp}`);

      console.log(`[${getCurrentDateTime()}] Received reaction_removed event:`, {
        user: event.user,
        type: event.type,
        timestamp: formattedEventTimestamp,
        reaction: event.reaction,
        item: event.item,
        event_ts: event.event_ts
      });

      await deleteReactionEventFromSnowflake(event.item.ts, event.reaction);
      console.log(`[${getCurrentDateTime()}] Reaction removed event deleted from Snowflake`);
    } catch (error) {
      console.error(`[${getCurrentDateTime()}] Error handling reaction_removed event:`, error);
    }
  });
};

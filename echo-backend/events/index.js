const logger = require('../logger');
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
    const timestamp = new Date(event.ts * 1000).toISOString();

    const logMessage = `Received message event: ${JSON.stringify({
      user: event.user,
      type: event.type,
      subtype: event.subtype,
      timestamp: timestamp,
      text: event.text,
      team: event.team,
      channel: event.channel,
      event_ts: event.ts,
      channel_type: event.channel_type
    })}`;
    
    console.log(logMessage);
    logger.info(logMessage);

    try {
      if (event.subtype === 'message_deleted') {
        console.log('Detected message_deleted subtype');
        logger.info('Detected message_deleted subtype');
        await deleteEventFromSnowflake(event.previous_message.ts);
        console.log('Deleted message event removed from Snowflake');
        logger.info('Deleted message event removed from Snowflake');
      } else {
        await storeRawEventInSnowflake(event); 
        console.log('Event saved to Snowflake');
        logger.info('Event saved to Snowflake');
      }
    } catch (error) {
      console.error(`Error handling message event: ${error}`);
      logger.error(`Error handling message event: ${error}`);
    }
  });

  app.event('reaction_added', async ({ event }) => {
    const logMessage = `Received reaction_added event with timestamps: ${JSON.stringify({
      item_ts: event.item.ts,
      event_ts: event.event_ts
    })}`;

    console.log(logMessage);
    logger.info(logMessage);

    if (!isValidTimestamp(event.item.ts) || !isValidTimestamp(event.event_ts)) {
      const errorMessage = `Invalid timestamp for reaction_added event: ${JSON.stringify(event)}`;
      console.error(errorMessage);
      logger.error(errorMessage);
      return;
    }

    try {
      const itemTimestamp = new Date(parseFloat(event.item.ts) * 1000).toISOString();
      const formattedItemTimestamp = `Formatted item timestamp: ${itemTimestamp}`;
      console.log(formattedItemTimestamp);
      logger.info(formattedItemTimestamp);

      const eventTimestamp = new Date(parseFloat(event.event_ts) * 1000).toISOString();
      const formattedEventTimestamp = `Formatted event timestamp: ${eventTimestamp}`;
      console.log(formattedEventTimestamp);
      logger.info(formattedEventTimestamp);

      const reactionAddedMessage = `Received reaction_added event: ${JSON.stringify({
        user: event.user,
        type: event.type,
        timestamp: eventTimestamp,
        reaction: event.reaction,
        item: event.item,
        event_ts: event.event_ts
      })}`;
      console.log(reactionAddedMessage);
      logger.info(reactionAddedMessage);

      await storeRawEventInSnowflake(event);
      console.log('Reaction added event saved to Snowflake');
      logger.info('Reaction added event saved to Snowflake');
    } catch (error) {
      console.error(`Error handling reaction_added event: ${error}`);
      logger.error(`Error handling reaction_added event: ${error}`);
    }
  });

  app.event('reaction_removed', async ({ event }) => {
    const logMessage = `Received reaction_removed event with timestamps: ${JSON.stringify({
      item_ts: event.item.ts,
      event_ts: event.event_ts
    })}`;

    console.log(logMessage);
    logger.info(logMessage);

    if (!isValidTimestamp(event.item.ts) || !isValidTimestamp(event.event_ts)) {
      const errorMessage = `Invalid timestamp for reaction_removed event: ${JSON.stringify(event)}`;
      console.error(errorMessage);
      logger.error(errorMessage);
      return;
    }

    try {
      const itemTimestamp = new Date(parseFloat(event.item.ts) * 1000).toISOString();
      const formattedItemTimestamp = `Formatted item timestamp: ${itemTimestamp}`;
      console.log(formattedItemTimestamp);
      logger.info(formattedItemTimestamp);

      const eventTimestamp = new Date(parseFloat(event.event_ts) * 1000).toISOString();
      const formattedEventTimestamp = `Formatted event timestamp: ${eventTimestamp}`;
      console.log(formattedEventTimestamp);
      logger.info(formattedEventTimestamp);

      const reactionRemovedMessage = `Received reaction_removed event: ${JSON.stringify({
        user: event.user,
        type: event.type,
        timestamp: eventTimestamp,
        reaction: event.reaction,
        item: event.item,
        event_ts: event.event_ts
      })}`;
      console.log(reactionRemovedMessage);
      logger.info(reactionRemovedMessage);

      await deleteReactionEventFromSnowflake(event.item.ts, event.reaction);
      console.log('Reaction removed event deleted from Snowflake');
      logger.info('Reaction removed event deleted from Snowflake');
    } catch (error) {
      console.error(`Error handling reaction_removed event: ${error}`);
      logger.error(`Error handling reaction_removed event: ${error}`);
    }
  });
};

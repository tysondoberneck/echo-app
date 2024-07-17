const connection = require('./connection');

async function storeRawEventInSnowflake(event) {
  try {
    const query = `
      INSERT INTO ECHO_DB.FIVETRAN.slack_events_raw (event_time, raw_event)
      SELECT ?, PARSE_JSON(?)
    `;

    const binds = [
      new Date().toISOString(),
      JSON.stringify(event)
    ];

    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: query,
        binds,
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      });
    });
    console.log('Successfully inserted event');
    logger.info('Successfully inserted event');

  } catch (error) {
    console.error('Error storing event in Snowflake:', error);
    logger.error('Error storing event in Snowflake:', error);
  }
}

async function deleteEventFromSnowflake(eventTs) {
  try {
    const query = `
      DELETE FROM ECHO_DB.FIVETRAN.slack_events_raw
      WHERE raw_event:ts = ?
    `;

    const binds = [eventTs];

    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: query,
        binds,
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      });
    });
    console.log('Successfully deleted event');
    logger.info('Successfully deleted event');

  } catch (error) {
    console.error('Error deleting event from Snowflake:', error);
    logger.error('Error deleting event from Snowflake:', error);
  }
}

async function deleteReactionEventFromSnowflake(itemTs, reaction) {
  try {
    const query = `
      DELETE FROM ECHO_DB.FIVETRAN.slack_events_raw
      WHERE raw_event:item.ts = ? AND raw_event:reaction = ?
    `;

    const binds = [itemTs, reaction];

    await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: query,
        binds,
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      });
    });
    console.log('Successfully deleted reaction event');
    logger.info('Successfully deleted reaction event');

  } catch (error) {
    console.error('Error deleting reaction event from Snowflake:', error);
    logger.error('Error deleting reaction event from Snowflake:', error);
  }
}

module.exports = {
  storeRawEventInSnowflake,
  deleteEventFromSnowflake,
  deleteReactionEventFromSnowflake
};

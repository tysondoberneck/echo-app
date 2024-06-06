const connection = require('./connection');

async function storeRawEventInSnowflake(event) {
  try {
    const query = `
      INSERT INTO ECHO_DB.ECHO_SCHEMA.slack_events_raw (event_time, raw_event)
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
  } catch (error) {
    console.error('Error storing event in Snowflake:', error);
  }
}

module.exports = {
  storeRawEventInSnowflake
};

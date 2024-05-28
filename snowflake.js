require('dotenv').config();
const snowflake = require('snowflake-sdk');

// Initialize Snowflake connection
const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA
});

// Function to connect to Snowflake and keep the connection open
function connectToSnowflake() {
  return new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) {
        reject(`Unable to connect: ${err.message}`);
      } else {
        console.log('Successfully connected to Snowflake.');
        resolve(conn);
      }
    });
  });
}

// Connect to Snowflake at the start
connectToSnowflake().catch((err) => console.error(err));

// Function to store raw event in Snowflake
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

    // Log bind variables to debug
    console.log('Bind variables:', binds);

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

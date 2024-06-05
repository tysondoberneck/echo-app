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

// Function to get tokens from Snowflake
async function getTokensFromSnowflake() {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: 'SELECT access_token, refresh_token FROM ECHO_DB.ECHO_SCHEMA.tokens WHERE id = ?',
      binds: ['slack'],
      complete: (err, stmt, rows) => {
        if (err) {
          reject('Error retrieving tokens from Snowflake: ' + err);
        } else if (rows.length > 0) {
          resolve(rows[0]);
        } else {
          reject('No tokens found in Snowflake');
        }
      }
    });
  });
}

// Function to update tokens in Snowflake
async function updateTokensInSnowflake(accessToken, refreshToken) {
  return new Promise((resolve, reject) => {
    const query = `
      MERGE INTO ECHO_DB.ECHO_SCHEMA.tokens AS target
      USING (SELECT 'slack' AS id, ? AS access_token, ? AS refresh_token) AS source
      ON target.id = source.id
      WHEN MATCHED THEN UPDATE SET target.access_token = source.access_token, target.refresh_token = source.refresh_token
      WHEN NOT MATCHED THEN INSERT (id, access_token, refresh_token) VALUES (source.id, source.access_token, source.refresh_token);
    `;

    connection.execute({
      sqlText: query,
      binds: [accessToken, refreshToken],
      complete: (err, stmt, rows) => {
        if (err) {
          reject('Error updating tokens in Snowflake: ' + err);
        } else {
          resolve();
        }
      }
    });
  });
}

// Function to get summarized data from Snowflake
async function getSummarizedData() {
  const query = `
    SELECT
      sentiment_category,
      avg_sentiment_score,
      summary_text,
      detailed_summary,
      all_numbered_posts,
      number_of_posts
    FROM ECHO_DB.ECHO_SCHEMA.SLACK_POST_SUMMARY;
  `;

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          reject('Error fetching summarized data from Snowflake: ' + err);
        } else {
          resolve(rows);
        }
      }
    });
  });
}

// Function to get sentiment data from Snowflake
async function getSentimentData() {
  const query = `
    SELECT 
      EVENT_TIME, 
      SENTIMENT_SCORE 
    FROM 
      ECHO_DB.ECHO_SCHEMA.INT_SLACK_POSTS 
    ORDER BY 
      EVENT_TIME ASC
  `;

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          reject('Error fetching sentiment data from Snowflake: ' + err);
        } else {
          resolve(rows);
        }
      }
    });
  });
}

module.exports = {
  storeRawEventInSnowflake,
  getTokensFromSnowflake,
  updateTokensInSnowflake,
  getSummarizedData,
  getSentimentData
};

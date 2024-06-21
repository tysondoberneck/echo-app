require('dotenv').config();
const axios = require('axios');
const snowflake = require('snowflake-sdk');

// Create a connection object
const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
});

// Function to connect to Snowflake
async function connectToSnowflake() {
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
async function updateTokensInSnowflake(accessToken) {
  return new Promise((resolve, reject) => {
    const query = `
      MERGE INTO ECHO_DB.ECHO_SCHEMA.tokens AS target
      USING (SELECT 'slack' AS id, ? AS access_token) AS source
      ON target.id = source.id
      WHEN MATCHED THEN UPDATE SET target.access_token = source.access_token
      WHEN NOT MATCHED THEN INSERT (id, access_token) VALUES (source.id, source.access_token);
    `;

    connection.execute({
      sqlText: query,
      binds: [accessToken],
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

// Function to check if the access token is expired
async function isAccessTokenExpired(accessToken) {
  try {
    const response = await axios.post('https://slack.com/api/auth.test', null, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return !response.data.ok && response.data.error === 'token_expired';
  } catch (error) {
    console.error('Error checking access token status:', error.message);
    throw error;
  }
}

// Function to refresh the access token
async function refreshAccessToken(refreshToken) {
  console.log('Refreshing access token...');
  try {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      params: {
        grant_type: 'refresh_token',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: refreshToken,
      },
    });

    if (response.data.ok) {
      console.log('Token refreshed successfully.');
      const newAccessToken = response.data.access_token;

      console.log('New Access Token:', newAccessToken);

      // Update Snowflake with new access token
      await updateTokensInSnowflake(newAccessToken);

      console.log('Access token updated in Snowflake.');
    } else {
      console.error('Error refreshing token:', response.data.error);
      throw new Error(response.data.error);
    }
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    throw error;
  }
}

// Function to refresh the token if expired or on schedule
async function refreshTokenIfExpired() {
  try {
    console.log('Fetching tokens from Snowflake...');
    const tokens = await getTokensFromSnowflake();

    if (tokens) {
      console.log('Tokens fetched from Snowflake:', tokens);
      
      const tokenExpired = await isAccessTokenExpired(tokens.access_token);
      if (tokenExpired) {
        console.log('Access token is expired. Proceeding with refresh...');
        await refreshAccessToken(tokens.refresh_token);
      } else {
        console.log('Access token is valid. No need to refresh.');
      }
    } else {
      console.error('No tokens found.');
    }
  } catch (error) {
    console.error('Error in the token refresh process:', error);
  }
}

// Function to schedule the token refresh process every 12 hours
function scheduleTokenRefresh() {
  const TWELVE_HOURS_IN_MS = 12 * 60 * 60 * 1000;

  refreshTokenIfExpired(); // Run once immediately
  setInterval(refreshTokenIfExpired, TWELVE_HOURS_IN_MS);
}

module.exports = {
  connectToSnowflake,
  refreshTokenIfExpired,
  scheduleTokenRefresh,
  getTokensFromSnowflake, // Add this line to export the function
  updateTokensInSnowflake, // Add this line to export the function
};

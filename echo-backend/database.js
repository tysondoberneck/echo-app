const snowflake = require('snowflake-sdk');

let snowflakeConnection;

async function establishSnowflakeConnection() {
  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT,
      username: process.env.SNOWFLAKE_USERNAME,
      password: process.env.SNOWFLAKE_PASSWORD,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE,
      database: process.env.SNOWFLAKE_DATABASE,
      schema: process.env.SNOWFLAKE_SCHEMA,
    });

    connection.connect((err, conn) => {
      if (err) {
        reject(`Unable to connect: ${err.message}`);
      } else {
        console.log('Successfully connected to Snowflake.');
        snowflakeConnection = conn;
        resolve(conn);
      }
    });
  });
}

async function getTokensFromSnowflake() {
  return new Promise((resolve, reject) => {
    snowflakeConnection.execute({
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

async function updateTokensInSnowflake(accessToken, refreshToken) {
  return new Promise((resolve, reject) => {
    const query = `
      MERGE INTO ECHO_DB.ECHO_SCHEMA.tokens AS target
      USING (SELECT 'slack' AS id, ? AS access_token, ? AS refresh_token) AS source
      ON target.id = source.id
      WHEN MATCHED THEN UPDATE SET target.access_token = source.access_token
      WHEN NOT MATCHED THEN INSERT (id, access_token, refresh_token) VALUES (source.id, source.access_token, source.refresh_token);
    `;

    snowflakeConnection.execute({
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

module.exports = {
  establishSnowflakeConnection,
  getTokensFromSnowflake,
  updateTokensInSnowflake,
};

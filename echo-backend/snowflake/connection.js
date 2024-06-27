require('dotenv').config();
const snowflake = require('snowflake-sdk');

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA
});

function connectToSnowflake() {
  return new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) {
        reject(`Unable to connect: ${err.message}`);
      } else {
        // console.log('Successfully connected to Snowflake.');
        resolve(conn);
      }
    });
  });
}

connectToSnowflake().catch((err) => console.error(err));

module.exports = connection;

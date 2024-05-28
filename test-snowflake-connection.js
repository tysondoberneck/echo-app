const snowflake = require('snowflake-sdk');
require('dotenv').config();

// Configure Snowflake connection
const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA
});

// Connect to Snowflake and execute a simple query
connection.connect((err, conn) => {
  if (err) {
    console.error('Unable to connect to Snowflake: ' + err.message);
    return;
  } else {
    console.log('Successfully connected to Snowflake.');

    // Resume the warehouse if it is suspended
    connection.execute({
      sqlText: `ALTER WAREHOUSE ${process.env.SNOWFLAKE_WAREHOUSE} RESUME;`,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error('Failed to resume warehouse due to the following error: ' + err.message);
          return;
        } else {
          console.log('Warehouse resumed.');

          // Execute a simple query
          connection.execute({
            sqlText: 'SELECT CURRENT_TIMESTAMP;',
            complete: (err, stmt, rows) => {
              if (err) {
                console.error('Failed to execute statement due to the following error: ' + err.message);
              } else {
                console.log('Query result:', rows);
              }
            }
          });
        }
      }
    });
  }
});

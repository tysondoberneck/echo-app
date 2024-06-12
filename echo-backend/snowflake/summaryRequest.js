const connection = require('./connection');

async function getSummaryFromSnowflake(sentiment) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT DETAILED_SUMMARY
      FROM ECHO_DB.ECHO_SCHEMA.SLACK_POST_SUMMARY
      WHERE SENTIMENT_CATEGORY = ?
    `;

    connection.execute({
      sqlText: query,
      binds: [sentiment],
      complete: (err, stmt, rows) => {
        if (err) {
          reject('Error retrieving summary from Snowflake: ' + err);
        } else if (rows.length > 0) {
          resolve(rows[0].DETAILED_SUMMARY);
        } else {
          resolve('No summary found for the specified sentiment.');
        }
      }
    });
  });
}

module.exports = { getSummaryFromSnowflake };

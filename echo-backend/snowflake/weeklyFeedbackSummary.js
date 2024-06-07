const { connection } = require('./connection');

async function getWeeklySummary() {
  const query = `
    SELECT
      sentiment_category,
      summary_text,
      feedback_start_date,
      feedback_end_date,
      all_numbered_posts
    FROM ECHO_DB.ECHO_SCHEMA.SLACK_POST_SUMMARY
    WHERE feedback_end_date >= DATEADD(day, -7, CURRENT_DATE)
  `;

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          reject('Error fetching weekly summary from Snowflake: ' + err);
        } else {
          resolve(rows);
        }
      }
    });
  });
}

module.exports = { getWeeklySummary };

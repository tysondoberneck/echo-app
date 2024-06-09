const { connection } = require('./connection'); // Adjusted the path to point to your Snowflake connection module

async function getWeeklySummary() {
  const query = `
    SELECT
      feedback_start_date,
      feedback_end_date,
      sentiment_category,
      detailed_summary
    FROM slack_post_summary
    WHERE feedback_end_date = (SELECT MAX(feedback_end_date) FROM slack_post_summary)
    GROUP BY feedback_start_date, feedback_end_date, sentiment_category, detailed_summary
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

async function getOpenEndedQuestion() {
  const query = `
    SELECT open_ended_question
    FROM slack_post_summary
    WHERE feedback_end_date = (SELECT MAX(feedback_end_date) FROM slack_post_summary)
    LIMIT 1
  `;

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          reject('Error fetching open-ended question from Snowflake: ' + err);
        } else {
          if (rows.length > 0) {
            resolve(rows[0].OPEN_ENDED_QUESTION);
          } else {
            reject('No open-ended question found');
          }
        }
      }
    });
  });
}

module.exports = { getWeeklySummary, getOpenEndedQuestion };

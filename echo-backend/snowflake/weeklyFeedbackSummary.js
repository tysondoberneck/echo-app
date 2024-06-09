const { connection } = require('./connection'); // Adjusted the path to point to your Snowflake connection module

async function getWeeklySummary() {
  const query = `
    SELECT
      feedback_start_date,
      feedback_end_date,
      sentiment_category,
      summary_text
    FROM slack_post_summary
    WHERE feedback_start_date = (SELECT MAX(feedback_start_date) FROM slack_post_summary)
    GROUP BY feedback_start_date, feedback_end_date, sentiment_category, summary_text
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

async function getWeeklyOpenEndedQuestion() {
  const query = `
    SELECT
      feedback_start_date,
      feedback_end_date,
      open_ended_question
    FROM slack_weekly_prompt
    WHERE feedback_start_date = (SELECT MAX(feedback_start_date) FROM slack_weekly_prompt)
  `;

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          reject('Error fetching open-ended question from Snowflake: ' + err);
        } else {
          resolve(rows[0].open_ended_question);
        }
      }
    });
  });
}

module.exports = { getWeeklySummary, getWeeklyOpenEndedQuestion };

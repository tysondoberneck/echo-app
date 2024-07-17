const connection = require('./connection');

async function getSummarizedData() {
  const query = `
    SELECT
      sentiment_category,
      avg_sentiment_score,
      numbered_weighted_posts
      detailed_summary,
      open_ended_question,
    FROM ECHO_DB.FIVETRAN.SLACK_POST_SUMMARY;
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

async function getBotPostCounts() {
  const query = `
    SELECT 
      IS_BOT_POST, 
      COUNT(*) AS POST_COUNT 
    FROM 
      ECHO_DB.ECHO_SCHEMA.INT_SLACK_POSTS 
    GROUP BY 
      IS_BOT_POST
  `;

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          reject('Error fetching bot post counts from Snowflake: ' + err);
        } else {
          resolve(rows);
        }
      }
    });
  });
}

module.exports = {
  getSummarizedData,
  getSentimentData,
  getBotPostCounts
};

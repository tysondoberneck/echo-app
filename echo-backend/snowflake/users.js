const { connection } = require('./connection');

async function getUsersToRemind() {
  const query = `
    SELECT user_id
    FROM ECHO_DB.ECHO_SCHEMA.users_to_remind
    WHERE last_reminder_sent <= DATEADD(day, -7, CURRENT_DATE)
  `;

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err, stmt, rows) => {
        if (err) {
          reject('Error fetching users to remind from Snowflake: ' + err);
        } else {
          resolve(rows.map(row => ({ id: row.USER_ID })));
        }
      }
    });
  });
}

module.exports = { getUsersToRemind };

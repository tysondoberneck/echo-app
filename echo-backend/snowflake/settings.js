const connection = require('./connection');

async function getUserSettings(user_id) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT user_id, is_admin
      FROM ECHO_DB.ECHO_SCHEMA.USER_SETTINGS
      WHERE user_id = ?
    `;

    connection.execute({
      sqlText: query,
      binds: [user_id],
      complete: (err, stmt, rows) => {
        if (err) {
          reject('Error retrieving user settings from Snowflake: ' + err);
        } else if (rows.length > 0) {
          resolve(rows[0]);
        } else {
          resolve(null);
        }
      }
    });
  });
}

async function updateUserSettings(settings) {
  return new Promise((resolve, reject) => {
    const query = `
      MERGE INTO ECHO_DB.ECHO_SCHEMA.USER_SETTINGS AS target
      USING (SELECT ? AS user_id, ? AS is_admin) AS source
      ON target.user_id = source.user_id
      WHEN MATCHED THEN UPDATE SET is_admin = source.is_admin
      WHEN NOT MATCHED THEN INSERT (user_id, is_admin) VALUES (source.user_id, source.is_admin);
    `;

    connection.execute({
      sqlText: query,
      binds: [
        settings.user_id,
        settings.is_admin
      ],
      complete: (err, stmt, rows) => {
        if (err) {
          reject('Error updating user settings in Snowflake: ' + err);
        } else {
          resolve();
        }
      }
    });
  });
}

module.exports = { getUserSettings, updateUserSettings };

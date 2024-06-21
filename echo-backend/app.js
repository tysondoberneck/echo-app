require('dotenv').config();
const { App, ExpressReceiver } = require('@slack/bolt');
const axios = require('axios');
const bodyParser = require('body-parser');
const snowflake = require('snowflake-sdk');
const { storeRawEventInSnowflake } = require('./snowflake/events'); // Ensure correct path

console.log('Starting app.js...');

let snowflakeConnection;

// Establish a persistent connection to Snowflake
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

// Initialize the persistent connection before starting the app
establishSnowflakeConnection();

const receiver = new ExpressReceiver({
  signingSecret: process.env.SIGNING_SECRET,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  stateSecret: 'my-state-secret',
  scopes: [
    'channels:history', 'channels:read', 'chat:write', 'chat:write.public', 'commands',
    'groups:history', 'groups:read', 'im:history', 'im:write', 'incoming-webhook',
    'reactions:read', 'reactions:write', 'users:read', 'token.rotate', 'token.basic'
  ],
  installationStore: {
    storeInstallation: async (installation) => {
      console.log('Storing installation tokens in Snowflake...');
      const accessToken = installation.bot.token;
      const refreshToken = installation.bot.refresh_token;
      await updateTokensInSnowflake(accessToken, refreshToken);
      console.log('Stored installation tokens in Snowflake');
    },
    fetchInstallation: async (installQuery) => {
      console.log('Fetching tokens from Snowflake...');
      const tokens = await getTokensFromSnowflake();
      console.log('Fetched tokens from Snowflake:', tokens);
      return {
        team: installQuery.teamId,
        enterprise: installQuery.enterpriseId,
        user: installQuery.userId,
        bot: {
          token: tokens.ACCESS_TOKEN,
          refresh_token: tokens.REFRESH_TOKEN,
          id: process.env.SLACK_BOT_USER_ID,
        },
      };
    },
  },
});

// Add body-parser middleware
receiver.router.use(bodyParser.json());
receiver.router.use(bodyParser.urlencoded({ extended: true }));

const app = new App({
  receiver,
});

receiver.router.post('/commands/echo', async (req, res) => {
  console.log('Received /echo command:', req.body);
  const { trigger_id, text, user_id, channel_id } = req.body;

  try {
    const tokens = await getTokensFromSnowflake();
    console.log('Fetched tokens from Snowflake:', tokens);
    if (await isAccessTokenExpired(tokens.ACCESS_TOKEN)) {
      await refreshAccessToken(tokens.REFRESH_TOKEN);
    }

    const updatedTokens = await getTokensFromSnowflake();
    console.log('Updated tokens:', updatedTokens);

    if (text.trim() === 'feedback') {
      await openFeedbackModal(trigger_id, updatedTokens.ACCESS_TOKEN);
    } else {
      await app.client.chat.postMessage({
        token: updatedTokens.ACCESS_TOKEN,
        channel: channel_id,
        text: 'Unknown command. Try /echo feedback to submit feedback.',
      });
    }

    res.status(200).send();
  } catch (error) {
    console.error('Error handling /echo command:', error);
    res.status(500).send('Internal Server Error');
  }
});

receiver.router.post('/slack/actions', async (req, res) => {
  console.log('Received action:', req.body);
  const payload = JSON.parse(req.body.payload);

  if (payload.type === 'view_submission' && payload.view.callback_id === 'feedback_modal') {
    console.log('Received feedback modal submission:', payload.view);

    const feedback = payload.view.state.values.feedback_block.feedback.value;
    const channelId = 'C075HRFGHDF'; // Replace with your channel ID

    try {
      const tokens = await getTokensFromSnowflake();
      console.log('Fetched tokens from Snowflake:', tokens);

      await app.client.chat.postMessage({
        token: tokens.ACCESS_TOKEN, // Ensure the correct token is used
        channel: channelId,
        text: `Anonymous feedback: ${feedback}`,
      });
      console.log('Feedback posted to Slack channel');
      res.status(200).send();
    } catch (error) {
      console.error('Error posting feedback to Slack channel:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(400).send();
  }
});

app.event('message', async ({ event }) => {
  console.log('Received message event:', event);
  try {
    const tokens = await getTokensFromSnowflake();
    console.log('Fetched tokens from Snowflake:', tokens);
    if (await isAccessTokenExpired(tokens.ACCESS_TOKEN)) {
      await refreshAccessToken(tokens.REFRESH_TOKEN);
    }

    const updatedTokens = await getTokensFromSnowflake();
    console.log('Updated tokens:', updatedTokens);

    await storeRawEventInSnowflake(event); // Use the imported function here
    console.log('Event saved to Snowflake');
  } catch (error) {
    console.error('Error handling message event:', error);
  }
});

// Add listeners for reaction events
app.event('reaction_added', async ({ event }) => {
  console.log('Received reaction_added event:', event);
  try {
    await storeRawEventInSnowflake(event);
    console.log('Reaction added event saved to Snowflake');
  } catch (error) {
    console.error('Error handling reaction_added event:', error);
  }
});

app.event('reaction_removed', async ({ event }) => {
  console.log('Received reaction_removed event:', event);
  try {
    await storeRawEventInSnowflake(event);
    console.log('Reaction removed event saved to Snowflake');
  } catch (error) {
    console.error('Error handling reaction_removed event:', error);
  }
});

// Utility functions for token management
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
      WHEN MATCHED THEN UPDATE SET target.access_token = source.access_token, target.refresh_token = source.refresh_token
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

async function isAccessTokenExpired(accessToken) {
  try {
    const response = await axios.post('https://slack.com/api/auth.test', null, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return !response.data.ok && response.data.error === 'token_expired';
  } catch (error) {
    console.error('Error checking access token status:', error.message);
    throw error;
  }
}

async function refreshAccessToken(refreshToken) {
  console.log('Refreshing access token...');
  try {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      params: {
        grant_type: 'refresh_token',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        refresh_token: refreshToken,
      },
    });

    if (response.data.ok) {
      console.log('Token refreshed successfully.');
      const newAccessToken = response.data.access_token;

      console.log('New Access Token:', newAccessToken);

      // Update Snowflake with new access token
      await updateTokensInSnowflake(newAccessToken, refreshToken);

      console.log('Access token updated in Snowflake.');
    } else {
      console.error('Error refreshing token:', response.data.error);
      throw new Error(response.data.error);
    }
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    throw error;
  }
}

async function openFeedbackModal(trigger_id, token) {
  try {
    console.log('Opening feedback modal with token:', token);
    await app.client.views.open({
      token: token,
      trigger_id: trigger_id,
      view: {
        type: 'modal',
        callback_id: 'feedback_modal',
        title: {
          type: 'plain_text',
          text: 'Submit Feedback'
        },
        blocks: [
          {
            type: 'section',
            block_id: 'NxjKj',
            text: {
              type: 'mrkdwn',
              text: 'Your feedback will be posted anonymously.'
            }
          },
          {
            type: 'input',
            block_id: 'feedback_block',
            label: {
              type: 'plain_text',
              text: 'Feedback'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'feedback',
              multiline: true
            }
          }
        ],
        submit: {
          type: 'plain_text',
          text: 'Submit'
        },
        close: {
          type: 'plain_text',
          text: 'Cancel'
        }
      }
    });
  } catch (error) {
    console.error('Error opening feedback modal:', error);
  }
}

(async () => {
  try {
    await app.start(process.env.PORT || 80);
    console.log('⚡️ Bolt app is running!');
  } catch (error) {
    console.error('Error starting Bolt app:', error);
  }
})();

console.log('Finished loading app.js...');

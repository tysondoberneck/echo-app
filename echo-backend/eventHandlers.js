const { getWebClient, ensureWebClientInitialized, getBotUserId } = require('./initializeTokens');
const { storeRawEventInSnowflake } = require('./snowflake/events');
const { postMessageToChannel } = require('./messageHandler');
const { getUserSettings, updateUserSettings } = require('./snowflake/settings');
const async = require('async');

// Create a queue for handling messages
let messageQueue = async.queue(async (task, callback) => {
  const { event, userName, timestamp, web, team_id } = task;

  try {
    // Reply to the user asynchronously
    const responses = [
      `Thanks for the feedback, ${userName}! I'll get that posted for you.`,
      `${userName}, your feedback is appreciated! I'll make sure it gets posted.`,
      `Got it, ${userName}! Your feedback will be posted.`,
      `Thanks, ${userName}! I'll handle posting your feedback.`,
      `Beep Boop🤖, ${userName}! Consider it shared.`,
      `Your thoughts are on their way to the team, ${userName}!`,
      `Feedback received, ${userName}! Posting it now.`,
      `Thanks a ton, ${userName}! Your feedback is heading to the channel.`,
      `You're amazing, ${userName}! Your feedback is being posted.`,
      `Superb, ${userName}! I've posted your feedback.`,
      `Thanks for sharing, ${userName}! It's now live.`,
      `Got your feedback, ${userName}! Sending it out.`,
      `Thanks for speaking up, ${userName}! Your feedback is posted.`,
      `You're the best, ${userName}! Feedback is now posted.`,
      `Thanks for the insight, ${userName}! It's posted.`,
      `Done and done, ${userName}! Your feedback is now live.`,
      `Message received, ${userName}! Sharing your thoughts.`,
      `You're awesome, ${userName}! Feedback posted.`,
      `Thanks, ${userName}! Your message is on the way.`,
      `Got it, ${userName}! Sharing your feedback now.`
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    await web.chat.postMessage({
      channel: event.channel,
      text: randomResponse,
      thread_ts: event.ts, // Reply in thread
    });

    // Post the message to the channel
    await postMessageToChannel(event.text);
    console.log(`[${timestamp}] Message posted anonymously to #your-voice: ${event.text}`);

    // Store the original user message in Snowflake
    await storeRawEventInSnowflake({ ...task.reqBody, team_id });
  } catch (error) {
    console.error('Error processing message:', error);
  }

  callback();
}, 1);

// Function to get the user's name
async function getUserName(userId) {
  const web = getWebClient();
  try {
    await ensureWebClientInitialized();
    const result = await web.users.info({ user: userId });
    return result.user.profile.real_name || result.user.profile.display_name || 'there';
  } catch (error) {
    console.error('Error fetching user info:', error);
    return 'there';
  }
}

// Function to handle Slack events
async function handleSlackEvents(req, res) {
  const event = req.body.event;
  await ensureWebClientInitialized();
  const web = getWebClient();  // Get the WebClient instance
  const botUserId = await getBotUserId();  // Get the bot user ID

  if (event) {
    const timestamp = new Date().toISOString();
    if (event.type === 'message') {
      // Ignore messages from bots
      if (event.user === botUserId) {
        res.status(200).send('Message from bot, ignoring...');
        return;
      }

      if (event.channel === process.env.SLACK_CHANNEL_ID) {
        // Handle messages posted directly in #your-voice
        console.log(`[${timestamp}] Message received in #your-voice: ${event.text}`);
        await storeRawEventInSnowflake({ ...req.body, team_id: event.team }).catch(error => console.error('Error storing event in Snowflake:', error));
      } else if (event.channel_type === 'im') {
        // Handle direct messages
        const userName = await getUserName(event.user);
        console.log(`[${timestamp}] Direct message received: ${event.text}`);

        // Add the message to the queue
        messageQueue.push({ event, userName, timestamp, web, reqBody: req.body, team_id: event.team });
      }
    } else if (event.type === 'reaction_added') {
      await storeRawEventInSnowflake({ ...req.body, team_id: event.team }).catch(error => console.error('Error storing event in Snowflake:', error));
      console.log(`[${timestamp}] Reaction added: ${event.reaction}`);
    } else if (event.type === 'app_home_opened') {
      await sendWelcomeMessage(event.user).catch(error => console.error('Error sending welcome message:', error));
      console.log(`[${timestamp}] App home opened by user: ${event.user}`);
    }
  }

  res.status(200).send('Event received');
}

// Function to handle Slack actions
async function handleSlackActions(req, res) {
  console.log('Slack action payload:', req.body.payload); // Log the payload for debugging
  const payload = JSON.parse(req.body.payload);
  const { type, view, user } = payload;
  const web = getWebClient();

  try {
    if (type === 'view_submission' && view.callback_id === 'settings_modal') {
      // Handle settings modal submission
      const adminUsers = view.state.values.admin_users_block.admin_users.selected_users;

      console.log('Admin Users:', adminUsers);

      // Update user settings in Snowflake
      for (const adminUser of adminUsers) {
        await updateUserSettings({
          user_id: adminUser,
          is_admin: true
        });
      }

      console.log('Settings updated for admin users:', adminUsers);

      res.status(200).send();
    } else {
      console.log('Unhandled action type:', type);
      res.status(200).send();
    }
  } catch (error) {
    console.error('Error handling Slack action:', error);
    res.status(500).send('Internal Server Error');
  }
}

// Function to send a welcome message to a user
async function sendWelcomeMessage(userId) {
  const web = getWebClient();  // Get the WebClient instance
  try {
    await ensureWebClientInitialized();
    await web.chat.postMessage({
      channel: userId,
      text: `Welcome to Echo Bot!
      
You can use this bot to send anonymous feedback to the #your-voice channel.
Here's how you can use Echo Bot:
- Just type your feedback in a direct message to Echo Bot.
- Your message will be posted anonymously in the #your-voice channel.
- Use this space to share your thoughts, concerns, and suggestions.

Thank you for helping us improve!`,
    });
    console.log(`Welcome message sent to user: ${userId}`);
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
}

module.exports = { handleSlackEvents, handleSlackActions };

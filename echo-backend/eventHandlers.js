const { getWebClient, ensureWebClientInitialized } = require('./initializeTokens');
const { storeRawEventInSnowflake } = require('./snowflake/events');
const { postMessageToChannel } = require('./messageHandler');

async function handleSlackEvents(req, res) {
  const event = req.body.event;
  await ensureWebClientInitialized();
  const web = getWebClient();  // Get the WebClient instance

  if (event) {
    const timestamp = new Date().toISOString();
    if (event.type === 'message') {
      // Ignore messages from bots
      if (event.bot_id) {
        console.log(`[${timestamp}] Message from bot, ignoring...`);
        res.status(200).send('Message from bot, ignoring...');
        return;
      }

      if (event.channel === process.env.SLACK_CHANNEL_ID) {
        // Handle messages posted directly in #your-voice
        console.log(`[${timestamp}] Message received in #your-voice: ${event.text}`);
        await storeRawEventInSnowflake(req.body).catch(error => console.error('Error storing event in Snowflake:', error));
      } else if (event.channel_type === 'im') {
        // Handle direct messages
        console.log(`[${timestamp}] Direct message received: ${event.text}`);
        
        // Reply to the user asynchronously
        web.chat.postMessage({
          channel: event.channel,
          text: "Thanks for the feedback! I'll get that posted for you.",
          thread_ts: event.ts, // Reply in thread
        }).catch(error => console.error('Error replying to user:', error));

        // Post the message to the channel
        await postMessageToChannel(event.text);
        // console.log(`[${timestamp}] Message posted anonymously to #your-voice: ${event.text}`);

        // Store the original user message in Snowflake
        await storeRawEventInSnowflake(req.body).catch(error => console.error('Error storing event in Snowflake:', error));
      }
    } else if (event.type === 'reaction_added') {
      await storeRawEventInSnowflake(req.body).catch(error => console.error('Error storing event in Snowflake:', error));
      console.log(`[${timestamp}] Reaction added: ${event.reaction}`);
    } else if (event.type === 'app_home_opened') {
      await sendWelcomeMessage(event.user).catch(error => console.error('Error sending welcome message:', error));
      console.log(`[${timestamp}] App home opened by user: ${event.user}`);
    }
  }

  res.status(200).send('Event received');
}

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

module.exports = { handleSlackEvents };

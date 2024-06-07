const { getWebClient, ensureWebClientInitialized } = require('./initializeTokens');
const { storeRawEventInSnowflake } = require('./snowflake/events');
const { postMessageToChannel } = require('./messageHandler');

async function handleSlackEvents(req, res) {
  console.log('Received a request from Slack:', JSON.stringify(req.body, null, 2));

  if (req.body.type === 'url_verification') {
    res.status(200).send(req.body.challenge);
    return;
  }

  const event = req.body.event;
  await ensureWebClientInitialized();
  const web = getWebClient();  // Get the WebClient instance

  if (event) {
    console.log('Event received:', JSON.stringify(event, null, 2));
    if (event.type === 'message') {
      if (event.channel === process.env.SLACK_CHANNEL_ID) {
        console.log('Message received in #your-voice:', event.text);
        await storeRawEventInSnowflake(req.body).catch(error => console.error(error));
      } else if (event.channel_type === 'im' && !event.bot_id) {
        console.log('Direct message received:', event.text);
        // Reply to the user
        await web.chat.postMessage({
          channel: event.channel,
          text: "Thanks for the feedback! I'll get that posted for you.",
          thread_ts: event.ts, // Reply in thread
        });
        // Post the message to the channel
        await postMessageToChannel(event.text);
      } else {
        console.log('Event type or channel mismatch:', event);
      }
    } else if (event.type === 'reaction_added') {
      console.log('Reaction added:', event.reaction);
      await storeRawEventInSnowflake(req.body).catch(error => console.error(error));
    } else if (event.type === 'app_home_opened') {
      console.log('App home opened by user:', event.user);
      await sendWelcomeMessage(event.user);
    } else {
      console.log('Event type or channel mismatch:', event);
    }
  } else {
    console.log('No event found in request:', req.body);
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
    console.log('Welcome message sent to user:', userId);
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
}

module.exports = { handleSlackEvents };

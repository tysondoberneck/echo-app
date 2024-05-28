const express = require('express');
const bodyParser = require('body-parser');
const { storeRawEventInSnowflake } = require('./snowflake');

const app = express();
app.use(bodyParser.json());

app.post('/slack/events', async (req, res) => {
  console.log('Received a request from Slack:', JSON.stringify(req.body, null, 2));

  const event = req.body.event;
  if (event) {
    console.log('Event received:', JSON.stringify(event, null, 2));
    if (event.type === 'message' && event.channel === 'C075HRFGHDF') {
      console.log('Message received:', event.text);
      await storeRawEventInSnowflake(req.body);
    } else {
      console.log('Event type or channel mismatch:', event);
    }
  } else {
    console.log('No event found in request:', req.body);
  }

  res.status(200).send('Event received');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

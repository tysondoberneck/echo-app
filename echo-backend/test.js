const axios = require('axios');

async function testTokenRotation() {
  const refreshToken = process.env.SLACK_REFRESH_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  try {
    const response = await axios.post('https://slack.com/api/tooling.tokens.rotate', null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      },
    });

    if (response.data.ok) {
      console.log('Token rotated successfully:', response.data);
    } else {
      console.error('Error rotating token:', response.data.error);
    }
  } catch (error) {
    console.error('Error rotating token:', error);
  }
}

testTokenRotation();

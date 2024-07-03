// echo-backend/commands/commandHandlers.js

const { getTokensFromSnowflake } = require('../database');
const { isAccessTokenExpired, refreshAccessToken } = require('../slack');
const { openIntroModal } = require('../modals');
const { getCurrentDateTime } = require('../utils/dateUtils');

async function handleEchoCommand(req, res, app) {
  console.log(`[${getCurrentDateTime()}] Received /echo command:`, req.body);
  const { trigger_id } = req.body;

  try {
    const tokens = await getTokensFromSnowflake();
    if (await isAccessTokenExpired(tokens.ACCESS_TOKEN)) {
      await refreshAccessToken(tokens.REFRESH_TOKEN);
    }

    const updatedTokens = await getTokensFromSnowflake();
    await openIntroModal(app, trigger_id, updatedTokens.ACCESS_TOKEN);
    res.status(200).send(''); // Immediate response to clear the command text
  } catch (error) {
    console.error(`[${getCurrentDateTime()}] Error handling /echo command:`, error);
    res.status(500).send('Internal Server Error');
  }
}

module.exports = {
  handleEchoCommand,
};

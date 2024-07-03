// commands/index.js

const { handleEchoCommand } = require('./commandHandlers');
const { handleSlackActions } = require('./actionHandlers');

module.exports = function(receiver, app) {
  receiver.router.post('/commands/echo', (req, res) => handleEchoCommand(req, res, app));
  receiver.router.post('/slack/actions', (req, res) => handleSlackActions(req, res, app));
};

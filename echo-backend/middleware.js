const bodyParser = require('body-parser');

function setupMiddleware(receiver) {
  receiver.router.use(bodyParser.json());
  receiver.router.use(bodyParser.urlencoded({ extended: true }));
}

module.exports = {
  setupMiddleware,
};

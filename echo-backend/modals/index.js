// echo-backend/modals/index.js

const { openFeedbackModal } = require('./feedbackModal');
const { openSummaryModal } = require('./summaryModal');
const { openIntroModal } = require('./introModal');
const { openDirectFeedbackModal } = require('./directFeedbackModal'); // Import the new modal

module.exports = {
  openFeedbackModal,
  openSummaryModal,
  openIntroModal,
  openDirectFeedbackModal, // Export the new modal
};

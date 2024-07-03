// echo-backend/utils/dateUtils.js

const { format } = require('date-fns');

// Helper function to get the current date and time as a formatted string
function getCurrentDateTime() {
  return format(new Date(), 'MM-dd-yyyy hh:mma'); // Format date as 'MM-dd-yyyy hh:mma'
}

module.exports = {
  getCurrentDateTime,
};

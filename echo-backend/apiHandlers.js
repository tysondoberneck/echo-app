const { getSummarizedData, getSentimentData, getBotPostCounts } = require('./snowflake/data');

async function handleFeedback(req, res) {
  const { range } = req.query;
  try {
    const data = await getSummarizedData(range);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching summarized data:', error);
    res.status(500).send('Error fetching summarized data');
  }
}

async function handleSentiment(req, res) {
  const { range } = req.query;
  try {
    const data = await getSentimentData(range);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching sentiment data:', error);
    res.status(500).send('Error fetching sentiment data');
  }
}

async function handleBotPostCounts(req, res) {
  const { range } = req.query;
  try {
    const data = await getBotPostCounts(range);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching bot post counts:', error);
    res.status(500).send('Error fetching bot post counts');
  }
}

module.exports = {
  handleFeedback,
  handleSentiment,
  handleBotPostCounts
};

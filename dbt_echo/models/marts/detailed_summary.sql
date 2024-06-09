{{ config(materialized='table') }}

with base_feedback as (
  select
    *
  from {{ ref('base_feedback_summary') }}
)

select
  sentiment_category,
  feedback_start_date,
  feedback_end_date,
  SNOWFLAKE.CORTEX.COMPLETE(
    'mistral-large',
    CONCAT(
      'Summarize the following ordered list of employee feedback into 5 bullet points for management to understand the most pressing concerns and overall sentiment. Consider the importance of each post based on the weight it received: ',
      numbered_posts_string,
      '. The feedback includes comments on job satisfaction, workplace environment, management effectiveness, and suggestions for improvements. Provide a concise summary highlighting key points, common themes, and any specific issues repeatedly mentioned by employees. Focus on the most pressing concerns based on weight levels. Do not mention the weight in your summary.'
    )
  ) as detailed_summary,
  SNOWFLAKE.CORTEX.COMPLETE(
    'mistral-large',
    CONCAT(
      'Based on the feedback provided this week, ask an open-ended question that encourages further discussion on these topics. The question should be posed to a large audience. The feedback is a combination of many people
      feedback, not just a single person. Phrase your question to the group. and keep it to 1-2 sentences. Do not ask about any specific people that may have been mentioned in your question. Keep the questions light and fun: ',
      numbered_posts_string
    )
  ) as open_ended_question
from base_feedback

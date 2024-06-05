{{
  config(
    materialized='table'
  )
}}

with base_posts as (
  select
    p.*,
    w.weight  -- Include weight from weighted_slack_posts
  from {{ ref('int_slack_posts') }} p
  join {{ ref('weighted_slack_posts') }} w on p.id = w.post_id
  where p.event_text is not null
),

filtered_posts as (
  select
    *
  from base_posts
  where sentiment_score <= -0.20 or sentiment_score >= 0.20  -- Exclude neutral posts
),

numbered_posts as (
  select
    *,
    row_number() over (partition by case when sentiment_score > 0 then 'positive' else 'negative' end order by event_time) as post_number,
    concat(event_text, ' (weight: ', weight, ')') as weighted_text  -- Append weight to post text
  from filtered_posts
),

combined_feedback as (
  select
    case
      when sentiment_score > 0 then 'positive'
      else 'negative'
    end as sentiment_category,
    avg(sentiment_score) as avg_sentiment_score,
    array_agg(weighted_text) as feedback_texts,
    array_agg(concat(post_number, '. ', weighted_text)) as numbered_posts,
    count(*) as number_of_posts
  from numbered_posts
  group by sentiment_category
)

select
  sentiment_category,
  avg_sentiment_score,
  SNOWFLAKE.CORTEX.SUMMARIZE(array_to_string(feedback_texts, ' ')) as summary_text,  -- Summarize using Cortex
  SNOWFLAKE.CORTEX.COMPLETE(
    'mistral-large',
    CONCAT(
      'Summarize the following ordered list of employee feedback for management to understand the most pressing concerns and overall sentiment. Consider the importance of each post based on the engagement (reactions and replies) it received, as indicated by the weight provided in parentheses: ',
      array_to_string(numbered_posts, ' '),
      '. The feedback includes comments on job satisfaction, workplace environment, management effectiveness, and suggestions for improvements. Provide a concise summary highlighting key points, common themes, and any specific issues repeatedly mentioned by employees. Posts with higher engagement, indicated by higher weights, should be considered more important.'
    )
  ) as detailed_summary,  -- Detailed summary using Cortex Complete
  array_to_string(numbered_posts, ' ') as all_numbered_posts,
  number_of_posts
from combined_feedback

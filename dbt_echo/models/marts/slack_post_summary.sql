{{
  config(
    materialized='incremental',
    unique_key='sentiment_category, feedback_start_date'
  )
}}

-- Step 1: Fetch base posts and include their weights
with base_posts as (
  select
    p.*,
    w.weight  -- Include weight from weighted_slack_posts
  from {{ ref('int_slack_posts') }} p
  join {{ ref('weighted_slack_posts') }} w on p.id = w.post_id
  where p.event_text is not null
),

-- Step 2: Filter out neutral posts (sentiment scores between -0.20 and 0.20)
filtered_posts as (
  select
    *
  from base_posts
  where sentiment_score <= -0.20 or sentiment_score >= 0.20
),

-- Step 3: Number the posts within their sentiment categories and append the weight to the post text
numbered_posts as (
  select
    *,
    row_number() over (partition by case when sentiment_score > 0 then 'positive' else 'negative' end order by event_time) as post_number,
    concat(event_text, ' (weight: ', weight, ')') as weighted_text,
    case 
      when sentiment_score > 0 then 'positive' 
      else 'negative' 
    end as sentiment_category
  from filtered_posts
),

-- Step 4: Group posts by week, setting the start and end dates of the feedback week
week_grouped_posts as (
  select
    *,
    date_trunc('week', event_time) + interval '1 day' as feedback_start_date,
    date_trunc('week', event_time) + interval '5 days' as feedback_end_date
  from numbered_posts
),

-- Step 5: Aggregate feedback by sentiment category and week, calculating average sentiment scores and aggregating feedback texts
combined_feedback as (
  select
    sentiment_category,
    feedback_start_date,
    feedback_end_date,
    avg(sentiment_score) as avg_sentiment_score,
    array_agg(weighted_text) as feedback_texts,
    array_agg(concat(post_number, '. ', weighted_text)) as numbered_posts,
    count(*) as number_of_posts
  from week_grouped_posts
  group by sentiment_category, feedback_start_date, feedback_end_date
),

-- Step 6: Convert the array of numbered posts into a single string for use in the Cortex Complete function
numbered_posts_string as (
  select
    sentiment_category,
    feedback_start_date,
    feedback_end_date,
    array_to_string(array_agg(concat(post_number, '. ', weighted_text)), ' ') as numbered_posts_string
  from week_grouped_posts
  group by sentiment_category, feedback_start_date, feedback_end_date
),

-- Final Select: Fetch the combined feedback, detailed summary, and open-ended question for each sentiment category and feedback week
final_combined as (
  select
    f.sentiment_category,
    f.avg_sentiment_score,
    f.feedback_start_date,
    f.feedback_end_date,
    array_to_string(f.numbered_posts, ' ') as numbered_weighted_posts,
    SNOWFLAKE.CORTEX.COMPLETE(
      'mistral-large',
      CONCAT(
        'Summarize the following ordered list of employee feedback into 5 bullet points for management to understand the most pressing concerns and overall sentiment. Consider the importance of each post based on the weight it received: ',
        array_to_string(f.numbered_posts, ' '),
        '. The feedback includes comments on job satisfaction, workplace environment, management effectiveness, and suggestions for improvements. Provide a concise summary highlighting key points, common themes, and any specific issues repeatedly mentioned by employees. Focus on the most pressing concerns based on weight levels. Do not mention the weight in your summary.'
      )
    ) as detailed_summary,  -- Detailed summary using Cortex Complete
    n.numbered_posts_string,
    SNOWFLAKE.CORTEX.COMPLETE(
      'mistral-large',
      CONCAT(
        'Based on the feedback provided this week, ask an open-ended question that encourages further discussion on these topics. The question should be posed to a large audience. The feedback is a combination of many people feedback, not just a single person. Phrase your question to the group and keep it to 1-2 sentences. Do not ask about any specific people that may have been mentioned in your question. Keep the questions light and fun: ',
        n.numbered_posts_string
      )
    ) as open_ended_question
  from combined_feedback f
  join numbered_posts_string n
  on f.sentiment_category = n.sentiment_category
  and f.feedback_start_date = n.feedback_start_date
  and f.feedback_end_date = n.feedback_end_date
)

-- Final select to apply the incremental logic
select 
  sentiment_category,
  avg_sentiment_score,
  feedback_start_date,
  feedback_end_date,
  numbered_weighted_posts,
  detailed_summary,
  open_ended_question
from final_combined

{% if is_incremental() %}
  where feedback_end_date > (select max(feedback_end_date) from {{ this }})
{% endif %}

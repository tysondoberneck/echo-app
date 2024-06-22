{{
  config(
    materialized='incremental',
    unique_key='team_id, sentiment_category, feedback_start_date'
  )
}}

-- Step 1: Fetch base posts and include their weights and team_id
with base_posts as (
  select
    p.*,
    w.weight  -- Include weight from weighted_slack_posts
  from {{ ref('int_slack_posts') }} p
  join {{ ref('weighted_slack_posts') }} w on p.id = w.post_id
  where p.event_text is not null
),

-- Step 2: Filter out neutral posts (sentiment scores between -0.40 and 0.40)
filtered_posts as (
  select
    bp.*,
    case 
      when bp.sentiment_score > 0 then 'positive' 
      else 'negative' 
    end as sentiment_category
  from base_posts bp
  where bp.sentiment_score <= -0.40 or bp.sentiment_score >= 0.40
),

-- Step 3: Number the posts within their sentiment categories and append the weight to the post text
numbered_posts as (
  select
    fp.*,
    row_number() over (
      partition by date_trunc('week', fp.event_time - interval '1 day'), fp.sentiment_category
      order by fp.event_time
    ) as post_number,
    concat(fp.event_text, ' (weight: ', fp.weight, ')') as weighted_text
  from filtered_posts fp
),

-- Step 4: Group posts by week, setting the start and end dates of the feedback week
week_grouped_posts as (
  select
    np.*,
    date_trunc('week', np.event_time - interval '1 day') + interval '1 day' as feedback_start_date,
    date_trunc('week', np.event_time - interval '1 day') + interval '7 days' - interval '1 second' as feedback_end_date
  from numbered_posts np
),

-- Step 5: Aggregate feedback by sentiment category and week, calculating average sentiment scores and aggregating feedback texts
combined_feedback as (
  select
    wgp.team_id,
    wgp.sentiment_category,
    wgp.feedback_start_date,
    wgp.feedback_end_date,
    avg(wgp.sentiment_score) as avg_sentiment_score,
    array_agg(wgp.weighted_text) as feedback_texts,
    array_agg(concat(wgp.post_number, '. ', wgp.weighted_text)) as numbered_posts,
    count(*) as number_of_posts
  from week_grouped_posts wgp
  group by wgp.team_id, wgp.sentiment_category, wgp.feedback_start_date, wgp.feedback_end_date
),

-- Step 6: Convert the array of numbered posts into a single string for use in the Cortex Complete function
numbered_posts_string as (
  select
    wgp.team_id,
    wgp.sentiment_category,
    wgp.feedback_start_date,
    wgp.feedback_end_date,
    array_to_string(array_agg(concat(wgp.post_number, '. ', wgp.weighted_text)), ' ') as numbered_posts_string
  from week_grouped_posts wgp
  group by wgp.team_id, wgp.sentiment_category, wgp.feedback_start_date, wgp.feedback_end_date
),

-- Final Select: Fetch the combined feedback, detailed summary, and open-ended question for each sentiment category and feedback week
final_combined as (
  select
    cf.team_id,
    cf.sentiment_category,
    cf.avg_sentiment_score,
    cf.feedback_start_date,
    cf.feedback_end_date,
    array_to_string(cf.numbered_posts, ' ') as numbered_weighted_posts,
    SNOWFLAKE.CORTEX.COMPLETE(
      'mistral-large',
      CONCAT(
        'Summarize the following ordered list of employee feedback into 5 bullet points for management to understand the most pressing concerns and overall sentiment. Consider the importance of each post based on the weight it received: ',
        array_to_string(cf.numbered_posts, ' '),
        '. The feedback includes comments on job satisfaction, workplace environment, management effectiveness, and suggestions for improvements. Provide a concise summary highlighting key points, common themes, and any specific issues repeatedly mentioned by employees. Focus on the most pressing concerns based on weight levels. Do not mention the weight in your summary.'
      )
    ) as detailed_summary,  -- Detailed summary using Cortex Complete
    nps.numbered_posts_string,
    SNOWFLAKE.CORTEX.COMPLETE(
      'mistral-large',
      CONCAT(
        'Based on the feedback provided this week, ask an open-ended question that encourages further discussion on these topics. The question should be posed to a large audience. The feedback is a combination of many people feedback, not just a single person. Phrase your question to the group and keep it to 1-2 sentences. Do not ask about any specific people that may have been mentioned in your question. Keep the questions light and fun: ',
        nps.numbered_posts_string
      )
    ) as open_ended_question
  from combined_feedback cf
  join numbered_posts_string nps
  on cf.team_id = nps.team_id
  and cf.sentiment_category = nps.sentiment_category
  and cf.feedback_start_date = nps.feedback_start_date
  and cf.feedback_end_date = nps.feedback_end_date
)

-- Final select to apply the incremental logic
select 
  final_combined.team_id,
  final_combined.sentiment_category,
  final_combined.avg_sentiment_score,
  final_combined.feedback_start_date,
  final_combined.feedback_end_date,
  final_combined.numbered_weighted_posts,
  final_combined.detailed_summary,
  final_combined.open_ended_question
from final_combined

{% if is_incremental() %}
  where final_combined.feedback_end_date > (select max(feedback_end_date) from {{ this }})
{% endif %}

{{ config(materialized='ephemeral') }}

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

week_grouped_posts as (
  select
    *,
    date_trunc('week', event_time) + interval '1 day' as feedback_start_date,
    date_trunc('week', event_time) + interval '5 days' as feedback_end_date
  from numbered_posts
),

combined_feedback as (
  select
    case
      when sentiment_score > 0 then 'positive'
      else 'negative'
    end as sentiment_category,
    feedback_start_date,
    feedback_end_date,
    avg(sentiment_score) as avg_sentiment_score,
    array_agg(weighted_text) as feedback_texts,
    array_agg(concat(post_number, '. ', weighted_text)) as numbered_posts,
    count(*) as number_of_posts
  from week_grouped_posts
  group by sentiment_category, feedback_start_date, feedback_end_date
)

select
  sentiment_category,
  avg_sentiment_score,
  feedback_start_date,
  feedback_end_date,
  array_to_string(feedback_texts, ' ') as feedback_texts_string,
  array_to_string(numbered_posts, ' ') as numbered_posts_string,
  number_of_posts
from combined_feedback

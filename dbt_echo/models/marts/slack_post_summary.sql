{{ config(materialized='table') }}

with combined_feedback as (
  select
    *
  from {{ ref('base_feedback_summary') }}
),

detailed_summaries as (
  select
    *
  from {{ ref('detailed_summary') }}
)

select
  f.sentiment_category,
  f.avg_sentiment_score,
  f.feedback_start_date,
  f.feedback_end_date,
  SNOWFLAKE.CORTEX.SUMMARIZE(f.feedback_texts_string) as summary_text,  -- Summarize using Cortex
  d.detailed_summary,
  f.numbered_posts_string as all_numbered_posts,
  f.number_of_posts
from combined_feedback f
left join detailed_summaries d
on f.feedback_start_date = d.feedback_start_date
and f.feedback_end_date = d.feedback_end_date
and f.sentiment_category = d.sentiment_category

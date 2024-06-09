-- this model will be where the weekly questions are stored. The purpose of the questions is to driver engagement and reward interaction


{{ config(materialized='table') }}

with combined_feedback as (
  select
    feedback_start_date,
    feedback_end_date
  from {{ ref('base_feedback_summary') }}
  group by feedback_start_date, feedback_end_date
),

detailed_summaries as (
  select
    feedback_start_date,
    feedback_end_date,
    open_ended_question
  from {{ ref('detailed_summary') }}
  group by feedback_start_date, feedback_end_date, open_ended_question
)

select
  f.feedback_start_date,
  f.feedback_end_date,
  d.open_ended_question
from combined_feedback f
left join detailed_summaries d
on f.feedback_start_date = d.feedback_start_date
and f.feedback_end_date = d.feedback_end_date
group by f.feedback_start_date, f.feedback_end_date, d.open_ended_question

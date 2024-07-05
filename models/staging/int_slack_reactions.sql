{{
  config(
    materialized='incremental',
    unique_key='id'
  )
}}

select
  id,
  event_time,
  reaction,
  api_app_id,
  enterprise_id,
  is_bot,
  is_enterprise_install,
  auth_team_id,
  auth_user_id,
  context_enterprise_id,
  context_team_id,
  event_ts,
  reaction_item_channel,
  reaction_item_ts,
  reaction_item_type,
  reaction_item_user,
  event_user,
  event_context,
  event_id,
  is_ext_shared_channel,
  team_id,
  token,
  type
from {{ ref('base_slack_events') }}
where reaction is not null

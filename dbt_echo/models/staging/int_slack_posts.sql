{{
  config(
    materialized='incremental',
    unique_key='id'
  )
}}

select
  id,
  event_time,
  api_app_id,
  enterprise_id,
  is_bot,
  is_enterprise_install,
  auth_team_id,
  auth_user_id,
  context_enterprise_id,
  context_team_id,
  event_ts,
  event_channel,
  event_channel_type,
  event_client_msg_id,
  event_text,
  event_type,
  event_user,
  event_context,
  event_id,
  is_ext_shared_channel,
  team_id,
  token,
  type
from {{ ref('base_slack_events') }}
where event_type = 'message'
  and event_parent_user_id is null
  and reaction is null
  and event_text is not null

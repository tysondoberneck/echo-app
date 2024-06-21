-- models/staging/base_slack_events.sql

{{
  config(
    materialized='incremental',
    on_schema_change="sync_all_columns",
    unique_key='ID'
  )
}}

with raw_events as (
  select
    "ID" as id,
    "EVENT_TIME" as event_time,
    parse_json("RAW_EVENT") as event
  from {{ source('echo_source', 'slack_events_raw') }}
)

select
  id,
  event_time,
  event:api_app_id as api_app_id,
  event:authorizations[0].enterprise_id as enterprise_id,
  event:authorizations[0].is_bot as is_bot,
  event:authorizations[0].is_enterprise_install as is_enterprise_install,
  event:authorizations[0].team_id as auth_team_id,
  event:authorizations[0].user_id as auth_user_id,
  event:context_enterprise_id as context_enterprise_id,
  event:context_team_id as context_team_id,
  event:event_ts as event_ts,
  event:channel as event_channel,
  event:channel_type as event_channel_type,
  event:client_msg_id as event_client_msg_id,
  event:text as event_text,
  event:type as event_type,
  event:user as event_user,
  event:parent_user_id as event_parent_user_id,
  event:thread_ts as event_thread_ts,
  event:item.channel as reaction_item_channel,
  event:item.ts as reaction_item_ts,
  event:item.type as reaction_item_type,
  event:item_user as reaction_item_user,
  event:reaction as reaction,
  event:event_context as event_context,
  event:event_id as event_id,
  event:is_ext_shared_channel as is_ext_shared_channel,
  event:team as team_id,
  event:token as token,
  event:type as type,
  event:bot_id as bot_id,
  -- New fields based on updated JSON structure
  event:blocks as blocks,
  event:blocks[0].block_id as block_id,
  event:blocks[0].elements[0].elements[0].text as block_text,
  event:blocks[0].elements[0].elements[0].type as block_text_type,
  event:text as anonymous_feedback_text,
  event:bot_profile.id as bot_profile_id,
  event:bot_profile.name as bot_profile_name,
  event:bot_profile.team_id as bot_profile_team_id,
  event:bot_profile.updated as bot_profile_updated,
from raw_events

{% if is_incremental() %}
  where event_time > (select max(event_time) from {{ this }})
{% endif %}

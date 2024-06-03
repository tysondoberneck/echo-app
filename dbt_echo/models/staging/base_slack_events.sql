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
  event:event.ts as event_ts,
  event:event.channel as event_channel,
  event:event.channel_type as event_channel_type,
  event:event.client_msg_id as event_client_msg_id,
  event:event.text as event_text,
  event:event.type as event_type,
  event:event.user as event_user,
  event:event.parent_user_id as event_parent_user_id,
  event:event.thread_ts as event_thread_ts,
  event:event.item.channel as reaction_item_channel,
  event:event.item.ts as reaction_item_ts,
  event:event.item.type as reaction_item_type,
  event:event.item_user as reaction_item_user,
  event:event.reaction as reaction,
  event:event_context as event_context,
  event:event_id as event_id,
  event:is_ext_shared_channel as is_ext_shared_channel,
  event:team_id as team_id,
  event:token as token,
  event:type as type
from raw_events

{% if is_incremental() %}
  where event_time > (select max(event_time) from {{ this }})
{% endif %}
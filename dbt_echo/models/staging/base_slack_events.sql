```sql
-- models/staging/base_slack_events.sql

{{
  config(
    materialized='incremental',
    on_schema_change='sync_columns',
    unique_key='id'
  )
}}

WITH raw_events AS (
  SELECT
    id,
    event_time,
    parse_json(event) AS event
  FROM {{ source('echo_source', 'slack_events_raw') }}
)

SELECT
  id,
  event_time,
  event:api_app_id AS api_app_id,
  event:authorizations[0].enterprise_id AS enterprise_id,
  event:authorizations[0].is_bot AS is_bot,
  event:authorizations[0].is_enterprise_install AS is_enterprise_install,
  event:authorizations[0].team_id AS auth_team_id,
  event:authorizations[0].user_id AS auth_user_id,
  event:context_enterprise_id AS context_enterprise_id,
  event:context_team_id AS context_team_id,
  event:event_ts AS event_ts,
  event:channel AS event_channel,
  event:channel_type AS event_channel_type,
  event:client_msg_id AS event_client_msg_id,
  regexp_replace(CAST(event:text AS varchar), '^Anonymous feedback: ', '') AS event_text,
  event:type AS event_type,
  event:user AS event_user,
  event:parent_user_id AS event_parent_user_id,
  event:thread_ts AS event_thread_ts,
  event:item.channel AS reaction_item_channel,
  event:item.ts AS reaction_item_ts,
  event:item.type AS reaction_item_type,
  event:item_user AS reaction_item_user,
  event:reaction AS reaction,
  event:event_context AS event_context,
  event:event_id AS event_id,
  event:is_ext_shared_channel AS is_ext_shared_channel,
  event:team AS team_id,
  event:token AS token,
  event:type AS type,
  event:bot_id AS bot_id,
  event:blocks AS blocks,
  event:blocks[0].block_id AS block_id,
  event:blocks[0].elements[0].elements[0].text AS block_text,
  event:blocks[0].elements[0].elements[0].type AS block_text_type,
  event:text AS anonymous_feedback_text,
  event:bot_profile.id AS bot_profile_id,
  event:bot_profile.name AS bot_profile_name,
  event:bot_profile.team_id AS bot_profile_team_id,
  event:bot_profile.updated AS bot_profile_updated
FROM raw_events

{% if is_incremental() %}
  WHERE event_time > (SELECT MAX(event_time) FROM {{ this }})
{% endif %}
```
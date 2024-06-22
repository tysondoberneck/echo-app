-- models/mart/mart_slack_thread_reconstruction.sql

{{
  config(
    materialized='table'
  )
}}

with posts as (
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
    cast(event_type as varchar) as event_type,
    event_user,
    event_context,
    event_id,
    is_ext_shared_channel,
    team_id,
    token,
    type,
    is_bot_post,
    md5(event_ts) as thread_id,
    null as parent_user_id,
    'post' as event_subtype
  from {{ ref('int_slack_posts') }}
),
replies as (
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
    cast('message' as varchar) as event_type,  -- Ensure event_type is present
    event_user,
    event_context,
    event_id,
    is_ext_shared_channel,
    team_id,
    token,
    type,
    null as is_bot_post,
    md5(event_thread_ts) as thread_id,
    event_parent_user_id as parent_user_id,
    'reply' as event_subtype
  from {{ ref('int_slack_replies') }}
),
reactions as (
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
    reaction_item_channel as event_channel,
    reaction_item_type as event_channel_type,
    null as event_client_msg_id,
    reaction as event_text,
    md5(cast('reaction_added' as varchar)) as event_type,  -- Ensure event_type is present
    event_user,
    event_context,
    event_id,
    is_ext_shared_channel,
    team_id,
    token,
    type,
    null as is_bot_post,
    md5(reaction_item_ts) as thread_id,  -- Ensure thread_id matches format in posts and replies
    reaction_item_user as parent_user_id,
    'reaction' as event_subtype
  from {{ ref('int_slack_reactions') }}
)

select * from posts
union all
select * from replies
union all
select * from reactions

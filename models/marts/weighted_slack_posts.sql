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
    cast('reaction_added' as varchar) as event_type,  -- Ensure event_type is present
    event_user,
    event_context,
    event_id,
    is_ext_shared_channel,
    team_id,
    token,
    type,
    null as is_bot_post,
    md5(reaction_item_ts) as thread_id,
    reaction_item_user as parent_user_id,
    'reaction' as event_subtype
  from {{ ref('int_slack_reactions') }}
),

-- Combine posts, replies, and reactions into one table
combined_events as (
  select * from posts
  union all
  select * from replies
  union all
  select * from reactions
),

-- Calculate weight for each post based on the number of replies and reactions in the thread
post_weights as (
  select
    p.id as post_id,
    p.event_text,
    p.event_time,
    p.api_app_id,
    p.enterprise_id,
    p.is_bot,
    p.is_enterprise_install,
    p.auth_team_id,
    p.auth_user_id,
    p.context_enterprise_id,
    p.context_team_id,
    p.event_ts,
    p.event_channel,
    p.event_channel_type,
    p.event_client_msg_id,
    p.event_type,
    p.event_user,
    p.event_context,
    p.event_id,
    p.is_ext_shared_channel,
    p.team_id,
    p.token,
    p.type,
    p.is_bot_post,
    p.thread_id,
    p.parent_user_id,
    p.event_subtype,
    coalesce(r.num_replies, 0) as num_replies,
    coalesce(re.num_reactions, 0) as num_reactions,
    1 + coalesce(r.num_replies, 0) * 0.5 + coalesce(re.num_reactions, 0) * 0.1 as weight  -- Calculate weight based on reactions and replies
  from posts p
  left join (
    select
      md5(event_thread_ts) as thread_id,
      count(*) as num_replies
    from {{ ref('int_slack_replies') }}
    group by md5(event_thread_ts)
  ) r on p.thread_id = r.thread_id
  left join (
    select
      md5(reaction_item_ts) as thread_id,
      count(*) as num_reactions
    from {{ ref('int_slack_reactions') }}
    group by md5(reaction_item_ts)
  ) re on p.thread_id = re.thread_id
)

select * from post_weights

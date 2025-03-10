```sql
-- models/mart/mart_slack_thread_reconstruction.sql

-- A scene of creation for the posts CTE
WITH posts AS (
    -- Selecting attributes for posts
    SELECT
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
        CAST(event_type AS VARCHAR) AS event_type,
        event_user,
        event_context,
        event_id,
        is_ext_shared_channel,
        team_id,
        token,
        type,
        is_bot_post,
        MD5(event_ts) AS thread_id,
        NULL AS parent_user_id,
        'post' AS event_subtype
    FROM int_slack_posts
),
-- A scene of creation for the replies CTE
replies AS (
    -- Selecting attributes for replies
    SELECT
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
        CAST('message' AS VARCHAR) AS event_type,
        event_user,
        event_context,
        event_id,
        is_ext_shared_channel,
        team_id,
        token,
        type,
        NULL AS is_bot_post,
        MD5(event_thread_ts) AS thread_id,
        event_parent_user_id AS parent_user_id,
        'reply' AS event_subtype
    FROM int_slack_replies
),
-- A scene of creation for the reactions CTE
reactions AS (
    -- Selecting attributes for reactions
    SELECT
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
        reaction_item_channel AS event_channel,
        reaction_item_type AS event_channel_type,
        NULL AS event_client_msg_id,
        reaction AS event_text,
        MD5(CAST('reaction_added' AS VARCHAR)) AS event_type,
        event_user,
        event_context,
        event_id,
        is_ext_shared_channel,
        team_id,
        token,
        type,
        NULL AS is_bot_post,
        MD5(reaction_item_ts) AS thread_id,
        reaction_item_user AS parent_user_id,
        'reaction' AS event_subtype
    FROM int_slack_reactions
)

-- Combining the results of posts, replies, and reactions
SELECT * FROM posts
UNION ALL
SELECT * FROM replies
UNION ALL
SELECT * FROM reactions;
```
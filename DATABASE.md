# ShadowPulse Database Documentation

## Overview

The ShadowPulse database is designed with "Open Privacy" in mind, minimizing personal data collection while enabling powerful community analytics.

## Schema

### Core Tables

#### `sp_users`

Tracks unique extension installations via pseudo-anonymous identities.

- **id** (`INT`, PK): Internal auto-increment ID.
- **public_id** (`VARCHAR(50)`, Unique): Publicly visible anonymous ID (e.g., "Silent-Phoenix-145"). Attribute to user/website.
- **uuid** (`VARCHAR(64)`, Unique): Secret restoration token. NOT public.
- **website_id** (`INT`, FK -> `sp_websites.id`, Default: 1): The website this user belongs to.
- **pulse_power** (`INT`, Default: 1): The user's voting weight (computed based on activity/rank).
- **created_at** (`TIMESTAMP`): When the user first installed/registered.
- **last_active** (`TIMESTAMP`): Last time the user interacted.
- **topic_views** (`INT UNSIGNED`): Total topics viewed by this user.
- **total_votes** (`INT UNSIGNED`): Total pulses cast by this user.

#### `sp_websites`

Defines supported websites (tenants).

- **id** (`INT`, PK): Website ID (e.g. 1 = bitcointalk.org).
- **domain** (`VARCHAR(255)`): Domain name.
- **base_url** (`VARCHAR(255)`): Root URL.
- **created_at** (`TIMESTAMP`): Creation time.

#### `sp_pulses`

Records individual "pulse" (like) actions on posts.

- **id** (`INT`, PK): Auto-increment ID.
- **voter_public_id** (`VARCHAR(50)`, FK -> `sp_users.public_id`): The anonymous voter.
- **topic_id** (`INT`): The ID of the topic containing the post.
- **msg_id** (`INT`): The specific post message ID.
- **pulse_power** (`INT`): The weight of the vote at the time it was cast.
- **created_at** (`TIMESTAMP`): When the vote occurred.

#### `sp_pulses_log`

Audit log for pulses (likely for debugging or historical verification).

- **id** (`BIGINT`, PK): Auto-increment ID.
- **voter_id** (`VARCHAR(50)`): The anonymous voter.
- **msg_id** (`INT`): The post message ID.
- **pulse_power** (`INT`, Default: 1): Power used.
- **timestamp** (`TIMESTAMP`): Time of action.

### Content Tracking

#### `sp_boards`

Stores metadata about forum boards.

- **board_id** (`INT`, PK): The Bitcointalk board ID.
- **name** (`VARCHAR(255)`): Board title.
- **last_updated** (`TIMESTAMP`): Last metadata update.

#### `sp_topics`

Stores metadata about specific topics/threads.

- **topic_id** (`INT`, PK): The Bitcointalk topic ID.
- **board_id** (`INT`): Parent board ID.
- **title** (`VARCHAR(255)`): Topic title.
- **author_name** (`VARCHAR(100)`): Topic creator's username.
- **last_updated** (`TIMESTAMP`): Last metadata update.

#### `sp_posts`

Stores metadata about specific posts that have received activity.

- **msg_id** (`INT`, PK): The Bitcointalk message ID.
- **topic_id** (`INT`): Parent topic ID.
- **title** (`VARCHAR(255)`): Post subject/title.
- **author_name** (`VARCHAR(100)`): Post author's username.
- **author_uid** (`INT`): Post author's user ID.
- **last_updated** (`TIMESTAMP`): Last metadata update.

### Analytics & Rankings

#### `sp_rankings`

Live rankings for users based on activity.

- **public_id** (`VARCHAR(50)`, PK, FK -> `sp_users.public_id`): The user.
- **topic_views** (`INT UNSIGNED`): Count of views.
- **view_rank** (`INT UNSIGNED`): Current rank by views.
- **total_votes** (`INT UNSIGNED`): Count of votes cast.
- **vote_rank** (`INT UNSIGNED`): Current rank by votes.
- **last_updated** (`TIMESTAMP`): Last calculation time.

#### `sp_weekly_rankings`

Historical snapshots of rankings per week.

- **id** (`BIGINT`, PK): Auto-increment ID.
- **week_start** (`DATE`): The start date of the week.
- **entity_type** (`ENUM`): 'user', 'post', 'topic', 'board', 'member'.
- **entity_id** (`VARCHAR(255)`): The ID of the entity being ranked.
- **rank_val** (`INT`): The numerical rank achieved.
- **metric_val** (`DECIMAL(10,2)`): The score/value for the rank.
- **unique_users** (`INT`): Count of unique users contributing to this metric (if applicable).
- **created_at** (`TIMESTAMP`): When this snapshot was taken.

### Aggregates

#### `sp_topic_views_daily`

Aggregated view counts per topic per day.

- **id** (`INT`, PK): Auto-increment ID.
- **topic_id** (`INT`): Topic ID.
- **view_date** (`DATE`): The date of the views.
- **view_count** (`INT`): Number of views on this date.
- **last_updated_at** (`TIMESTAMP`): Last update.
- _Unique Constraint_: (`topic_id`, `view_date`)

#### `sp_board_views_daily`

Aggregated view counts per board per day.

- **id** (`INT`, PK): Auto-increment ID.
- **board_id** (`INT`): Board ID.
- **view_date** (`DATE`): The date of the views.
- **view_count** (`INT`): Number of views on this date.
- **last_updated_at** (`TIMESTAMP`): Last update.
- _Unique Constraint_: (`board_id`, `view_date`)

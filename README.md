# ShadowPulse: Open Privacy & Data Transparency

## The "Shadow" Philosophy

ShadowPulse operates on a principle of **Open Privacy**. We believe in completely transparent data collection. While the extension works "in the shadows" to gather insights, our code is fully illuminated. We do not track personal browsing history, IP addresses, or login credentials. Your interactions are tied to a randomly generated, anonymous **Voter ID**.

## Verified Data Points

We have architected our codebase to make data extraction self-documenting. You don't have to guess what we are tracking. Just search for `// Data Point:` in our source code (`extension/scripts/main.js`) to see exactly where and what data is being touched.

### Code Verification

```javascript
// Data Point: Board ID from Breadcrumbs
meta.boardId = bMatch[1];

// Data Point: Topic ID and Name
const tMatch = href.match(/topic=(\d+)/);

// Data Point: Message ID
const msgMatch = href.match(/msg(\d+)/);
```

## Data Collection Manifesto

We strictly limit data collection to the minimum required for community analytics.

### 1. Board Index View

When you browse a board index (e.g., _Project Development_), we collect:

- **Board ID**: The numerical ID of the board (from breadcrumbs).
- **Board Title**: The name of the board.
- **Voter ID**: Your anonymous, randomly generated public ID.

### 2. Topic View

When you view a discussion thread, we collect:

- **Topic ID**: The numerical ID of the thread (from breadcrumbs).
- **Topic Title**: The title of the discussion.
- **Board Context**: The parent board of the topic.
- **Voter ID**: Your anonymous, randomly generated public ID.

### 3. Pulse Interaction (Per Post)

Collected only for the specific posts being processed for Pulse stats:

- **Message ID**: The unique ID of the post.
- **Post Author**: The public username and UID of the poster (for value attribution).
- **Post Subject**: The specific subject line of the individual post.

---

_Verified Anonymous. Verified Open Source._

## Performance: Zero Background Usage

**Active Tab Isolation:** ShadowPulse is strictly confined to your open Bitcointalk tabs. It performs a lightweight pulse check (every 2s) _only_ while you are actively viewing the forum. The moment you switch tabs or minimize the window, all extension activity pauses immediately—guaranteeing zero background resource usage.

## Update/Reload

If you are updating to a newer version, **do not remove the extension from Chrome**, or you will lose your generated Voter ID.

1.  **Close all open BitcoinTalk tabs**. (This prevents "Context Invalidated" errors).
2.  Download the new ZIP file and extract it.
3.  **Overwrite** the existing files in your `extension` folder with the new ones.
4.  Navigate to `chrome://extensions`.
5.  Find **ShadowPulse**.
6.  Click the **Reload** icon (circular arrow) in the bottom right of the card.
7.  Re-open BitcoinTalk.

## Fresh Installation

1.  **Download** the repository:

    - Click **Code** -> **Download ZIP** and extract it.
    - OR run `git clone https://github.com/mlawrence06-lab/ShadowPulse_V2.git`

2.  **Load the Extension**:
    - Open your Chromium-based browser (Chrome, Edge, Brave).
    - Navigate to `chrome://extensions`.
    - Enable **Developer mode** (toggle in the top right corner).
    - Click **Load unpacked**.
    - **CRITICAL:** Select the **`extension`** folder inside the directory you just downloaded. (Do not select the root folder).

## Directory Structure

- `extension/`: Contains the source code for the browser extension.

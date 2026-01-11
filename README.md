# ShadowPulse V2

ShadowPulse is a browser extension for BitcoinTalk.org that provides real-time "Pulse" tracking and reputation visualization.

## Performance: Zero Background Usage

**Active Tab Isolation:** ShadowPulse is strictly confined to your open Bitcointalk tabs. It performs a lightweight pulse check (every 2s) _only_ while you are actively viewing the forum. The moment you switch tabs or minimize the window, all extension activity pauses immediately—guaranteeing zero background resource usage.

## Installation

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

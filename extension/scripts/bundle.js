(function() {
"use strict";



// --- CONFIG ---
const CONFIG = {
    API_BASE_URL: "https://shadowpulse.live/api",
    STATS_URL: "https://shadowpulsev2.b-cdn.net/stats.json",
    POLLING_INTERVAL: 5000,
    FLASH_COOLDOWN: 5000,
    DEBUG: true
};

// --- UTILS ---
function spLog(...args) {
  const ts = new Date().toISOString();
  console.log("[ShadowPulse]", ts, ...args);
}

function spDebug(isDebug, ...args) {
  if (!isDebug) return;
  const ts = new Date().toISOString();
  const sysInfo = `[${navigator.platform} | ${navigator.userAgent} | ${window.location.href}]`;
  console.log("[ShadowPulse DEBUG]", ts, sysInfo, ...args);
  try {
      const message = args.map(a => (typeof a === 'object') ? JSON.stringify(a) : String(a)).join(" ");
      chrome.runtime.sendMessage({
          type: "SEND_DEBUG_LOG",
          payload: { message: message, system_info: sysInfo }
      });
  } catch (e) {}
}

function spError(...args) {
  const ts = new Date().toISOString();
  console.error("[ShadowPulse]", ts, ...args);
}

function createEl(tag, classes = [], attrs = {}) {
  const el = document.createElement(tag);
  if (typeof classes === "string") {
    if (classes) el.className = classes;
  } else if (Array.isArray(classes) && classes.length) {
    el.className = classes.join(" ");
  }
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

// --- WORDS ---
const WORDS = [
    // NATO / Phonetic
    "Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet", 
    "Kilo", "Lima", "Mike", "November", "Oscar", "Papa", "Quebec", "Romeo", "Sierra", "Tango", 
    "Uniform", "Victor", "Whiskey", "Xray", "Yankee", "Zulu",
    // Space & Cosmos
    "Nebula", "Star", "Planet", "Moon", "Comet", "Meteor", "Galaxy", "Orbit", "Gravity", "Rocket", 
    "Astro", "Cosmos", "Solar", "Lunar", "Void", "Abyss", "Horizon", "Zenith", "Nadir", "Apex",
    "Aurora", "Nova", "Pulsar", "Quasar", "Stellar", "Vortex", "Eclipse", "Solstice", "Equinox",
    "Constellation", "Asteroid", "Crater", "Vacuum", "Singularity", "Photon", "Spectrum", "Prism",
    // Tech & Cyber
    "Cyber", "Tech", "Data", "Code", "Link", "Node", "Block", "Chain", "Token", "Coin", 
    "Mine", "Hash", "Cloud", "Net", "Web", "Logic", "Input", "Output", "Signal", "Pulse",
    "Bit", "Byte", "Pixel", "Vector", "Matrix", "Grid", "Server", "Client", "Proxy", "Router",
    "Switch", "Kernel", "Shell", "Script", "Algo", "Cipher", "Crypto", "Key", "Lock", "Vault",
    "Drone", "Robot", "Mech", "Android", "Cyborg", "Bionic", "Quantum", "Nano", "Micro", "Macro",
    "Laser", "Beam", "Ray", "Radio", "Sonar", "Radar", "Wifi", "Sync", "Async", "Stream",
    // Elements & Nature
    "Fire", "Ice", "Wind", "Storm", "Thunder", "Bolt", "Spark", "Flash", "Flame", "Blaze",
    "Frost", "Snow", "Rain", "Mist", "Fog", "Haze", "Dew", "Drop", "Wave", "Tide",
    "Ocean", "Sea", "River", "Lake", "Pond", "Stream", "Creek", "Brook", "Spring", "Well",
    "Earth", "Rock", "Stone", "Sand", "Dust", "Mud", "Clay", "Iron", "Steel", "Metal",
    "Gold", "Silver", "Copper", "Bronze", "Brass", "Zinc", "Tin", "Lead", "Mercury", "Chrome",
    "Carbon", "Neon", "Argon", "Xenon", "Helium", "Oxygen", "Nitrogen", "Hydrogen", "Plasma",
    "Crystal", "Gem", "Jewel", "Diamond", "Ruby", "Emerald", "Sapphire", "Opal", "Topaz", "Jade",
    "Onyx", "Pearl", "Coral", "Amber", "Quartz", "Granite", "Marble", "Slate", "Basalt", "Magma",
    "Lava", "Ash", "Smoke", "Steam", "Gas", "Vapor", "Fume", "Smog", "Soot", "Char",
    // Animals & Creatures
    "Wolf", "Bear", "Lion", "Tiger", "Fox", "Hawk", "Eagle", "Falcon", "Owl", "Raven",
    "Crow", "Shark", "Whale", "Dolphin", "Orca", "Seal", "Otter", "Crab", "Lobster", "Squid",
    "Octopus", "Jelly", "Fish", "Snake", "Viper", "Cobra", "Python", "Boa", "Lizard", "Gecko",
    "Turtle", "Frog", "Toad", "Newt", "Salamander", "Dragon", "Wyvern", "Drake", "Griffin", "Phoenix",
    "Hydra", "Titan", "Giant", "Troll", "Goblin", "Elf", "Dwarf", "Orc", "Mage", "Wizard",
    "Witch", "Druid", "Rogue", "Bard", "Cleric", "Paladin", "Knight", "Warrior", "Hunter", "Scout",
    // Abstract & Concepts
    "Time", "Space", "Life", "Death", "Soul", "Spirit", "Mind", "Body", "Heart", "Brain",
    "Thought", "Idea", "Dream", "Hope", "Fear", "Love", "Hate", "Joy", "Pain", "Rage",
    "Fury", "Calm", "Peace", "War", "Chaos", "Order", "Law", "Rule", "Fate", "Destiny",
    "Luck", "Chance", "Risk", "Reward", "Game", "Play", "Work", "Rest", "Sleep", "Wake",
    "Day", "Night", "Dawn", "Dusk", "Noon", "Midnight", "Hour", "Minute", "Second", "Moment",
    "Era", "Age", "Epoch", "Cycle", "Loop", "Phase", "Stage", "Level", "Zone", "Area",
    "Region", "Sector", "Field", "Domain", "Realm", "World", "Land", "Map", "Chart", "Graph",
    // Colors & Light
    "Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Violet", "Indigo", "Cyan", "Teal",
    "Lime", "Pink", "Rose", "Magenta", "Maroon", "Navy", "Azure", "Sky", "Aqua", "Turquoise",
    "White", "Black", "Gray", "Grey", "Dark", "Light", "Bright", "Dim", "Shadow", "Shade",
    "Ghost", "Phantom", "Specter", "Wraith", "Spirit", "Demon", "Angel", "Saint", "Sinner", "God",
    // Objects & Tools
    "Hammer", "Axe", "Sword", "Shield", "Spear", "Bow", "Arrow", "Dagger", "Knife", "Blade",
    "Wand", "Staff", "Rod", "Orb", "Ring", "Amulet", "Chains", "Rope", "Wire", "Cable",
    "Gear", "Cog", "Wheel", "Lever", "Pulley", "Screw", "Nail", "Bolt", "Nut", "Wrench",
    "Drill", "Saw", "File", "Chisel", "Plane", "Clamp", "Vise", "Anvil", "Forge", "Smelter",
    // Architecture & Places
    "City", "Town", "Village", "Hamlet", "Camp", "Base", "Fort", "Keep", "Castle", "Tower",
    "Spire", "Dome", "Vault", "Crypt", "Tomb", "Grave", "Shrine", "Altar", "Temple", "Church",
    "Bridge", "Gate", "Door", "Wall", "Floor", "Roof", "Window", "Room", "Hall", "Corridor",
    "Street", "Road", "Path", "Track", "Trail", "Way", "Route", "Lane", "Alley", "Avenue",
    // Verbs/Actions (as nouns or continuous)
    "Run", "Walk", "Jump", "Fly", "Swim", "Dive", "Climb", "Fall", "Rise", "Spin",
    "Turn", "Twist", "Bend", "Break", "Fix", "Mend", "Build", "Make", "Create", "Destroy",
    "Seek", "Find", "Lost", "Found", "Hide", "Hunt", "Chase", "Race", "Win", "Lose",
    // Misc Cool Words
    "Ace", "Joker", "King", "Queen", "Jack", "Ten", "Nine", "Eight", "Seven", "Six",
    "Five", "Four", "Three", "Two", "One", "Zero", "Null", "Nil", "None", "All",
    "Alpha", "Omega", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota",
    "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi", "Rho", "Sigma", "Tau",
    "Upsilon", "Phi", "Chi", "Psi", "Omega", "Infinity", "Eternity", "Forever", "Always", "Never",
    "Limit", "Bound", "Edge", "Rim", "Margin", "Border", "Line", "Point", "Dot", "Spot",
    "Mark", "Sign", "Sigil", "Rune", "Glyph", "Symbol", "Icon", "Logo", "Badge", "Crest",
    "Flag", "Banner", "Standard", "Emblem", "Totem", "Idol", "Relic", "Artifact", "Device", "Machine",
    "Engine", "Motor", "Drive", "Power", "Force", "Energy", "Mass", "Speed", "Velocity", "Accel",
    "Momentum", "Inertia", "Friction", "Drag", "Lift", "Thrust", "Torque", "Tension", "Stress", "Strain",
    "Pressure", "Heat", "Cold", "Temp", "Volt", "Amp", "Watt", "Ohm", "Hertz", "Joule",
    "Newton", "Gram", "Meter", "Liter", "Second", "Byte", "Bit", "Pixel", "Voxel", "Frame",
    "Scene", "Shot", "Cut", "Take", "Roll", "Act", "Play", "Show", "Cast", "Crew",
    // (Approx 450+ words here. Start combining them for ~202,500 pairs)
];

function generateRandomId() {
    const w1 = WORDS[Math.floor(Math.random() * WORDS.length)];
    const w2 = WORDS[Math.floor(Math.random() * WORDS.length)];
    const w3 = WORDS[Math.floor(Math.random() * WORDS.length)];
    const num = Math.floor(Math.random() * 100); // 0-99
    const suffix = num.toString().padStart(2, '0');
    
    return `${w1}-${w2}-${w3}-${suffix}`;
}

// --- UI ---



// --- Logo States (Pixel Perfect Strings) ---
const SP_LOGO_SVG = `
<svg viewBox="0 0 100 100" class="sp-std-logo">
    <defs>
        <linearGradient id="sp_logo_grad_float" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
        </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#sp_logo_grad_float)" />
    <text x="50" y="66" font-family="Arial, sans-serif" font-weight="800" font-size="42" text-anchor="middle" fill="white" style="pointer-events:none;">SP</text>
</svg>`;

const BTC_LOGO_SVG = `
<svg viewBox="0 0 100 100" class="sp-std-logo">
    <defs>
        <linearGradient id="sp_logo_grad_btc" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
        </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#sp_logo_grad_btc)" />
    <text x="50" y="70" font-family="sans-serif" font-weight="bold" font-size="56" text-anchor="middle" fill="#f7931a" style="pointer-events:none;">₿</text>
</svg>`;

let currentLogoState = 'SP';

function setLogoState(isBtc) {
    const container = document.getElementById('sp-logo-container');
    const newState = isBtc ? 'BTC' : 'SP';
    
    if (container && currentLogoState !== newState) {
        currentLogoState = newState;
        container.innerHTML = isBtc ? BTC_LOGO_SVG : SP_LOGO_SVG;
        
        // Update Title/Cursor behavior
        const zone = document.getElementById('sp-logo-zone');
        if (zone) {
            zone.title = isBtc ? "Click to CLAIM BTC!" : "Open Settings";
            zone.style.cursor = "pointer";
            if (isBtc) {
                zone.classList.add('sp-flash');
            } else {
                zone.classList.remove('sp-flash');
                container.innerHTML = SP_LOGO_SVG; // Ensure reset
            }
        }
    } else if (container && !isBtc && currentLogoState === 'BTC') {
        // Fallback: If logic says NOT BTC but state thinks it is, force reset
        currentLogoState = 'SP';
        container.innerHTML = SP_LOGO_SVG;
    }
}

function openSettingsModal() {
    let backdrop = document.getElementById('sp-settings-root');
    if (backdrop) {
        backdrop.classList.toggle('sp-settings-open');
        // If we just OPENED it, refresh stats
        if (backdrop.classList.contains('sp-settings-open') && typeof window.spUpdateStats === 'function') {
            window.spUpdateStats();
        }
        return;
    }

    backdrop = createEl('div', ['sp-settings-backdrop']);
    backdrop.id = 'sp-settings-root';
    const version = chrome.runtime.getManifest().version;

    // Construct Modal HTML
    backdrop.innerHTML = `
        <div class="sp-settings-modal" id="sp-settings-window">
            <div class="sp-settings-header" id="sp-settings-drag-handle" style="cursor:move;">
                <div class="sp-settings-header-logo" style="margin-right:12px;">
                    <!-- Inline SP Logo -->
                    <svg width="48" height="48" viewBox="0 0 100 100" class="sp-logo-pulse">
                        <defs>
                            <linearGradient id="sp_logo_grad_set" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <circle cx="50" cy="50" r="48" fill="url(#sp_logo_grad_set)" />
                        <text x="50" y="66" font-family="Arial, sans-serif" font-weight="800" font-size="42" text-anchor="middle" fill="white" style="pointer-events:none;">SP</text>
                    </svg>
                </div>
                <div>
                   <div class="sp-settings-title">ShadowPulse</div>
                   <div style="font-size:12px; color:var(--sp-text-soft);">Version ${version}</div>
                </div>
                <div class="sp-settings-close" style="margin-left:auto; padding:0 8px;">×</div>
            </div>
            
            <div class="sp-settings-body">
                
                <!-- Theme -->
                <div class="sp-settings-row">
                    <label>Theme</label>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <a href="#" id="sp-theme-customize-link" class="sp-link" style="font-size:11px; color:var(--sp-accent);">Customize</a>
                        <select id="sp-theme-select" style="width:80px;">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                </div>



                <!-- Show Graph -->
                <div class="sp-settings-row">
                    <label>Show Graph</label>
                    <select id="sp-show-graph-select">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>

                <!-- Bitcoin Source -->
                <div class="sp-settings-row" id="sp-btc-row">
                    <label>Bitcoin Source</label>
                    <select id="sp-btc-select">
                        <option value="binance">Binance</option>
                    </select>
                </div>

                <!-- Show +Pulse -->
                <div class="sp-settings-row">
                    <label>Show +Pulse</label>
                    <select id="sp-show-pulse-select">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>

                <!-- Flash Logo -->
                <div class="sp-settings-row">
                    <label>Flash Logo</label>
                    <select id="sp-flash-logo-select">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>

                <!-- Display Name -->
                <div class="sp-settings-row">
                    <label>Display Name</label>
                    <div style="display:flex; gap:4px; align-items:center;">
                        <input type="text" id="sp-name-input" name="sp_user_id_field" autocomplete="off" data-lpignore="true" data-1p-ignore data-form-type="other" placeholder="User ID" style="width:180px; text-align:right;" />
                        <button id="sp-name-submit" style="width:24px; height:24px; padding:0; cursor:pointer;" disabled>✓</button>
                    </div>
                </div>

                <!-- Statistics Area -->
                <div class="sp-section-title">Statistics</div>
                <div class="sp-settings-row">
                     <span>Pulse Power:</span>
                     <div style="display:flex; align-items:center; gap:8px;">
                        <a href="#" id="sp-upgrade-link" class="sp-link" target="_blank" style="font-size:11px; color:#22c55e; font-weight:bold; display:none; animation: sp-pulse 2s infinite;">UPGRADE</a>
                        <span class="sp-stat-value" id="sp-stat-power">\u2014</span>
                     </div>
                </div>
                <div class="sp-settings-row">
                     <span>Topic Views:</span>
                     <span class="sp-stat-value" id="sp-stat-views">\u2014</span>
                </div>
                <div class="sp-settings-row">
                     <span>Vote Pulses:</span>
                     <span class="sp-stat-value" id="sp-stat-votes">\u2014</span>
                </div>

                <div class="sp-settings-row" style="justify-content:center; margin-top:8px;">
                     <a href="https://shadowpulse.live/reports/" target="_blank" class="sp-link">Report Center</a>
                </div>

                <hr class="sp-sep" />
                
                <!-- Account Security -->
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="sp-section-title" style="border:none; margin:0;">Account Security</div>
                    <button id="sp-security-toggle" style="font-size:10px; cursor:pointer; background:none; border:1px solid var(--sp-border); color:var(--sp-text-soft); padding:0 4px;">SHOW</button>
                </div>
                <div id="sp-security-block" style="display:none; flex-direction:column; gap:4px; margin-top:8px;">
                    
                    <!-- Restore Code Display -->
                    <div style="margin-top:2px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                            <div class="sp-settings-label-block" style="margin:0;">Private Restore Code:</div>
                            
                            <!-- Copy Icon Button -->
                            <button id="sp-copy-btn" title="Copy to Clipboard" style="background:none; border:none; cursor:pointer; color:var(--sp-text-soft); padding:4px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="sp-settings-input-group" style="margin-bottom:0;">
                             <div class="sp-settings-restore-code" id="sp-code-display" style="background:var(--sp-bg); border-color:var(--sp-accent); color:var(--sp-accent);">...</div>
                        </div>
                    </div>

                    <!-- Restore Code Saved Dropdown -->
                    <div class="sp-settings-row">
                        <span>Code Saved?</span>
                        <select id="sp-ack-select" style="width:80px;">
                            <option value="false">Not Yet</option>
                            <option value="true">Saved!</option>
                        </select>
                    </div>
                    
                    <div class="sp-settings-warning" id="sp-restore-warning" style="display:none; color:#ef4444; font-size:11px; text-align:center; margin-top:4px;">
                        \u26A0  This will overwrite all your Settings and Statistics!
                    </div>
                    
                    <!-- Inline Restore Area (Flush Right GO) -->
                    <div class="sp-settings-row" style="margin-top:4px; display:flex;">
                        <span style="margin-right:4px;">Restore:</span>
                        <div class="sp-settings-input-group" style="margin:0; flex:1; display:flex;">
                            <input type="text" id="sp-restore-input" name="sp_restore_code_field" autocomplete="off" data-lpignore="true" data-1p-ignore data-form-type="other" placeholder="Paste code" style="flex:1; width:0;" /> 
                            <button id="sp-restore-btn" class="sp-text-btn">GO</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(backdrop);
    setTimeout(() => backdrop.classList.add('sp-settings-open'), 10);

    // --- Modal Drag Logic ---
    const modal = backdrop.querySelector('#sp-settings-window');
    const handle = backdrop.querySelector('#sp-settings-drag-handle');
    
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    const getClientCoords = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const onDragStart = (e) => {
        if(e.target.closest('.sp-settings-close')) return;
        isDragging = true;
        const coords = getClientCoords(e);
        startX = coords.x;
        startY = coords.y;
        if(e.type === 'touchstart') e.preventDefault();

        const rect = modal.getBoundingClientRect();
        modal.style.position = 'absolute';
        modal.style.left = rect.left + 'px';
        modal.style.top = rect.top + 'px';
        modal.style.transform = 'none'; 
        
        initialLeft = rect.left;
        initialTop = rect.top;
        handle.style.cursor = 'grabbing';
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        e.preventDefault(); 
        const coords = getClientCoords(e);
        const dx = coords.x - startX;
        const dy = coords.y - startY;
        modal.style.left = (initialLeft + dx) + 'px';
        modal.style.top = (initialTop + dy) + 'px';
    };

    const onDragEnd = () => {
        isDragging = false;
        handle.style.cursor = 'move';
    };

    handle.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    handle.addEventListener('touchstart', onDragStart, {passive: false});
    window.addEventListener('touchmove', onDragMove, {passive: false});
    window.addEventListener('touchend', onDragEnd);

    implementSettingsLogic(backdrop);
    
    // --- Stats Refresh Logic ---
    const refreshStats = () => {
        chrome.storage.local.get(['sp_public_id', 'sp_uuid'], res => {
            const pid = res.sp_public_id;
            const uuid = res.sp_uuid;
            
            if(!pid) return;

            chrome.runtime.sendMessage({ 
                type: "GET_USER_STATS", 
                payload: { voter_id: pid } 
            }, response => {
                if (response && response.success && response.data && response.data.data) {
                    const d = response.data.data;
                    
                    // Update Views & Votes (Existing)
                    const viewEl = backdrop.querySelector('#sp-stat-views');
                    const voteEl = backdrop.querySelector('#sp-stat-votes');
                    if(viewEl) viewEl.textContent = d.view_rank !== '—' ? `${d.topic_views} (#${d.view_rank})` : d.topic_views;
                    if(voteEl) voteEl.textContent = d.rank !== '—' ? `${d.vote_pulses} (#${d.rank})` : d.vote_pulses;

                    // Update Pulse Power (New)
                    const powEl = backdrop.querySelector('#sp-stat-power');
                    const upLink = backdrop.querySelector('#sp-upgrade-link');
                    
                    if(powEl && d.pulse_power) {
                        powEl.textContent = parseFloat(d.pulse_power).toFixed(2);
                    }
                    
                    if(upLink && d.available_upgrades > 0 && uuid) {
                        upLink.style.display = 'flex';
                        upLink.href = `https://shadowpulse.live/reports/upgrade.php?id=${uuid}`;
                    } else if (upLink) {
                        upLink.style.display = 'none';
                    }
                }
            });
        });
    };

    refreshStats();
    window.spUpdateStats = refreshStats;
}

function applyThemeLogic(themeMode) {
    document.body.removeAttribute('style'); 
    document.documentElement.setAttribute('data-sp-theme', themeMode);
    localStorage.setItem('sp_theme_sync', themeMode);

    const storageKey = `sp_custom_${themeMode}`;
    
    chrome.storage.local.get([storageKey], (res) => {
        const customObj = res[storageKey];
        if (customObj) {
            Object.keys(customObj).forEach(key => {
                 const varName = key.startsWith('--') ? key : `--sp-forum-${key.replace('_','-')}`;
                 document.body.style.setProperty(varName, customObj[key]);
            });
            document.documentElement.setAttribute('data-sp-theme', 'custom');
        }
    });
}

function implementSettingsLogic(backdrop) {
    const closeBtn = backdrop.querySelector('.sp-settings-close');
    const close = () => backdrop.classList.remove('sp-settings-open');
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', e => { if(e.target === backdrop) close(); });
    
    closeBtn.style.fontSize = "20px";
    closeBtn.style.fontWeight = "bold";
    closeBtn.style.lineHeight = "1";
    closeBtn.style.cursor = "pointer";
    closeBtn.title = "Close";

    const themeSel = backdrop.querySelector('#sp-theme-select');
    const custLink = backdrop.querySelector('#sp-theme-customize-link');
    
    if (custLink) {
        custLink.addEventListener('click', (e) => {
             e.preventDefault();
             e.stopPropagation();
             openThemeEditor();
        });
    }

    const graphSel = backdrop.querySelector('#sp-show-graph-select');
    const btcRow = backdrop.querySelector('#sp-btc-row');
    const btcSel = backdrop.querySelector('#sp-btc-select');
    const pulseSel = backdrop.querySelector('#sp-show-pulse-select');
    const flashSel = backdrop.querySelector('#sp-flash-logo-select');

    chrome.storage.local.get(['sp_theme', 'sp_btc_source', 'sp_show_graph', 'sp_show_pulse', 'sp_flash_logo'], res => {
        let theme = res.sp_theme || 'light';
        if (theme === 'custom') theme = 'dark'; 
        themeSel.value = theme;
        
        const showGraph = res.sp_show_graph !== false; 
        graphSel.value = showGraph ? "true" : "false";
        btcRow.style.display = showGraph ? 'flex' : 'none';

        btcSel.value = res.sp_btc_source || 'binance';
        pulseSel.value = (res.sp_show_pulse !== false) ? "true" : "false";
        flashSel.value = (res.sp_flash_logo !== false) ? "true" : "false";
    });

    themeSel.addEventListener('change', (e) => {
        const val = e.target.value;
        chrome.storage.local.set({ sp_theme: val });
        applyThemeLogic(val);
    });
    
    graphSel.addEventListener('change', (e) => {
        const isShow = e.target.value === 'true';
        chrome.storage.local.set({ sp_show_graph: isShow });
        btcRow.style.display = isShow ? 'flex' : 'none';
        const graphZone = document.getElementById('sp-stats-zone');
        if (graphZone) graphZone.style.display = isShow ? 'flex' : 'none';
    });

    btcSel.addEventListener('change', (e) => {
        chrome.storage.local.set({ sp_btc_source: e.target.value });
    });

    pulseSel.addEventListener('change', (e) => {
        chrome.storage.local.set({ sp_show_pulse: e.target.value === 'true' });
    });

    flashSel.addEventListener('change', (e) => {
        chrome.storage.local.set({ sp_flash_logo: e.target.value === 'true' });
    });

    const nameInp = backdrop.querySelector('#sp-name-input');
    const nameBtn = backdrop.querySelector('#sp-name-submit');
    
    chrome.storage.local.get(['custom_name', 'sp_public_id'], res => {
        nameInp.value = res.custom_name || res.sp_public_id || "";
    });

    const codeDisp = backdrop.querySelector('#sp-code-display');
    chrome.storage.local.get(['sp_uuid'], res => {
        if (res.sp_uuid) {
            codeDisp.textContent = res.sp_uuid;
        } else {
            codeDisp.textContent = "N/A - Restart Extension";
        }
    });

    const copyBtn = backdrop.querySelector('#sp-copy-btn');
    copyBtn.addEventListener('click', () => {
        const txt = codeDisp.textContent;
        if(txt && txt !== '...') {
            navigator.clipboard.writeText(txt).then(() => {
                const svg = copyBtn.innerHTML;
                copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => copyBtn.innerHTML = svg, 1500);
            });
        }
    });
    
    const resInp = backdrop.querySelector('#sp-restore-input');
    const resWarn = backdrop.querySelector('#sp-restore-warning');

    // --- PASSWORD MANAGER FIX ---
    [nameInp, resInp].forEach(input => {
        if(!input) return;
        input.addEventListener('keydown', (e) => e.stopPropagation());
        input.addEventListener('keyup', (e) => e.stopPropagation());
        input.addEventListener('keypress', (e) => e.stopPropagation());
        input.addEventListener('focus', (e) => e.stopPropagation());
        input.addEventListener('click', (e) => e.stopPropagation());
        input.addEventListener('mousedown', (e) => e.stopPropagation());
    });
    // ----------------------------

    resInp.addEventListener('input', () => {
        resWarn.style.display = resInp.value.trim().length > 0 ? 'block' : 'none';
    });
    
    const restoreBtn = backdrop.querySelector('#sp-restore-btn');
    restoreBtn.addEventListener('click', async () => {
        const code = resInp.value.trim();
        if(code) {
            restoreBtn.textContent = 'Syncing...';
            restoreBtn.disabled = true;
            
            chrome.runtime.sendMessage({ 
                type: "RECOVER_IDENTITY", 
                uuid: code 
            }, response => {
                if (response && response.success && response.data.status === 'success') {
                    chrome.storage.local.set({ 
                        sp_uuid: code,
                        sp_public_id: response.data.data.public_id 
                    }, () => {
                        restoreBtn.textContent = 'Success!';
                        setTimeout(() => window.location.reload(), 500);
                    });
                } else {
                    const errMsg = (response && response.data && response.data.message) 
                        ? response.data.message 
                        : (response && response.error) ? response.error : "Unknown Error";
                    alert("Sync Failed: " + errMsg);
                    restoreBtn.textContent = 'GO';
                    restoreBtn.disabled = false;
                }
            });
        }
    });

    nameInp.addEventListener('input', () => {
        const val = nameInp.value.trim();
        const isValid = /^[a-zA-Z0-9 _-]*$/.test(val);
        if(!isValid) {
            nameInp.style.borderColor = 'red';
            nameInp.title = "Only alphanumeric, spaces, dashes, underscores.";
            nameBtn.disabled = true;
        } else {
            nameInp.style.borderColor = '';
            nameInp.title = '';
            nameBtn.disabled = false;
        }
    });

    nameBtn.addEventListener('click', () => {
        const val = nameInp.value.trim();
        if (!val) return;
        
        const originalText = nameBtn.textContent;
        nameBtn.textContent = "...";
        nameBtn.disabled = true;

        chrome.storage.local.get(['sp_uuid'], res => {
            const uuid = res.sp_uuid;
            
            // Call API
            const params = new URLSearchParams();
            params.append('public_id', val);
            params.append('uuid', uuid);

            fetch(`${CONFIG.API_BASE_URL}/register_identity.php`, {
                method: 'POST',
                body: params
            })
            .then(r => r.json())
            .then(data => {
                if (data.status === 'success') {
                    // Success!
                    chrome.storage.local.set({ custom_name: val, sp_public_id: val });
                    nameInp.style.borderColor = '#28a745';
                    nameBtn.textContent = "OK";
                    setTimeout(() => {
                        nameBtn.textContent = originalText;
                        nameInp.style.borderColor = '';
                        nameBtn.disabled = false;
                    }, 2000);
                } else {
                    // Fail - Shake Effect
                    nameInp.classList.add('sp-flash-error');
                    nameInp.style.borderColor = 'red';
                    // User Request: No "TAKEN", just Red X.
                    nameBtn.innerHTML = '<span style="color:#ef4444; font-weight:bold; font-size:16px;">\u2716</span>';
                    
                    // Remove shake class after animation
                    setTimeout(() => {
                        nameInp.classList.remove('sp-flash-error');
                        nameBtn.textContent = originalText;
                        nameBtn.disabled = false;
                    }, 1500);
                }
            })
            .catch(err => {
                nameInp.classList.add('sp-flash-error');
                nameBtn.innerHTML = '<span style="color:#ef4444; font-weight:bold; font-size:16px;">\u2716</span>';
                 setTimeout(() => {
                    nameInp.classList.remove('sp-flash-error');
                    nameBtn.textContent = originalText;
                    nameBtn.disabled = false;
                }, 1500);
            });
        });
    });

    const secBlock = backdrop.querySelector('#sp-security-block');
    const secToggle = backdrop.querySelector('#sp-security-toggle');
    const ackSel = backdrop.querySelector('#sp-ack-select');
    
    chrome.storage.local.get(['memberRestoreAck'], res => {
        const isAck = !!res.memberRestoreAck;
        if(!isAck) {
             secToggle.classList.add('sp-flash-10s');
        } else {
             secToggle.classList.remove('sp-flash-10s');
        }
        ackSel.value = isAck ? "true" : "false";
    });

    secToggle.addEventListener('click', () => {
        const isHidden = secBlock.style.display === 'none';
        secBlock.style.display = isHidden ? 'flex' : 'none';
        secToggle.textContent = isHidden ? 'HIDE' : 'SHOW';
    });
    
    ackSel.addEventListener('change', (e) => {
        const isAck = e.target.value === 'true';
        chrome.storage.local.set({ memberRestoreAck: isAck });
        if(isAck) {
            secToggle.classList.remove('sp-flash-10s');
        } else {
            secToggle.classList.add('sp-flash-10s');
        }
    });

    window.spUpdateStats = () => {
        chrome.storage.local.get(['sp_public_id'], res => {
            if (res.sp_public_id) {
                chrome.runtime.sendMessage({
                    type: "GET_USER_STATS",
                    payload: { voter_id: res.sp_public_id }
                }, response => {
                    if (response && response.success) {
                        const d = response.data.data;
                        if (d) {
                             const viewsEl = backdrop.querySelector('#sp-stat-views');
                             if(viewsEl) viewsEl.textContent = d.topic_views + " (Rank: " + d.view_rank + ")";
                             
                             const votesEl = backdrop.querySelector('#sp-stat-votes');
                             if(votesEl) votesEl.textContent = d.vote_pulses + " (Rank: " + d.rank + ")";
                        }
                    }
                });
            }
        });
    };

    window.spUpdateStats();
}

async function getState(key, def) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (res) => {
            resolve(res[key] !== undefined ? res[key] : def);
        });
    });
}
async function setState(key, val) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: val }, resolve);
    });
}

// --- Floating Bar ---
function injectFloatingBar() {
    chrome.storage.local.get(['sp_theme'], res => {
        document.body.setAttribute('data-sp-theme', res.sp_theme || 'light');
    });

    if (document.getElementById('sp-floating-bar-root')) return;

    const bar = createEl('div', ['sp-floating-bar']);
    bar.id = 'sp-floating-bar-root';
    
    bar.innerHTML = `
        <div class="sp-bar-content">
            <div class="sp-zone-logo" id="sp-logo-zone" title="Open Settings">
                <div class="sp-logo-circle" id="sp-logo-container">
                    ${SP_LOGO_SVG}
                </div>
            </div>
            
            <div class="sp-zone-stats" id="sp-stats-zone">
                 <div class="sp-stats-price">&nbsp;</div>
                 <div class="sp-stats-graph"></div>
            </div>
        </div>
    `;

    document.body.appendChild(bar);

    // --- Robust Drag Logic ---
    let isDragging = false;
    let hasMoved = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let startX = 0;
    let startY = 0;

    chrome.storage.local.get(['sp_bar_pos'], res => {
        if (res.sp_bar_pos) {
            bar.style.left = res.sp_bar_pos.left;
            bar.style.top = res.sp_bar_pos.top;
            bar.style.bottom = 'auto'; 
            bar.style.right = 'auto'; 
            
            const rect = bar.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;
            
            if (rect.right > winW) bar.style.left = (winW - rect.width - 20) + 'px';
            if (rect.bottom > winH) bar.style.top = (winH - rect.height - 20) + 'px';
            if (parseFloat(bar.style.left) < 0) bar.style.left = '20px';
            if (parseFloat(bar.style.top) < 0) bar.style.top = '20px';
            
        } else {
             const initRect = bar.getBoundingClientRect();
             bar.style.bottom = 'auto'; 
             bar.style.right = 'auto'; 
             bar.style.left = initRect.left + 'px';
             bar.style.top = initRect.top + 'px';
        }
    });

    const getClientCoords = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const onDragStart = (e) => {
        if(e.target.closest('.sp-settings-close')) return;
        isDragging = true;
        hasMoved = false;
        
        const coords = getClientCoords(e);
        startX = coords.x;
        startY = coords.y;
        
        if(e.type === 'mousedown') e.preventDefault(); 
        
        const rect = bar.getBoundingClientRect();
        dragOffsetX = coords.x - rect.left;
        dragOffsetY = coords.y - rect.top;
        
        bar.classList.add('dragging');
        document.body.classList.add('sp-dragging');
        
        // Dynamically add listeners ONLY during drag
        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('mouseup', onDragEnd);
        window.addEventListener('touchmove', onDragMove, {passive: false});
        window.addEventListener('touchend', onDragEnd);
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        
        if(e.type === 'touchmove') e.preventDefault(); 
        if(e.type === 'mousemove') e.preventDefault();

        const coords = getClientCoords(e);
        const dx = Math.abs(coords.x - startX);
        const dy = Math.abs(coords.y - startY);
        if (dx > 3 || dy > 3) {
            hasMoved = true;
        }

        let newX = coords.x - dragOffsetX;
        let newY = coords.y - dragOffsetY;

        const maxW = window.innerWidth - bar.offsetWidth;
        const maxH = window.innerHeight - bar.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, maxW));
        newY = Math.max(0, Math.min(newY, maxH));

        bar.style.left = newX + 'px';
        bar.style.top = newY + 'px';
    };

    const onDragEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        bar.classList.remove('dragging');
        document.body.classList.remove('sp-dragging');
        
        // Cleanup listeners
        window.removeEventListener('mousemove', onDragMove);
        window.removeEventListener('mouseup', onDragEnd);
        window.removeEventListener('touchmove', onDragMove);
        window.removeEventListener('touchend', onDragEnd);
        
        if (hasMoved) {
            chrome.storage.local.set({ 
                sp_bar_pos: { left: bar.style.left, top: bar.style.top } 
            });
        }
        
        // Handle "Click" on Logo here (Ghost Click Prevention)
        if (!hasMoved && e.target.closest('#sp-logo-zone')) {
             if (e.type === 'touchend') e.preventDefault();
             
             // LOGO HANDLER: Check if BTC or Settings
             const logoZone = document.getElementById('sp-logo-zone');
             // We can check title, or currentLogoState if we 
             // but title is set by setLogoState effectively.
             if (logoZone && logoZone.title && logoZone.title.includes("CLAIM")) {
                 chrome.storage.local.get(['sp_public_id', 'sp_uuid'], res => {
                     const claimUrl = `https://shadowpulse.live/claim.php?voter_id=${res.sp_public_id}&uuid=${res.sp_uuid}`;
                     window.open(claimUrl, '_blank');
                     setLogoState(false);
                 });
             } else {
                 openSettingsModal();
             }
        }
    };

    const onResize = () => {
        const rect = bar.getBoundingClientRect();
        let changed = false;
        if (rect.right > window.innerWidth) {
            bar.style.left = (window.innerWidth - rect.width - 20) + 'px';
            changed = true;
        }
        if (rect.bottom > window.innerHeight) {
            bar.style.top = (window.innerHeight - rect.height - 20) + 'px';
            changed = true;
        }
        if (changed) {
             chrome.storage.local.set({ 
                sp_bar_pos: { left: bar.style.left, top: bar.style.top } 
            });
        }
    };

    bar.addEventListener('mousedown', onDragStart);
    // Removed global mousemove/up listeners here (now in onDragStart)
    bar.addEventListener('touchstart', onDragStart, {passive: false});
    // Removed global touchmove/end listeners here
    window.addEventListener('resize', onResize);

    // Initial Visibility check
    chrome.storage.local.get(['sp_show_graph'], res => {
         const showGraph = res.sp_show_graph !== false;
         if(!showGraph) {
             const stats = bar.querySelector('#sp-stats-zone');
             if(stats) stats.style.display = 'none';
         }
    });

    startStatsLoop(bar);
}

// --- Heartbeat Listener (No separate polling) ---
function startStatsLoop(bar) {
    const priceEl = bar.querySelector('.sp-stats-price');
    const graphEl = bar.querySelector('.sp-stats-graph');
    const statsZone = bar.querySelector('#sp-stats-zone');

    // Init listener for Main.js heartbeat
    document.addEventListener('sp-heartbeat', (e) => {
        if (e.detail) {
             renderStats(priceEl, graphEl, e.detail);
        }
    });

    // Initial check (optional, or just wait for first beat)
    // If we want immediate data, main.js should fire it on load.
}

function renderStats(priceEl, graphEl, data) {
    if (!priceEl || !graphEl) return;
    
    if (!data) {
        priceEl.textContent = "...";
        return;
    }

    priceEl.textContent = data.price_label;
    priceEl.className = 'sp-stats-price ' + (data.trend === 'up' ? 'sp-trend-up' : 'sp-trend-down');

    const w = 80; const h = 18;
    
    let history = [];
    if (Array.isArray(data.history)) {
        history = data.history.map(item => {
            if (typeof item === 'object' && item !== null) return { p: Number(item.p), t: Number(item.t) };
            return { p: Number(item), t: 0 }; 
        });
    }

    if (history.length < 1) return;

    const prices = history.map(h => h.p).filter(n => !isNaN(n));
    if (prices.length === 0) return;
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const rangeP = (maxP - minP) || 1;

    const hasTime = history[0].t > 0;
    
    const startPriceVal = history[0].p;
    const endPriceVal = history[history.length - 1].p;
    const isPositive = endPriceVal >= startPriceVal;
    const color = isPositive ? '#16a34a' : '#dc2626'; 

    let grid = "";
    let pathD = "";
    
    if (hasTime) {
        const lastT = history[history.length - 1].t;
        const windowSeconds = 3600;
        const startWindowT = lastT - windowSeconds;
        const theme = document.body.getAttribute('data-sp-theme') || 'light';
        const isDark = theme === 'dark';
        const blockFill = isDark ? '#ffffff' : '#000000';
        const blockOpacity = '0.15'; 

        const firstBlockT = Math.floor(startWindowT / 900) * 900;
        
        for (let t = firstBlockT; t <= lastT; t += 900) {
            const blockIndex = Math.round(t / 900);
            if (blockIndex % 2 === 0) {
                const bStart = Math.max(t, startWindowT);
                const bEnd = Math.min(t + 900, lastT);
                
                if (bEnd > bStart) {
                    const x1 = ((bStart - startWindowT) / windowSeconds) * w;
                    const x2 = ((bEnd - startWindowT) / windowSeconds) * w;
                    const bw = x2 - x1;
                    grid = `<rect x="${x1}" y="0" width="${bw}" height="${h}" fill="${blockFill}" fill-opacity="${blockOpacity}" />` + grid;
                }
            }

            if (t >= startWindowT) {
                 const timeOffset = t - startWindowT;
                 const x = (timeOffset / windowSeconds) * w;
                 grid += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${color}" stroke-opacity="0.2" stroke-width="0.5" stroke-dasharray="2,2" />`;
            }
        }

        history.forEach((hItem, i) => {
            if (hItem.t < startWindowT) return; 
            const timeOffset = hItem.t - startWindowT;
            const x = (timeOffset / windowSeconds) * w;
            const y = h - ((hItem.p - minP) / rangeP * (h - 2)) - 1;
            pathD += `${pathD===''?'M':'L'} ${x} ${y}`;
        });

    } else {
        const maxPoints = 60;
        const stepX = w / (maxPoints - 1);
        const offset = maxPoints - history.length;

        for(let i=15; i<60; i+=15) {
            const x = i * stepX;
            grid += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${color}" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="2,2" />`;
        }
        
        if (history.length === 1) {
             const x = offset * stepX; 
             const safeY = h - ((history[0].p - minP) / rangeP * (h - 2)) - 1; 
             pathD = `M ${x-5} ${safeY} L ${x} ${safeY}`;
        } else {
            history.forEach((hItem, i) => {
                const x = (i + offset) * stepX;
                const y = h - ((hItem.p - minP) / rangeP * (h - 2)) - 1; 
                pathD += `${i===0?'M':'L'} ${x} ${y}`;
            });
        }
    }

    const startY = h - ((history[0].p - minP) / rangeP * (h - 2)) - 1;
    grid += `<line x1="0" y1="${startY}" x2="${w}" y2="${startY}" stroke="${color}" stroke-opacity="0.6" stroke-width="1.5" />`;

    graphEl.innerHTML = `
        <svg viewBox="0 0 ${w} ${h}" fill="none" style="overflow:visible;">
            ${grid}
            <path d="${pathD}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    `;
}

function injectSearchTable() {
    if (!window.location.href.includes('action=search')) return;
    if (document.getElementById('sp-search-table')) return;

    const headers = Array.from(document.querySelectorAll('.catbg, .titlebg'));
    const paramHeader = headers.find(el => el.textContent.includes('Set Search Parameters'));
    let targetContainer = null;

    if (paramHeader) {
        const headerTr = paramHeader.closest('tr');
        if (headerTr) {
            const contentTr = headerTr.nextElementSibling;
            if (contentTr) {
                const contentTd = contentTr.querySelector('td.windowbg, td.windowbg2');
                if (contentTd) targetContainer = contentTd;
            }
        }
    }
    
    if (!targetContainer) {
        const googleForm = document.querySelector('form[action*="google"]');
        if (googleForm) targetContainer = googleForm.parentElement; 
    }

    if (targetContainer) {
        const forumForm = targetContainer.querySelector('form[action*="action=search2"]');
        const table = createEl('table', ['sp-search-table']);
        table.id = 'sp-search-table';
        table.innerHTML = `
            <tr>
                <td class="sp-search-col">
                    <div class="sp-search-header">ShadowPulse</div>
                    <input type="text" id="sp-s-input" name="sp_search_forum" autocomplete="off" data-lpignore="true" data-1p-ignore data-form-type="other" placeholder="Search Forum..." disabled style="opacity:0.5; cursor:not-allowed;" />
                    <button id="sp-s-btn" disabled style="opacity:0.5; cursor:not-allowed;">Go</button>
                </td>
                <td class="sp-search-col">
                    <div class="sp-search-header">Google</div>
                    <input type="text" id="sp-g-input" name="sp_search_google" autocomplete="off" data-lpignore="true" data-1p-ignore data-form-type="other" placeholder="Site Search..." />
                    <button id="sp-g-btn">Go</button>
                </td>
                <td class="sp-search-col">
                    <div class="sp-search-header">BitList</div>
                    <input type="text" id="sp-n-input" name="sp_search_ninja" autocomplete="off" data-lpignore="true" data-1p-ignore data-form-type="other" placeholder="Advanced..." disabled style="opacity:0.5; cursor:not-allowed;" />
                    <button id="sp-n-btn" disabled style="opacity:0.5; cursor:not-allowed;">Go</button>
                </td>
            </tr>
        `;

        if (forumForm) {
            while (targetContainer.firstChild && targetContainer.firstChild !== forumForm) {
                const node = targetContainer.firstChild;
                if (node.textContent && node.textContent.includes('Forum Search') && node.nodeName !== 'A') break; 
                targetContainer.removeChild(node);
            }
            targetContainer.insertBefore(table, targetContainer.firstChild);

        } else {
            targetContainer.innerHTML = '';
            targetContainer.appendChild(table);
        }

        targetContainer.style.padding = '10px';
        
        const bind = (id, urlFn) => {
            const btn = document.getElementById(id + '-btn');
            const inp = document.getElementById(id + '-input');
            if(btn && inp) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    if(inp.value.trim()) window.open(urlFn(inp.value.trim()), '_blank');
                };
                inp.onkeydown = (e) => {
                    if(e.key === 'Enter') {
                        e.preventDefault();
                        btn.click();
                    }
                };
            }
        };
        
        // setTimeout(() => document.getElementById('sp-g-input')?.focus(), 100);
        
        bind('sp-s', q => `https://shadowpulse.live/reports/index.php?q=${encodeURIComponent(q)}`);
        bind('sp-g', q => `https://www.google.com/search?q=site:bitcointalk.org ${encodeURIComponent(q)}`);
        bind('sp-n', q => `https://ninjastic.space/search?q=${encodeURIComponent(q)}`);
    }
}

async function openThemeEditor() {
    let editorRoot = document.getElementById('sp-theme-editor-root');
    if (editorRoot) {
        editorRoot.style.display = 'flex';
        return;
    }

    const themeSel = document.getElementById('sp-theme-select');
    const currentMode = (themeSel ? themeSel.value : 'light'); 
    const storageKey = `sp_custom_${currentMode}`;
    let startColors = {};
    const defaults = {
        light: {
            'bg': '#ffffff', 'text': '#000000', 'link': '#0000ff',
            'cat_bg': '#6699cc', 'cat_text': '#ffffff',
            'title_bg': '#dce4e9', 'window_bg': '#f0f0f0'
        },
        dark: {
            'bg': '#0f172a', 'text': '#cbd5e1', 'link': '#60a5fa',
            'cat_bg': '#1e293b', 'cat_text': '#f8fafc',
            'title_bg': '#334155', 'window_bg': '#1e293b'
        }
    };

    try {
        const stored = await chrome.storage.local.get(storageKey);
        startColors = stored[storageKey] || defaults[currentMode];
        if (currentMode === 'dark' && !stored[storageKey]) {
             const legacy = await chrome.storage.local.get('sp_custom_theme');
             if(legacy.sp_custom_theme) startColors = legacy.sp_custom_theme;
        }
    } catch (e) {
        startColors = defaults[currentMode];
    }
    if(!startColors.bg) startColors = defaults[currentMode];

    const backdropCtx = createEl('div', null, {
        id: 'sp-theme-editor-backdrop',
        style: 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.4); z-index: 21000000; display: flex; align-items: flex-start; justify-content: flex-start;'
    });

    editorRoot = createEl('div', null, {
        id: 'sp-theme-editor-root',
        style: `
            position: absolute; top: 100px; left: 100px; width: 320px;
            background: rgba(15, 23, 42, 0.95); color: #fff;
            border: 1px solid #334155; border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            font-family: 'Segoe UI', sans-serif;
            backdrop-filter: blur(10px); display: flex; flex-direction: column;
            overflow: hidden; animation: sp-fade-in 0.2s ease-out;
        `
    });

    const closeEditor = () => backdropCtx.remove();

    const header = createEl('div', null, {
        id: 'sp-theme-drag-handle',
        style: 'padding: 15px; background: rgba(30, 41, 59, 0.8); border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; cursor: grab;'
    });
    header.innerHTML = `<span style="font-weight: 600; font-size: 14px;">Editor: ${currentMode.toUpperCase()}</span>`;
    const closeBtn = createEl('button', 'sp-settings-close', {
        style: 'background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer;'
    });
    closeBtn.innerText = '\u2715';
    closeBtn.onclick = closeEditor;
    header.appendChild(closeBtn);
    editorRoot.appendChild(header);

    const body = createEl('div', null, { style: 'padding: 15px; display: flex; flex-direction: column; gap: 12px;' });
    
    const applyPreview = (key, hex) => {
        document.body.style.setProperty(`--sp-forum-${key.replace('_','-')}`, hex);
        document.documentElement.setAttribute('data-sp-theme', 'custom'); 
    };

    const mappings = [
        { label: "Background", key: "bg", val: startColors.bg },
        { label: "Text Color", key: "text", val: startColors.text },
        { label: "Link Color", key: "link", val: startColors.link },
        { label: "Category BG", key: "cat_bg", val: startColors.cat_bg },
        { label: "Category Text", key: "cat_text", val: startColors.cat_text },
        { label: "Title BG", key: "title_bg", val: startColors.title_bg },
        { label: "Window BG", key: "window_bg", val: startColors.window_bg }
    ];

    mappings.forEach(m => {
        const row = createEl('div', null, { style: 'display: flex; align-items: center; justify-content: space-between;' });
        const label = createEl('span', null, { style: 'font-size: 13px; color: #cbd5e1;' });
        label.innerText = m.label;
        const inputContainer = createEl('div', null, { style: 'display: flex; align-items: center; gap: 8px;' });
        const textDisplay = createEl('span', null, { 
            id: `txt_${m.key}`,
            style: 'font-family: monospace; font-size: 12px; color: #64748b;' 
        });
        textDisplay.innerText = m.val;

        const picker = createEl('input', null, { 
            id: `col_${m.key}`,
            type: 'color', 
            value: m.val,
            style: 'width: 32px; height: 32px; border: none; padding: 0; background: none; cursor: pointer;' 
        });

        picker.addEventListener('input', (e) => {
            const hex = e.target.value;
            textDisplay.innerText = hex;
            applyPreview(m.key, hex);
        });

        inputContainer.append(textDisplay, picker);
        row.append(label, inputContainer);
        body.appendChild(row);
    });
    editorRoot.appendChild(body);

    const footer = createEl('div', null, { style: 'padding: 15px; border-top: 1px solid #334155; display: flex; gap: 10px; justify-content: flex-end;' });
    
    const saveBtn = createEl('button', null, {
        id: 'sp-theme-save',
        style: 'padding: 8px 12px; background: transparent; color: var(--sp-accent); border: 1px solid var(--sp-accent); border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;'
    });
    saveBtn.innerText = 'SAVE';
    
    saveBtn.addEventListener('click', () => {
        const newTheme = {};
        mappings.forEach(m => {
            const picker = editorRoot.querySelector(`#col_${m.key}`);
            newTheme[m.key] = picker ? picker.value : m.val;
        });
        
        chrome.storage.local.set({ 
            [storageKey]: newTheme,
        }, () => {
             applyThemeLogic(currentMode);
             const oldText = saveBtn.innerText;
             saveBtn.innerText = "SAVED!";
             setTimeout(() => saveBtn.innerText = oldText, 800);
        });
    });

    const resetBtn = createEl('button', null, {
        id: 'sp-theme-reset',
        style: 'padding: 8px 12px; background: transparent; color: #94a3b8; border: 1px solid #475569; border-radius: 6px; cursor: pointer; font-size: 12px;'
    });
    resetBtn.innerText = 'RESET';
    
    resetBtn.onclick = () => {
        if(confirm(`Reset ${currentMode.toUpperCase()} theme to defaults?`)) {
            chrome.storage.local.remove([storageKey], () => {
                applyThemeLogic(currentMode);
                closeEditor();
            });
        }
    };
    
    footer.append(saveBtn, resetBtn);
    editorRoot.appendChild(footer);
    backdropCtx.appendChild(editorRoot);

    document.body.appendChild(backdropCtx);

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    
    const getClientCoords = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const onDragStart = (e) => {
        if(e.target.closest('.sp-settings-close')) return;
        isDragging = true;
        const coords = getClientCoords(e);
        startX = coords.x;
        startY = coords.y;
        if(e.type === 'touchstart') e.preventDefault();

        const rect = editorRoot.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        header.style.cursor = 'grabbing';
    };

    const onDragMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const coords = getClientCoords(e);
        const dx = coords.x - startX;
        const dy = coords.y - startY;
        editorRoot.style.left = (initialLeft + dx) + 'px';
        editorRoot.style.top = (initialTop + dy) + 'px';
    };

    const onDragEnd = () => {
        if(isDragging) {
            isDragging = false;
            header.style.cursor = 'grab';
        }
    };

    header.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    header.addEventListener('touchstart', onDragStart, {passive: false});
    window.addEventListener('touchmove', onDragMove, {passive: false});
    window.addEventListener('touchend', onDragEnd);
}


// --- MAIN ---
// State
let lastPulseTimestamp = 0;
let lastFlashTime = 0;
let lastSelfPulseTime = 0;
let lastGlobalPulseTime = 0;
let userPublicId = null;
let userUuid = null;

// Settings Cache
const SETTINGS = {
  sp_show_pulse: true,
  sp_flash_logo: true,
};

function stripTrustScoreStyles() {
  const scores = document.querySelectorAll(".trustscore");
  scores.forEach((el) => el.removeAttribute("style"));
}

function init() {
  spLog("Initializing ShadowPulse (v1.9.89)...");
  if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializeExtension);
  } else {
      initializeExtension();
  }
}

function initializeExtension() {
     chrome.storage.local.get(
    [
      "sp_show_pulse",
      "sp_flash_logo",
      "sp_theme",
      "sp_custom_light",
      "sp_custom_dark",
      "sp_custom_theme",
    ],
    (res) => {
      // 1. Settings & Theme (Runs Everywhere)
      if (res.sp_show_pulse !== undefined) SETTINGS.sp_show_pulse = res.sp_show_pulse;
      if (res.sp_flash_logo !== undefined) SETTINGS.sp_flash_logo = res.sp_flash_logo;

      applyTheme(res);

      // 2. Initialize Identity & Start Router
      initUserId().then(() => {
        setupGlobalFeatures();
        routePageLogic();
      });
    }
  );

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.sp_show_pulse) SETTINGS.sp_show_pulse = changes.sp_show_pulse.newValue;
      if (changes.sp_flash_logo) SETTINGS.sp_flash_logo = changes.sp_flash_logo.newValue;
    }
  });
}

function applyTheme(res) {
    let theme = res.sp_theme || "light";
    if (theme === "custom") {
      theme = "dark";
      if (!res.sp_custom_dark && res.sp_custom_theme) res.sp_custom_dark = res.sp_custom_theme;
    }

    const profileVars = theme === "light" ? res.sp_custom_light : res.sp_custom_dark;
    document.body.removeAttribute("style");
    document.documentElement.setAttribute("data-sp-theme", theme);
    localStorage.setItem("sp_theme_sync", theme);

    if (profileVars) {
      Object.keys(profileVars).forEach((key) => {
        const varName = key.startsWith("--") ? key : `--sp-forum-${key.replace("_", "-")}`;
        document.body.style.setProperty(varName, profileVars[key]);
      });
      document.documentElement.setAttribute("data-sp-theme", "custom");
    }
    stripTrustScoreStyles();
}

// --- A. Global Logic (Runs Everywhere) ---
function setupGlobalFeatures() {
    injectFloatingBar();
    injectSearchTable(); 
    startPulsePolling(); // Async Heartbeat (Does not block main thread)
}

// --- B. The Router (Gatekeeper) ---
function routePageLogic() {
    const href = window.location.href;

    // SAFETY CHECK 1: Do NOT run logic on functional pages (Login, Post, Raffle, etc)
    if (href.includes("action=")) {
        spLog("Action Page detected. ShadowPulse dormant.");
        return;
    }

    // Route: Topic Page
    if (href.includes("topic=")) {
        handleTopicPage();
        return;
    }

    // Route: Board Page
    if (href.includes("board=")) {
        handleBoardPage();
        return;
    }
}

// --- C. Topic Handler ---
function handleTopicPage() {
    // 1. Extract Metadata
    const meta = getPageData(); // Safe to run here
    
    // 2. Track View
    chrome.runtime.sendMessage({
        type: "TRACK_VIEW",
        payload: {
          topic_id: meta.topicId,
          voter_id: userPublicId,
          uuid: userUuid,
          board_id: meta.boardId,
          topic_title: meta.topicTitle,
        },
    });

    // 3. Inject Buttons (With Robust Author Logic)
    injectPulseButtons(meta);
}

// --- D. Board Handler ---
function handleBoardPage() {
    const bMatch = window.location.href.match(/board=(\d+)/);
    if (!bMatch) return;
    
    const bId = bMatch[1];
    const bTitle = document.title.replace(" - Bitcoin Forum", "").trim();

    chrome.runtime.sendMessage({
        type: "TRACK_VIEW",
        payload: {
          board_id: bId,
          voter_id: userPublicId,
          uuid: userUuid,
          is_board_view: true,
          board_title: bTitle,
        },
    });
}

// --- Helpers ---

function initUserId() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["sp_public_id", "sp_uuid"], (res) => {
      if (!res.sp_public_id) {
        const newId = generateRandomId();
        const uuid = crypto.randomUUID();
        spLog("Generated new ID:", newId);
        chrome.storage.local.set(
          { sp_public_id: newId, sp_uuid: uuid },
          () => {
            userPublicId = newId;
            userUuid = uuid;
            resolve();
          }
        );
      } else {
        userPublicId = res.sp_public_id;
        if (res.sp_uuid) userUuid = res.sp_uuid;
        resolve();
      }
    });
  });
}

function getPageData() {
  const meta = {
    type: "topic", // We only run this on topic pages now
    boardId: "0",
    boardTitle: "",
    topicId: "0",
    topicTitle: "",
  };

  // --- STRATEGY 1: Topic Header (Most Reliable) ---
  // Matches the blue bar: "Topic: [Title] (Read 123 times)"
  const allHeaders = document.querySelectorAll("td.catbg, div.catbg, .header, td"); 
  for (const el of allHeaders) {
     const text = el.innerText || el.textContent; 
     // Strict check to avoid false positives
     if (text && text.trim().startsWith("Topic: ") && text.includes("(Read")) {
         const start = text.indexOf("Topic: ") + 7;
         const end = text.lastIndexOf("(Read");
         if (end > start) {
             meta.topicTitle = text.substring(start, end).trim();
             spLog("Extracted Title from Topic Header:", meta.topicTitle);
             break; 
         }
     }
  }

  // --- STRATEGY 2: Breadcrumbs (Standard SMF) ---
  if (!meta.topicTitle) {
      let navLinks = document.querySelectorAll(".navigate_section a");
      if (navLinks.length === 0) {
        const navDiv = document.querySelector("div.nav");
        if (navDiv) navLinks = navDiv.querySelectorAll("a");
      }

      for (const link of navLinks) {
        const href = link.href;
        const text = link.textContent.trim();
        const bMatch = href.match(/board=(\d+)/);
        if (bMatch) {
          meta.boardId = bMatch[1];
          meta.boardTitle = text;
        }
        const tMatch = href.match(/topic=(\d+)/);
        if (tMatch) {
          meta.topicId = tMatch[1];
          meta.topicTitle = text;
        }
      }
  }

  // 3. Fallbacks
  if (meta.topicId === "0") {
    const tMatch = window.location.href.match(/topic=(\d+)/);
    if (tMatch) meta.topicId = tMatch[1];
  }
  
  if (!meta.topicTitle) {
      const docTitle = document.title;
      if (docTitle) meta.topicTitle = docTitle.replace(" - Bitcoin Forum", "").trim();
  }

  return meta;
}

function injectPulseButtons(pageMeta) {
  if (SETTINGS.sp_show_pulse === false) return;

  const subjectDivs = document.querySelectorAll("#quickModForm div[id^='subject_']");
  spLog(`Injecting Pulse Buttons. Subjects found: ${subjectDivs.length}`);
  
  const pageTopicId = pageMeta.topicId;

  subjectDivs.forEach((subjectDiv) => {
    const idParts = subjectDiv.id.split('_');
    if (idParts.length < 2) return;
    const msgId = idParts[1];

    if (!msgId || msgId === "0") return;

    // Find Action Container (Buttons)
    const messageLink = Array.from(document.querySelectorAll(`a[href*="msg${msgId}"]`)).find(a => 
        a.textContent.trim().startsWith("#") || a.name === `msg${msgId}`
    );
    if (!messageLink) return;

    const actionContainer = messageLink.closest("div") || messageLink.parentElement;
    const containerTd = subjectDiv.closest("td");
    
    let postAuthor = "Unknown";
    let postAuthorUid = 0;

    // 1. Recursive Search: Find the true Post Row
    // Sometimes the subject div is nested; we walk up until we find the row with .poster_info
    let parentRow = subjectDiv.closest("tr");
    let attempts = 0;
    while (parentRow && attempts < 5) {
        if (parentRow.querySelector(".poster_info")) {
            break; 
        }
        if (parentRow.parentElement) {
             const nextTr = parentRow.parentElement.closest("tr");
             if (nextTr) {
                 parentRow = nextTr;
                 attempts++;
             } else {
                 break;
             }
        } else {
            break;
        }
    }

    if (parentRow) {
        // 2. Extract Author Info
        const posterInfoTd = parentRow.querySelector(".poster_info");

        if (posterInfoTd) {
            // A. Profile Link (Standard User)
            const profileLink = posterInfoTd.querySelector("a[href*='action=profile']");
            
            if (profileLink) {
                 const pText = profileLink.textContent.trim();
                 if (pText) postAuthor = pText;
                 
                 const uMatch = profileLink.href.match(/u=(\d+)/);
                 if (uMatch) postAuthorUid = uMatch[1];
            } else {
                 // B. Guest / No-Link (Bold Name)
                 const bTag = posterInfoTd.querySelector("b");
                 if (bTag) {
                     const bText = bTag.textContent.trim();
                     if (bText) postAuthor = bText;
                 } else {
                     // C. Fallback: Any Link
                     const anyLink = posterInfoTd.querySelector("a");
                     if (anyLink) {
                         const lText = anyLink.textContent.trim();
                         if (lText) postAuthor = lText;
                     }
                 }
            }
        } else {
             // D. Fallback for Themes without .poster_info class
             if (parentRow.cells.length > 0) {
                 const firstCell = parentRow.cells[0];
                 const bTag = firstCell.querySelector("b");
                 if (bTag) postAuthor = bTag.textContent.trim();
             }
        }
    }
    
    // Title
    let postTitle = subjectDiv.textContent.trim();
    const subjectLink = subjectDiv.querySelector("a");
    if (subjectLink) postTitle = subjectLink.textContent.trim();
    if (!postTitle && pageMeta.topicTitle) postTitle = "Re: " + pageMeta.topicTitle; 

    // Create & Inject Wrapper
    const allLinks = Array.from(actionContainer.querySelectorAll("a"));
    const meritLink = allLinks.find((a) => a.href.includes("action=merit"));
    const quoteLink = allLinks.find((a) => a.href.includes("action=quote"));
    
    const wrapper = createEl("div", ["sp-pulse-wrapper"]);
    wrapper.style.display = "inline-flex";
    wrapper.style.flexDirection = "column"; 
    wrapper.style.alignItems = "flex-end"; 
    wrapper.style.verticalAlign = "top";
    wrapper.style.marginLeft = "4px";

    const btn = createPulseButton(pageTopicId, msgId, {
      boardId: pageMeta.boardId,
      topicTitle: pageMeta.topicTitle,
      postTitle: postTitle,
      postAuthor: postAuthor,
      postAuthorUid: postAuthorUid,
    });

    if (meritLink) {
      meritLink.parentNode.insertBefore(wrapper, meritLink);
      wrapper.appendChild(meritLink);
      wrapper.appendChild(btn);
    } else if (quoteLink) {
      quoteLink.parentNode.insertBefore(wrapper, quoteLink.nextSibling); 
      wrapper.appendChild(btn);
    } else {
      actionContainer.appendChild(wrapper);
      wrapper.appendChild(btn);
    }

    // Inject Stats Row
    let headerDiv = containerTd.querySelector(".keyinfo") || containerTd.querySelector(".smalltext");
    const statsRow = createEl("div", ["sp-pulse-info-row"]);
    statsRow.dataset.msgId = msgId;
    statsRow.style.fontSize = "11px";
    statsRow.style.marginTop = "2px";
    statsRow.style.color = "#1e90ff";
    statsRow.style.fontWeight = "bold";

    if (headerDiv) {
      if (headerDiv.nextSibling) {
        headerDiv.parentNode.insertBefore(statsRow, headerDiv.nextSibling);
      } else {
        headerDiv.parentNode.appendChild(statsRow);
      }
    } else {
      containerTd.insertBefore(statsRow, containerTd.firstChild);
    }
  });

  // Batch Pulse Check
  const allBtns = document.querySelectorAll(".sp-pulse-btn");
  const msgIds = Array.from(allBtns).map((b) => b.dataset.msgId).filter((id) => id && id !== "0");
  if (msgIds.length > 0) {
    const uniqueIds = [...new Set(msgIds)];
    fetchPagePulseStatus(uniqueIds);
  }
}

function flashPulseButton(msgId) {
  if (SETTINGS.sp_flash_logo === false) return;
  const btn = document.querySelector(`.sp-pulse-btn[data-msg-id="${msgId}"]`);
  if (btn) {
    btn.classList.remove("sp-flash");
    void btn.offsetWidth;
    btn.classList.add("sp-flash");
    setTimeout(() => btn.classList.remove("sp-flash"), 1000);
  }
  flashLogoStub();
}

function flashLogoStub() {
  const logoZone = document.getElementById("sp-logo-zone");
  if (logoZone) {
    logoZone.classList.remove("sp-flash");
    void logoZone.offsetWidth;
    logoZone.classList.add("sp-flash");
    setTimeout(() => logoZone.classList.remove("sp-flash"), 1000);
  }
}

function initLogoClick() {
  const logoZone = document.getElementById("sp-logo-zone");
  if (logoZone) {
    logoZone.style.cursor = "pointer";
    logoZone.onclick = (e) => {
      if (document.body.classList.contains("sp-dragging")) return;
      e.preventDefault();
      e.stopPropagation();

      if (logoZone.title.includes("CLAIM")) {
        const claimUrl = `https://shadowpulse.live/claim.php?voter_id=${userPublicId}&uuid=${userUuid}`;
        window.open(claimUrl, "_blank");
      } else {
        openSettingsModal();
      }
    };
  }
}

async function fetchPagePulseStatus(msgIds) {
  try {
    const response = await fetch(
      `https://shadowpulse.live/api/get_vote_status.php?msg_ids=${msgIds.join(",")}`
    );
    const json = await response.json();

    if (json && json.success && json.data) {
      Object.keys(json.data).forEach((msgId) => {
        const stats = json.data[msgId];
        if (stats.user_count > 0) {
          const statsRow = document.querySelector(`.sp-pulse-info-row[data-msg-id="${msgId}"]`);
          if (statsRow) {
            statsRow.textContent = `Pulsed by ${stats.user_count} user${stats.user_count === 1 ? "" : "s"}`;
            statsRow.style.fontStyle = "italic";
            statsRow.style.fontSize = "11px";
          }
        }
      });
    }
  } catch (e) {
    console.error("Batch Pulse Fetch Error:", e);
  }
}

function createPulseButton(topicId, msgId, meta) {
  const btnPulse = createEl("a", ["sp-pulse-btn"]);
  btnPulse.href = "#";
  btnPulse.textContent = "+Pulse";
  btnPulse.title = `Give Pulse as ${userPublicId}`;
  btnPulse.dataset.topicId = topicId;
  btnPulse.dataset.msgId = msgId;

  btnPulse.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    btnPulse.classList.add("sp-flash");
    setTimeout(() => btnPulse.classList.remove("sp-flash"), 1000);
    lastSelfPulseTime = Date.now();
    spLog(`Pulsing Topic:${topicId} Msg:${msgId} as ${userPublicId}...`);

    try {
      const payload = {
        voter_id: userPublicId,
        uuid: userUuid,
        msg_id: msgId,
        topic_id: topicId,
        type: "pulse",
        board_id: meta.boardId,
        topic_title: meta.topicTitle,
        post_title: meta.postTitle,
        post_author: meta.postAuthor,
        post_author_uid: meta.postAuthorUid,
      };

      const response = await chrome.runtime.sendMessage({
        type: "SEND_PULSE",
        payload: payload,
      });

      if (response && response.success) {
        spLog("Pulse Sent (BG Success)");
        const statsRow = document.querySelector(`.sp-pulse-info-row[data-msg-id="${msgId}"]`);
        if (statsRow) {
          let text = statsRow.textContent;
          let match = text.match(/(\d+)/);
          let count = match ? parseInt(match[1]) : 0;
          let newCount = count + 1;
          statsRow.textContent = `Pulsed by ${newCount} user${newCount === 1 ? "" : "s"}`;
        }
      } else {
        btnPulse.classList.remove("sp-flash");
        void btnPulse.offsetWidth;
        btnPulse.classList.add("sp-flash-error");
        setTimeout(() => btnPulse.classList.remove("sp-flash-error"), 1000);
      }
    } catch (err) {
      console.error("Pulse Message Error:", err);
      btnPulse.classList.remove("sp-flash");
      void btnPulse.offsetWidth;
      btnPulse.classList.add("sp-flash-error");
      setTimeout(() => btnPulse.classList.remove("sp-flash-error"), 1000);
    }
  });

  return btnPulse;
}

// --- Polling Logic ---
async function heartbeat() {
  // A. Global Pulse Check (Logo & BTC & Stats)
  try {
    const res = await chrome.runtime.sendMessage({ 
        type: "GET_LATEST_PULSE",
        voter_id: userPublicId 
    });
    if (res && res.data) {
      if (res.data.price_stats) {
          document.dispatchEvent(new CustomEvent('sp-heartbeat', { detail: res.data.price_stats }));
      } else {
          // Fallback Fetch
          chrome.runtime.sendMessage({ type: "FETCH_STATS" })
            .then(res => {
                if (res && res.success && res.data) {
                    document.dispatchEvent(new CustomEvent('sp-heartbeat', { detail: res.data }));
                }
            })
            .catch(() => {});
      }

      const val = res.data.btc_active;
      const isBtc = val === 1 || val === "1" || val === true;
      if (isBtc) spLog("BTC Active Triggered via Polling!");

      setLogoState(isBtc);

      if (!isBtc && SETTINGS.sp_flash_logo) {
        const globalTime = parseFloat(res.data.last_pulse);
        const lastAuthor = res.data.last_pulse_by; 

        if (lastGlobalPulseTime === 0) {
          lastGlobalPulseTime = globalTime;
        } else if (globalTime > lastGlobalPulseTime) {
          lastGlobalPulseTime = globalTime;
          
          // STRICT SELF-FLASH CHECK:
          // If the pulse came from ME (userPublicId), do NOT flash the logo.
          // Only flash if it came from someone else.
          if (lastAuthor !== userPublicId) {
             flashLogoStub();
          }
        }
      }
    }
  } catch (e) {}

  // B. Local Pulse Check (One Random Button)
  // Only runs if buttons exist (Topic Pages)
  const visibleBtns = Array.from(document.querySelectorAll(".sp-pulse-btn"));
  if (visibleBtns.length > 0) {
      for (let i = 0; i < 1; i++) {
        const btn = visibleBtns[Math.floor(Math.random() * visibleBtns.length)];
        const msgId = btn.dataset.msgId;
        if (!msgId || msgId === "0") continue;

        try {
          const response = await chrome.runtime.sendMessage({
            type: "GET_VOTE_STATUS",
            payload: { msg_id: msgId },
          });

          if (response && response.data) {
            const { last_pulse, user_count } = response.data;
            if (user_count > 0) {
              const statsRow = document.querySelector(`.sp-pulse-info-row[data-msg-id="${msgId}"]`);
              if (statsRow) statsRow.textContent = `Pulsed by ${user_count} user${user_count === 1 ? "" : "s"}`;
            }

            const pulseTime = parseFloat(last_pulse);
            if (pulseTime > lastPulseTimestamp) {
              lastPulseTimestamp = pulseTime; 
              const now = Date.now();
              if (now - lastFlashTime > CONFIG.FLASH_COOLDOWN && now - lastSelfPulseTime > 3000) {
                flashPulseButton(msgId);
                lastFlashTime = now;
              }
            }
          }
        } catch (e) {}
      }
  }

  setTimeout(heartbeat, CONFIG.POLLING_INTERVAL);
}

function startPulsePolling() {
  heartbeat();
}
; init();

})();



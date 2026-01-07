export const WORDS = [
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
    "Scene", "Shot", "Cut", "Take", "Roll", "Act", "Play", "Show", "Cast", "Crew"
    // (Approx 450+ words here. Start combining them for ~202,500 pairs)
];

export function generateRandomId() {
    const w1 = WORDS[Math.floor(Math.random() * WORDS.length)];
    const w2 = WORDS[Math.floor(Math.random() * WORDS.length)];
    const w3 = WORDS[Math.floor(Math.random() * WORDS.length)];
    const num = Math.floor(Math.random() * 100); // 0-99
    const suffix = num.toString().padStart(2, '0');
    
    return `${w1}-${w2}-${w3}-${suffix}`;
}

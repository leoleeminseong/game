# Pixel Shooting Game 🚀

Retro-style vertical scrolling shooting game with 7 unique aircraft, 200 challenging stages, and infinite mode!

## 🎮 Game Features

### 🎯 Game Modes

#### 🎯 Normal Mode (Level 1-200)
- **Level 1-100**: All aircraft available
- **Level 101-200**: Phoenix X-99 / Divine Destroyer only
- Challenge bosses and unlock new aircraft

#### ♾️ Infinite Mode (Level 201+)
- **Divine Destroyer exclusive** - Unlimited level progression
- Progressive difficulty scaling
- Compete for the highest score on the leaderboard
- Starts from level 201

### ✈️ 7 Aircraft Types
Each aircraft has unique stats and special skills:

1. **F-16 Fighter** 🔵
   - Balanced all-rounder
   - **Skill: Missile Barrage** - Fires 5 missiles (Cooldown: 8s)
   - Lives: 10 | Speed: 50 | Fire Rate: 3.3/s | Shield: 1 | Attack: 2

2. **B-52 Bomber** 🟢
   - Powerful area damage specialist
   - **Skill: Carpet Bomb** - Drops 3 bombs (Area damage) (Cooldown: 10s)
   - Lives: 12 | Speed: 40 | Fire Rate: 2.5/s | Shield: 2 | Attack: 3

3. **Stealth Fighter** 🟣
   - High speed, Low HP
   - **Skill: Stealth Mode** - Invincible + Speed boost for 3s (Cooldown: 12s)
   - Lives: 7 | Speed: 70 | Fire Rate: 5/s | Shield: 0 | Attack: 1

4. **Interceptor** �
   - Ultra rapid fire specialist
   - **Skill: Laser Beam** - Piercing laser (0.75s duration) (Cooldown: 7s)
   - Lives: 8 | Speed: 60 | Fire Rate: 6.7/s | Shield: 0 | Attack: 1

5. **Flying Fortress** �
   - Maximum defense, Slow attack
   - **Skill: Shield Burst** - 360° omnidirectional bullets (Cooldown: 9s)
   - Lives: 15 | Speed: 30 | Fire Rate: 2.5/s | Shield: 3 | Attack: 1

6. **⭐ PHOENIX X-99 ⭐** 💗
   - Ultimate Fighter (Unlock: Clear level 100 with F-16 Fighter)
   - **Skill: Phoenix Storm** - Omnidirectional annihilation (10 missiles + 24 energy shots + 3 lasers) (Cooldown: 15s)
   - Lives: 20 | Speed: 80 | Fire Rate: 10/s | Shield: 5 | Attack: 3
   - **Special: Can progress to level 200**

7. **⚡ DIVINE DESTROYER ⚡** 🌟
   - Divine Realm - Infinite Mode Only
   - **Skill: Divine Annihilation** - Absolute power + Unlimited levels
   - **Unlock: Clear level 200 + Clear level 100 with all aircraft**
   - Lives: 50 | Speed: 120 | Fire Rate: 20/s | Shield: 15 | Attack: 10
   - **Special: Access to Infinite Mode (201+)**

### 🎯 Stage System

#### Normal Stages (Level 1-100)
- All aircraft available
- Boss every 10 levels (10 unique bosses)
- Upgrades every 5 levels (except boss levels)
- Max 10 enemies on screen
- Level 100 final boss HP: 690

#### Phoenix Exclusive Stages (Level 101-200)
- **PHOENIX X-99 / Divine Destroyer only** (Other aircraft end at level 100)
- Extreme difficulty scaling
- Boss HP: 900 → 4,560 (level 190)
- **Level 200 Final Boss: 6,000 HP + 3 Phases (21,000 HP total)** 👑
  - Phase 1: 6,000 HP - Red-purple-blue gradient with lightning
  - Phase 2: 6,000 HP - 48-direction burst + wave attacks
  - Phase 3: 9,000 HP - 64-direction spiral + 8-direction lasers

#### Infinite Mode (Level 201+)
- **Divine Destroyer exclusive**
- Progressive difficulty: Enemies start weak and scale infinitely
- Enemy HP: 1 → scales by level
- Max 25 enemies on screen
- Boss HP increases continuously
- No level cap - compete for highest score!

### 🎁 Upgrade System

#### Standard Upgrades
- 🚀 **Move Speed +10**: Increase movement speed
- 🔥 **Fire Rate Up**: Increase fire rate (Cooldown -0.05s)
- 💖 **+1 Life**: Increase lives by 1
- 💥 **+1 Damage**: Increase attack power by 1
- ⚡ **Skill Cooldown -1s**: Reduce skill cooldown (Minimum 2s)
- ↖️↗️ **Diagonal Shot**: Stacking diagonal shots (Level-based)

#### Rare Upgrades (10% chance)
- ⚡ **Ultra Speed +30**: Massive speed boost
- 💥 **Ultra Fire Rate**: Massive fire rate boost (Cooldown -0.15s)
- 🛡️ **Add 3 Shield**: Add 3 shields
- 🛡️✨ **Add 5 Shield**: Add 5 shields (Super rare)
- 💢💥 **+3 Damage**: Massive damage boost (Mega rare)

#### Boss Skill Upgrades
- 🎯 **Triple Shot**: 3-shot → 5-shot (Pentashot) → 7-shot stacking
- ⚡ **Super Fast Fire**: Ultra-fast fire rate
- 💫 **Teleport**: Instant teleport with Shift key
- 💖 **Auto Heal**: Automatic HP regeneration
- ⚡🌩️ **Lightning**: Automatic lightning attacks
- 🌀⏰ **Time Warp**: Time distortion (Auto)
- ⭐💫 **Starfall**: Meteor shower (Auto)
- 🌪️💥 **Chaos**: Chaos attacks (Auto)
- ✨ **Ultimate Power**: Ultimate form

*All upgrades are stackable and effects accumulate!*

### � Player System
- **Enter Your Name**: Set your player name at first launch
- Names are saved in localStorage and persist across sessions
- Display your name in-game and on the leaderboard
- Change name anytime from main menu

### 🏆 Leaderboard System
- **Automatic Recording**: Records are saved when game over or level complete
- **Top 50 Records**: Stores highest 50 records by level
- **Rankings**: 🥇 Gold, 🥈 Silver, 🥉 Bronze medals for top 3
- **Detailed Stats**: Player name, level reached, aircraft used, mode, date
- **Highlight**: Your records are highlighted in the leaderboard
- **Persistent**: All records saved in localStorage

### �💾 Save System
- **💾 Save**: Save current clear status and unlocks
- **📂 Load**: Restore saved data
- **🔄 Reset**: Reset current progress (saved data kept)

### 🎮 Gameplay
- Enemies reaching the bottom reduce lives
- Bosses use unique patterns and skills
- Shields absorb damage before lives are lost
- Level select allows starting from any stage
- Progressive difficulty in infinite mode

## 🕹️ Controls

### Basic Controls
- **Arrow Keys (←↑↓→)**: Move aircraft
- **Space Bar**: Fire bullets
- **W Key**: Activate special skill (has cooldown)
- **Shift Key**: Teleport (when upgrade acquired)

### Game Controls
- **Enter**: Restart after game over
- **Pause/Resume**: Pause/resume game
- **Level Select**: Go to level selection screen
- **Mode Select**: Return to mode selection
- **Main Menu**: Return to main menu

## 🏆 Challenges & Achievements

1. **Unlock Phoenix**: Clear level 100 with F-16 Fighter
2. **Master All Aircraft**: Clear level 100 with all 5 basic aircraft
3. **Divine Unlock**: Clear level 200 + Clear level 100 with all aircraft
4. **Level 200 Boss**: Defeat the 3-phase final boss (21,000 HP total)
5. **Infinite Master**: Reach the highest level in infinite mode
6. **Upgrade Master**: Stack all possible upgrades
7. **Boss Rush**: Defeat all 10 boss types
8. **Leaderboard King**: Claim the #1 spot on the leaderboard

## 🎨 Game Information

- **Genre**: Vertical Scrolling Shooter
- **Graphics**: Pixel Art (320x480)
- **Difficulty**: Beginner → Extreme → Infinite
- **Total Stages**: 200 levels + Infinite Mode
- **Total Bosses**: 10 types (repeating cycle)
- **Game Modes**: Normal Mode, Infinite Mode
- **Languages**: English
- **Play Time**: Unlimited

## 🆕 Latest Updates

### Version 2.0 - Major Update
- ✨ **Divine Destroyer Aircraft**: New ultimate aircraft with infinite progression
- ♾️ **Infinite Mode**: Endless challenge beyond level 200
- 🏆 **Leaderboard System**: Compete for highest scores
- 👤 **Player Name System**: Personalize your gaming experience
- 🎯 **Mode Selection**: Choose between Normal and Infinite modes
- 📊 **Progressive Difficulty**: Dynamic difficulty scaling in infinite mode

### Boss Enhancements
- **Level 200 Boss**: 3-phase system (21,000 HP total)
  - Phase 1: Red-purple-blue gradient with 8 lightning effects
  - Phase 2: Heal to 6,000 HP, 48-direction burst + wave attacks
  - Phase 3: Heal to 9,000 HP, 64-direction spiral + 8-direction lasers
- **Boss HP Rebalance**: 3x multiplier across all bosses
- **Infinite Mode Bosses**: Continuously scaling HP

### Gameplay Improvements
- **Diagonal Shot Stacking**: Level-based bullet count (3, 5, 7...)
- **Enhanced Upgrade System**: More diverse upgrade options
- **Balanced Difficulty**: Progressive scaling for infinite mode
- **Visual Effects**: Enhanced boss phase transitions

## 🚀 Getting Started

1. Open `index.html` in a web browser
2. Enter your player name
3. Select game mode (Normal / Infinite)
4. Choose your aircraft
5. Select starting level
6. Start your mission!

## 💡 Tips

- **Upgrade Strategy**: Focus on fire rate and damage for maximum DPS
- **Shield Management**: Use shields wisely, they're your first line of defense
- **Skill Timing**: Save skills for boss battles and critical moments
- **Diagonal Shots**: Stack diagonal shot upgrades for massive firepower
- **Infinite Mode**: Start with Divine Destroyer for the best chance

---

**Good Luck, Pilot! 🛩️✨**

*May you reach the top of the leaderboard and conquer the infinite skies!*

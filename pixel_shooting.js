const bossSpecialUpgrades = [
  "megaAttack",   // 공격력 +3
  "superShield",  // 방어막 +5
  "diagonalShot", // 대각선 방향으로 발사
  ];

// 비행기 타입 정의
const aircraftTypes = [
  {
    id: "fighter",
    name: "F-16 Fighter",
    description: "균형잡힌 전투기",
    skillName: "Missile Barrage",
    skillDesc: "전방 5발 미사일",
    color: "#66d9ff",
    stats: {
      lives: 10,
      moveSpeed: 50,
      shootCooldown: 0.3,
      shield: 0,
      attackPower: 1
    }
  },
  {
    id: "bomber",
    name: "B-52 Bomber",
    description: "강력한 화력, 느린 속도",
    skillName: "Carpet Bomb",
    skillDesc: "광역 폭격",
    color: "#ff9966",
    stats: {
      lives: 12,
      moveSpeed: 35,
      shootCooldown: 0.25,
      shield: 1,
      attackPower: 2
    }
  },
  {
    id: "stealth",
    name: "Stealth Fighter",
    description: "빠른 속도, 낮은 체력",
    skillName: "Stealth Mode",
    skillDesc: "무적 + 고속이동",
    color: "#9966ff",
    stats: {
      lives: 7,
      moveSpeed: 70,
      shootCooldown: 0.2,
      shield: 0,
      attackPower: 1
    }
  },
  {
    id: "interceptor",
    name: "Interceptor",
    description: "초고속 연사",
    skillName: "Laser Beam",
    skillDesc: "관통 레이저",
    color: "#ffff66",
    stats: {
      lives: 8,
      moveSpeed: 60,
      shootCooldown: 0.15,
      shield: 0,
      attackPower: 1
    }
  },
  {
    id: "tank",
    name: "Flying Fortress",
    description: "최고 방어력, 느린 공격",
    skillName: "Shield Burst",
    skillDesc: "전방위 총알",
    color: "#66ff66",
    stats: {
      lives: 15,
      moveSpeed: 30,
      shootCooldown: 0.4,
      shield: 3,
      attackPower: 1
    }
  }
];

// 보스 스킬을 플레이어 업그레이드로 변환
const bossSkillToUpgrade = {
  "tripleShot": "playerTripleShot",   // 3발 발사
  "rapidFire": "playerRapidFire",     // 빠른 연사
  "teleport": "playerTeleport",       // 순간이동
  "regen": "playerRegen",             // 체력 회복
  "lightning": "playerLightning",     // 번개 공격
  "timeWarp": "playerTimeWarp",       // 시간 왜곡
  "starfall": "playerStarfall",       // 별똥별 공격
  "chaos": "playerChaos"              // 카오스 공격
  // "final"과 "ultimate"는 제외 (50레벨, 100레벨 보스)
};


const { useRef, useEffect, useState } = React;

function PixelClassicShooter() {
  // ----- UI state -----
  const [lives, setLives] = useState(10);
  const [level, setLevel] = useState(1);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [showAircraftSelect, setShowAircraftSelect] = useState(true);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [availableUpgrades, setAvailableUpgrades] = useState([]);
  const [hitFlash, setHitFlash] = useState(false);

  // persistent upgrade trackers
  const [playerStats, setPlayerStats] = useState({ moveSpeed: 50, shootCooldown: 0.3, shield: 0 });

  // ----- refs to keep main loop stable (avoid reruns) -----
  const livesRef = useRef(lives);
  const levelRef = useRef(level);
  const runningRef = useRef(running);
  const gameOverRef = useRef(gameOver);
  const showUpgradeRef = useRef(showUpgrade);
  const availableUpgradesRef = useRef(availableUpgrades);
  const playerStatsRef = useRef(playerStats);
  const hitFlashRef = useRef(false);
  const selectedAircraftRef = useRef(selectedAircraft);

  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { showUpgradeRef.current = showUpgrade; }, [showUpgrade]);
  useEffect(() => { availableUpgradesRef.current = availableUpgrades; }, [availableUpgrades]);
  useEffect(() => { playerStatsRef.current = playerStats; }, [playerStats]);
  useEffect(() => { hitFlashRef.current = hitFlash; }, [hitFlash]);
  useEffect(() => { selectedAircraftRef.current = selectedAircraft; }, [selectedAircraft]);

  function setHitFlashTimed() {
    setHitFlash(true);
    setTimeout(() => setHitFlash(false), 200);
  }

  // ----- canvas & game state (mutable) -----
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const keysRef = useRef({});

  const gameRef = useRef({
    player: { x: 76, y: 400, w: 10, h: 8, cooldown: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    barriers: [],
    lastEnemyShotTime: 0,
    nextWaveScheduled: false,
  });

  const PIXEL_W = 320;
  const PIXEL_H = 480;

  // boss definitions (10,20,30,40,50,60,70,80,90,100)
  const bossDefinitions = [
    { name: "Iron Drone", skill: "tripleShot" },      // 10
    { name: "Plasma Reaper", skill: "rapidFire" },    // 20
    { name: "Shadow Warden", skill: "teleport" },     // 30
    { name: "Omega Core", skill: "regen" },           // 40
    { name: "Void Overlord", skill: "final" },        // 50
    { name: "Storm Striker", skill: "lightning" },     // 60
    { name: "Time Twister", skill: "timeWarp" },      // 70
    { name: "Star Destroyer", skill: "starfall" },     // 80
    { name: "Chaos Emperor", skill: "chaos" },         // 90
    { name: "ETERNAL NEMESIS", skill: "ultimate" }     // 100: 최종 보스
  ];

  // ----- spawn wave (reads barrier refs) -----
    function spawnWave(levelNum = 1) {
    const enemies = [];
    const isBossWave = levelNum % 10 === 0;
    if (isBossWave) {
      const idx = Math.max(0, Math.min(bossDefinitions.length - 1, (Math.floor(levelNum / 10) - 1) % bossDefinitions.length));
      const def = bossDefinitions[idx];
      const bossHeight = 18; // 보스의 높이
      enemies.push({
        x: PIXEL_W / 2 - 15,
        y: 45 + bossHeight, // 보스 높이를 더 아래로 조정
        w: 30,
        h: bossHeight,
        dir: 1,
        hp: 30 + levelNum * 2,
        baseHp: 30 + levelNum * 2,
        boss: true,
        name: def.name,
        skill: def.skill,
        skillCooldown: 0
      });
    } else {
      // 🔹 랜덤한 적 패턴 생성
      const patternType = Math.floor(Math.random() * 4); // 0~3 패턴 중 하나
      const enemyHP = 1 + (levelNum - 1) * 0.25;

      if (patternType === 0) {
        // 💠 기본 격자 패턴
        const cols = Math.min(5, 3 + Math.floor(levelNum / 2));
        const rows = Math.min(2, 1 + Math.floor(levelNum / 3));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (enemies.length >= 10) break;
            enemies.push({ x: 8 + c * 18, y: 8 + r * 14, w: 8, h: 6, dir: 1, hp: enemyHP, baseHp: enemyHP, boss: false });
          }
          if (enemies.length >= 10) break;
        }
      } else if (patternType === 1) {
        // 🔹 삼각형 형태
        const rows = Math.min(4, 2 + Math.floor(levelNum / 2));
        for (let r = 0; r < rows; r++) {
          const count = r + 1;
          const startX = (PIXEL_W / 2) - (count * 9);
          for (let c = 0; c < count; c++) {
            if (enemies.length >= 10) break;
            enemies.push({ x: startX + c * 18, y: 10 + r * 14, w: 8, h: 6, dir: 1, hp: enemyHP, baseHp: enemyHP, boss: false });
          }
          if (enemies.length >= 10) break;
        }
      } else if (patternType === 2) {
        // 🔸 지그재그 형태
        const rows = Math.min(5, 1.5 + Math.floor(levelNum / 2));
        const cols = 2;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (enemies.length >= 10) break;
            const offset = (r % 2) * 9;
            enemies.push({ x: 10 + c * 18 + offset, y: 10 + r * 14, w: 8, h: 6, dir: 1, hp: enemyHP, baseHp: enemyHP, boss: false });
          }
          if (enemies.length >= 10) break;
        }
      } else {
        // 🔹 랜덤 스프레드 형태
        const count = Math.min(10, 3 + Math.floor(levelNum / 2));
        for (let i = 0; i < count; i++) {
          if (enemies.length >= 10) break;
          enemies.push({
            x: Math.random() * (PIXEL_W - 10),
            y: 8 + Math.random() * 40,
            w: 8,
            h: 6,
            dir: 1,
            hp: enemyHP,
            baseHp: enemyHP,
            boss: false
          });
        }
      }
    }


    const st = gameRef.current;
    st.enemies = enemies;
    st.barriers = [];
    st.bullets = [];
    st.enemyBullets = [];
    st.nextWaveScheduled = false;
    st.lastEnemyShotTime = 0;
  }

  // ----- upgrades pools -----
  const allUpgrades = ["speed", "fire", "life", "attackPower"];
  const rareUpgrades = ["ultraSpeed", "ultraFire", "shield"];

  function applyUpgrade(type) {
    setShowUpgrade(false);
    setRunning(true);

    if (type === "speed") {
      setPlayerStats((p) => { const nv = { ...p, moveSpeed: p.moveSpeed + 10 }; playerStatsRef.current = nv; return nv; });
    }
    if (type === "fire") {
      setPlayerStats((p) => { const nv = { ...p, shootCooldown: Math.max(0.05, p.shootCooldown - 0.05) }; playerStatsRef.current = nv; return nv; });
    }
    if (type === "life") {
      setLives((l) => { const nv = l + 1; livesRef.current = nv; return nv; });
    }

    if (type === "attackPower") { setPlayerStats((p) => ({ ...p, attackPower: p.attackPower + 1 }));
    }
    if (type === "ultraSpeed") {
      setPlayerStats((p) => { const nv = { ...p, moveSpeed: p.moveSpeed + 30 }; playerStatsRef.current = nv; return nv; });
    }
    if (type === "ultraFire") {
      setPlayerStats((p) => { const nv = { ...p, shootCooldown: Math.max(0.03, p.shootCooldown - 0.15) }; playerStatsRef.current = nv; return nv; });
    }
    if (type === "shield") {
      setPlayerStats((p) => { const nv = { ...p, shield: p.shield + 3  }; playerStatsRef.current = nv; return nv; });
    }
    
    if (type === "megaAttack") {
      setPlayerStats((p) => {
        const nv = { ...p, attackPower: (p.attackPower || 1) + 3 };
        playerStatsRef.current = nv;
        return nv;
      });
    }
    if (type === "superShield") {
      setPlayerStats((p) => {
        const nv = { ...p, shield: (p.shield || 0) + 5 };
        playerStatsRef.current = nv;
        return nv;
      });
  
    }
    if (type === "diagonalShot") {
      // 대각선 공격 모드 활성화 (중첩 가능)
      if (!playerStatsRef.current.diagonalShot) {
        playerStatsRef.current.diagonalShot = true;
      } else {
        // 이미 활성화되어 있으면 공격력 증가
        setPlayerStats((p) => {
          const nv = { ...p, attackPower: (p.attackPower || 1) + 1 };
          playerStatsRef.current = nv;
          return nv;
        });
      }
    }
    
    // 보스 스킬 업그레이드
    if (type === "playerTripleShot") {
      // 트리플샷 중첩 시 5연사로 업그레이드
      if (!playerStatsRef.current.tripleShot) {
        playerStatsRef.current.tripleShot = true;
      } else if (!playerStatsRef.current.pentaShot) {
        playerStatsRef.current.pentaShot = true;
      } else {
        // 이미 5연사면 공격력 증가
        setPlayerStats((p) => {
          const nv = { ...p, attackPower: (p.attackPower || 1) + 1 };
          playerStatsRef.current = nv;
          return nv;
        });
      }
    }
    if (type === "playerRapidFire") {
      setPlayerStats(p => {
        const nv = { ...p, shootCooldown: Math.max(0.03, p.shootCooldown * 0.7) };
        playerStatsRef.current = nv;
        return nv;
      });
    }
    if (type === "playerTeleport") {
      if (!playerStatsRef.current.canTeleport) {
        playerStatsRef.current.canTeleport = true;
        playerStatsRef.current.teleportCooldown = 0;
      } else {
        // 텔레포트 쿨다운 감소
        setPlayerStats((p) => {
          const nv = { ...p, moveSpeed: p.moveSpeed + 20 };
          playerStatsRef.current = nv;
          return nv;
        });
      }
    }
    if (type === "playerRegen") {
      if (!playerStatsRef.current.regenEnabled) {
        playerStatsRef.current.regenEnabled = true;
        playerStatsRef.current.regenLevel = 1;
        // 3초마다 체력 회복
        setInterval(() => {
          if (playerStatsRef.current.regenEnabled) {
            const maxLives = 10 + (playerStatsRef.current.regenLevel || 1) * 5;
            if (livesRef.current < maxLives) {
              setLives(l => {
                const nv = Math.min(maxLives, l + (playerStatsRef.current.regenLevel || 1));
                livesRef.current = nv;
                return nv;
              });
            }
          }
        }, 3000);
      } else {
        // 리젠 레벨 증가
        playerStatsRef.current.regenLevel = (playerStatsRef.current.regenLevel || 1) + 1;
      }
    }
    if (type === "playerLightning") {
      // 번개 공격 능력 (중첩 시 확률 증가)
      if (!playerStatsRef.current.hasLightning) {
        playerStatsRef.current.hasLightning = true;
        playerStatsRef.current.lightningLevel = 1;
      } else {
        playerStatsRef.current.lightningLevel = (playerStatsRef.current.lightningLevel || 1) + 1;
      }
    }
    if (type === "playerTimeWarp") {
      // 시간 왜곡 능력 (중첩 시 확률 증가)
      if (!playerStatsRef.current.hasTimeWarp) {
        playerStatsRef.current.hasTimeWarp = true;
        playerStatsRef.current.timeWarpLevel = 1;
      } else {
        playerStatsRef.current.timeWarpLevel = (playerStatsRef.current.timeWarpLevel || 1) + 1;
      }
    }
    if (type === "playerStarfall") {
      // 별똥별 공격 능력 (중첩 시 확률 증가)
      if (!playerStatsRef.current.hasStarfall) {
        playerStatsRef.current.hasStarfall = true;
        playerStatsRef.current.starfallLevel = 1;
      } else {
        playerStatsRef.current.starfallLevel = (playerStatsRef.current.starfallLevel || 1) + 1;
      }
    }
    if (type === "playerChaos") {
      // 카오스 공격 (중첩 시 확률 증가)
      if (!playerStatsRef.current.hasChaos) {
        playerStatsRef.current.hasChaos = true;
        playerStatsRef.current.chaosLevel = 1;
      } else {
        playerStatsRef.current.chaosLevel = (playerStatsRef.current.chaosLevel || 1) + 1;
      }
    }
    if (type === "playerFinalForm") {
      // 최종 형태: 모든 능력 강화 (50레벨 보스 - 제외하지만 유지)
      setPlayerStats(p => {
        const nv = {
          ...p,
          moveSpeed: p.moveSpeed * 1.5,
          shootCooldown: Math.max(0.05, p.shootCooldown * 0.7),
          shield: p.shield + 3
        };
        playerStatsRef.current = nv;
        return nv;
      });
    }

    spawnWave(levelRef.current);
  }

  // ----- keyboard handlers -----
  useEffect(() => {
    function kd(e) {
      keysRef.current[e.key] = true;
      if (gameOverRef.current && e.key === "Enter") restartGame();
    }
    function ku(e) { keysRef.current[e.key] = false; }
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  // ----- restart -----
  function restartGame() {
    // 비행기 선택 화면으로 돌아가기
    setGameOver(false); gameOverRef.current = false;
    setRunning(false); runningRef.current = false;
    setShowUpgrade(false); showUpgradeRef.current = false;
    setShowLevelSelect(false);
    setShowAircraftSelect(true);
    setSelectedAircraft(null); selectedAircraftRef.current = null;
    setLevel(1); levelRef.current = 1;

    gameRef.current = {
      player: { x: 76, y: 400, w: 10, h: 8, cooldown: 0 },
      bullets: [], enemyBullets: [], enemies: [], barriers: [], lastEnemyShotTime: 0, nextWaveScheduled: false
    };
  }

  // ----- main loop (runs once) -----
  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = PIXEL_W;
    canvas.height = PIXEL_H;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    spawnWave(levelRef.current);

    let last = performance.now();

    function draw() {
      const st = gameRef.current;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, PIXEL_W, PIXEL_H);

      // player (F16 style)
      const p = st.player;
      const aircraft = selectedAircraftRef.current || aircraftTypes[0];
      const baseColor = aircraft.color;
      
      // 스텔스 모드일 때 반투명 효과
      ctx.save();
      if (playerStatsRef.current.stealthActive) {
        ctx.globalAlpha = 0.4;
      }
      
      // Base color
      ctx.fillStyle = hitFlashRef.current ? "#ff3333" : baseColor;
      
      // Main body
      ctx.fillRect(p.x + 3, p.y, p.w - 6, p.h + 2); // Fuselage
      
      // Wings
      ctx.fillRect(p.x, p.y + 3, p.w, 2); // Main wings
      ctx.fillRect(p.x + 2, p.y + 1, 4, 1); // Small front wings
      
      // Tail
      ctx.fillRect(p.x + 3, p.y + 6, 2, 2); // Vertical stabilizer
      
      // Cockpit (lighter shade)
      const lighterColor = hitFlashRef.current ? "#ff9999" : baseColor.replace(/[0-9a-f]{2}$/i, (m) => {
        const val = parseInt(m, 16);
        return Math.min(255, val + 50).toString(16).padStart(2, '0');
      });
      ctx.fillStyle = lighterColor;
      ctx.fillRect(p.x + 3, p.y + 1, 2, 2);
      
      ctx.restore();
      
      // Shield effect
      if (playerStatsRef.current.shield > 0) {
        ctx.strokeStyle = "#00ffff";
        ctx.strokeRect(p.x - 1, p.y - 1, p.w + 2, p.h + 4);
      }

      // bullets
      for (const b of st.bullets) {
        if (b.laser) {
          // 레이저 렌더링 (수직 레이저)
          ctx.save();
          const gradient = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
          gradient.addColorStop(0, "rgba(0, 255, 255, 0.3)");
          gradient.addColorStop(0.5, "rgba(0, 255, 255, 1)");
          gradient.addColorStop(1, "rgba(0, 255, 255, 0.3)");
          ctx.fillStyle = gradient;
          ctx.fillRect(b.x, 0, b.w, b.h);
          
          // 레이저 글로우 효과
          ctx.globalAlpha = 0.5;
          ctx.fillRect(b.x - 1, 0, b.w + 2, b.h);
          ctx.restore();
        } else if (b.missile) {
          // 미사일 (빨간색, 더 크고 강력해 보이게)
          ctx.fillStyle = "#ff0000";
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.fillStyle = "#ff8800";
          ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
        } else if (b.bomb) {
          // 폭탄 (검은색 폭탄)
          ctx.fillStyle = "#333333";
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.fillStyle = "#666666";
          ctx.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
        } else if (b.shield) {
          // 보호막 (파란색 반투명)
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.fillStyle = "#00aaff";
          ctx.fillRect(b.x, b.y, b.w, b.h);
          ctx.restore();
        } else {
          // 일반 총알
          ctx.fillStyle = b.color || "#ffff66";
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
      }
      for (const b of st.enemyBullets) {
        ctx.fillStyle = b.color || "#ff6666";
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }

      // enemies
      for (const e of st.enemies) {
        if (e.boss) {
          // 보스 몸체
          if (e.skill === "ultimate") {
            // 최종 보스 특별 렌더링
            const isPhase2 = e.phase2 === true;
            const gradient = ctx.createLinearGradient(e.x, e.y, e.x + e.w, e.y + e.h);
            
            if (isPhase2) {
              // 2페이즈 색상 (더 어둡고 강렬함)
              gradient.addColorStop(0, "#8800ff");
              gradient.addColorStop(0.5, "#ff0088");
              gradient.addColorStop(1, "#000000");
            } else {
              gradient.addColorStop(0, "#ff0000");
              gradient.addColorStop(0.5, "#ff00ff");
              gradient.addColorStop(1, "#0000ff");
            }
            ctx.fillStyle = gradient;
            
            // 보스 주위에 에너지 오라 효과
            ctx.save();
            ctx.globalAlpha = isPhase2 ? 0.5 : 0.3;
            for (let i = 0; i < (isPhase2 ? 5 : 3); i++) {
              const pulseScale = 1 + Math.sin(performance.now() / (isPhase2 ? 150 : 200)) * 0.1;
              ctx.fillRect(
                e.x - i * 2 * pulseScale, 
                e.y - i * 2 * pulseScale, 
                e.w + i * 4 * pulseScale, 
                e.h + i * 4 * pulseScale
              );
            }
            ctx.restore();
            
            // 보스 주위에 전기 효과
            ctx.save();
            ctx.strokeStyle = isPhase2 ? "#ff00ff" : "#00ffff";
            ctx.lineWidth = isPhase2 ? 2 : 1;
            const time = performance.now() / 1000;
            const lightningCount = isPhase2 ? 12 : 8;
            for (let i = 0; i < lightningCount; i++) {
              const angle = (time + i * Math.PI / (lightningCount / 2)) % (Math.PI * 2);
              ctx.beginPath();
              ctx.moveTo(
                e.x + e.w/2 + Math.cos(angle) * (e.w/2 + 5),
                e.y + e.h/2 + Math.sin(angle) * (e.h/2 + 5)
              );
              ctx.lineTo(
                e.x + e.w/2 + Math.cos(angle) * (e.w/2 + (isPhase2 ? 20 : 15)),
                e.y + e.h/2 + Math.sin(angle) * (e.h/2 + (isPhase2 ? 20 : 15))
              );
              ctx.stroke();
            }
            ctx.restore();
            
            // 보스 본체
            ctx.fillStyle = gradient;
            ctx.fillRect(e.x, e.y, e.w, e.h);
          } else {
            ctx.fillStyle = "#ff00ff";
            ctx.fillRect(e.x, e.y, e.w, e.h);
          }

          // 체력바 배경 (최종 보스는 더 크고 화려하게)
          const healthBarWidth = e.skill === "ultimate" ? 60 : 40;
          const healthBarHeight = e.skill === "ultimate" ? 6 : 4;
          const healthBarY = e.y - (e.skill === "ultimate" ? 20 : 12);
          
          // 체력바 그림자 효과
          if (e.skill === "ultimate") {
            ctx.shadowColor = "#ff0000";
            ctx.shadowBlur = 10;
          }
          
          ctx.fillStyle = "#333";
          ctx.fillRect(
            e.x + e.w/2 - healthBarWidth/2,
            healthBarY,
            healthBarWidth,
            healthBarHeight
          );

          // 보스 이름 (보스 아래에 표시)
          ctx.shadowBlur = 0; // 그림자 효과 초기화
          const isPhase2Display = e.boss && e.skill === "ultimate" && e.phase2;
          const bossNameText = e.skill === "ultimate" && isPhase2Display ? e.name + " [PHASE 2]" : e.name;
          ctx.fillStyle = e.skill === "ultimate" ? (isPhase2Display ? "#ff00ff" : "#ffff99") : "#ff99ff";
          ctx.font = e.skill === "ultimate" ? "bold 10px monospace" : "bold 8px monospace";
          const nameWidth = ctx.measureText(bossNameText).width;
          
          // 이름 배경
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(
            e.x + e.w/2 - nameWidth/2 - 2,
            e.y + e.h + 2,
            nameWidth + 4,
            e.skill === "ultimate" ? 12 : 10
          );
          
          // 이름 텍스트
          ctx.fillStyle = e.skill === "ultimate" ? (isPhase2Display ? "#ff00ff" : "#ffff99") : "#ff99ff";
          ctx.fillText(
            bossNameText,
            e.x + e.w/2 - nameWidth/2,
            e.y + e.h + (e.skill === "ultimate" ? 11 : 9)
          );

          // 체력바
          const healthRatio = e.hp / e.baseHp;
          let gradient;
          
          if (e.skill === "ultimate") {
            // 최종 보스 특별 체력바 그라데이션
            gradient = ctx.createLinearGradient(
              e.x + e.w/2 - healthBarWidth/2, healthBarY,
              e.x + e.w/2 + healthBarWidth/2, healthBarY
            );
            gradient.addColorStop(0, "#ff0000");
            gradient.addColorStop(0.3, "#ff00ff");
            gradient.addColorStop(0.6, "#0000ff");
            gradient.addColorStop(1, "#00ffff");
            
            // 체력바 글로우 효과
            ctx.shadowColor = "#ff0000";
            ctx.shadowBlur = 10;
          } else {
            gradient = ctx.createLinearGradient(
              e.x + e.w/2 - healthBarWidth/2, healthBarY,
              e.x + e.w/2 + healthBarWidth/2, healthBarY
            );
            gradient.addColorStop(0, "#ff0000");
            gradient.addColorStop(0.5, "#ffff00");
            gradient.addColorStop(1, "#00ff00");
          }
          
          ctx.fillStyle = gradient;
          ctx.fillRect(
            e.x + e.w/2 - healthBarWidth/2,
            healthBarY,
            healthBarWidth * healthRatio,
            healthBarHeight
          );
          
          // 체력 수치
          ctx.shadowBlur = 0; // 그림자 효과 초기화
          ctx.fillStyle = e.skill === "ultimate" ? "#ffff00" : "#fff";
          ctx.font = e.skill === "ultimate" ? "bold 8px monospace" : "8px monospace";
          const hpText = `${Math.ceil(e.hp)}/${Math.ceil(e.baseHp)}`;
          const hpWidth = ctx.measureText(hpText).width;
          ctx.fillText(
            hpText,
            e.x + e.w/2 - hpWidth/2,
            healthBarY - 8
          );
        } else {
          const ratio = e.hp / e.baseHp;
          const red = Math.floor(255 - 155 * ratio);
          const green = Math.floor(100 + 155 * ratio);
          ctx.fillStyle = `rgb(${red},${green},66)`;
          ctx.fillRect(e.x, e.y, e.w, e.h);
        }
      }

      // UI
      ctx.fillStyle = hitFlashRef.current ? "#ff4444" : "#fff";
      ctx.font = "8px monospace";
      ctx.fillText(`LIVES:${livesRef.current}`, PIXEL_W - 62, 10);
      ctx.fillText(`LEVEL:${levelRef.current}`, PIXEL_W / 2 - 20, 10);
      
      // 스킬 쿨다운 표시
      const skillCooldown = playerStatsRef.current.skillCooldown || 0;
      if (skillCooldown > 0) {
        ctx.fillStyle = "#ff8800";
        ctx.fillText(`SKILL: ${skillCooldown.toFixed(1)}s`, 5, 20);
      } else {
        ctx.fillStyle = "#00ff00";
        ctx.fillText(`SKILL: READY [W]`, 5, 20);
      }
      
      // 스텔스 모드 표시
      if (playerStatsRef.current.stealthActive) {
        ctx.fillStyle = "#ff00ff";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`STEALTH MODE!`, PIXEL_W / 2 - 35, PIXEL_H - 20);
        ctx.font = "8px monospace";
        ctx.fillText(`${playerStatsRef.current.stealthDuration.toFixed(1)}s`, PIXEL_W / 2 - 10, PIXEL_H - 10);
      }

      // game over overlay
      if (gameOverRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, PIXEL_H / 2 - 20, PIXEL_W, 40);
        ctx.fillStyle = "#fff";
        ctx.font = "10px monospace";
        ctx.fillText(levelRef.current > 100 ? "YOU WIN! GAME CLEAR 🎉" : "GAME OVER", PIXEL_W / 2 - 40, PIXEL_H / 2);
        ctx.font = "7px monospace";
        ctx.fillText("Press Enter to restart", PIXEL_W / 2 - 45, PIXEL_H / 2 + 10);
      }
    }

    function update(dt) {
      if (gameOverRef.current || showUpgradeRef.current) return;
      const st = gameRef.current;
      const p = st.player;

      // lives가 0 이하인지 체크
      if (livesRef.current <= 0) {
        setGameOver(true); 
        gameOverRef.current = true;
        setRunning(false); 
        runningRef.current = false;
        return;
      }

      // movement
      if (keysRef.current["ArrowLeft"]) p.x -= playerStatsRef.current.moveSpeed * dt / 700;
      if (keysRef.current["ArrowRight"]) p.x += playerStatsRef.current.moveSpeed * dt / 700;
      if (keysRef.current["ArrowUp"]) p.y -= playerStatsRef.current.moveSpeed * dt / 700;
      if (keysRef.current["ArrowDown"]) p.y += playerStatsRef.current.moveSpeed * dt / 700;
      p.x = Math.max(0, Math.min(PIXEL_W - p.w, p.x));
      p.y = Math.max(0, Math.min(PIXEL_H - p.h, p.y));

      // shooting
      st.player.cooldown -= dt / 1000;
      
      // 스킬 쿨다운 감소
      if (playerStatsRef.current.skillCooldown > 0) {
        playerStatsRef.current.skillCooldown -= dt / 1000;
      }
      
      // W키로 고유 스킬 발동
      if ((keysRef.current["w"] || keysRef.current["W"]) && playerStatsRef.current.skillCooldown <= 0) {
        const aircraftId = playerStatsRef.current.aircraftId;
        console.log("스킬 발동:", aircraftId);
        
        if (aircraftId === "fighter") {
          // Missile Barrage: 전방 5발 미사일 발사
          console.log("Fighter 미사일 발사!");
          for (let i = 0; i < 5; i++) {
            st.bullets.push({ 
              x: p.x + p.w / 2 - 1 + (i - 2) * 4, 
              y: p.y - 4, 
              w: 3, 
              h: 6, 
              dy: -150,
              missile: true
            });
          }
          playerStatsRef.current.skillCooldown = 8;
        } 
        else if (aircraftId === "bomber") {
          // Carpet Bomb: 광역 폭격 (전방에 폭탄 투하)
          console.log("Bomber 폭탄 발사!");
          for (let i = 0; i < 3; i++) {
            st.bullets.push({ 
              x: p.x + p.w / 2 - 2 + (i - 1) * 8, 
              y: p.y - 10, 
              w: 4, 
              h: 4, 
              dy: -100,
              bomb: true,
              bombRadius: 25
            });
          }
          playerStatsRef.current.skillCooldown = 10;
        }
        else if (aircraftId === "stealth") {
          // Stealth Mode: 3초간 무적 + 고속이동
          console.log("Stealth 모드 활성화!");
          playerStatsRef.current.stealthActive = true;
          playerStatsRef.current.stealthDuration = 3;
          playerStatsRef.current.originalSpeed = playerStatsRef.current.moveSpeed;
          playerStatsRef.current.moveSpeed = playerStatsRef.current.moveSpeed * 2;
          playerStatsRef.current.skillCooldown = 12;
        }
        else if (aircraftId === "interceptor") {
          // Laser Beam: 관통 레이저
          console.log("Interceptor 레이저 발사!");
          st.bullets.push({ 
            x: p.x + p.w / 2 - 2, 
            y: 0, 
            w: 4, 
            h: p.y, 
            dy: 0,
            laser: true,
            laserDuration: 0.75,
            followPlayer: true  // 플레이어를 따라다님
          });
          playerStatsRef.current.skillCooldown = 7;
        }
        else if (aircraftId === "tank") {
          // Shield Burst: 전방위 보호막 발사
          console.log("Tank 전방위 총알 발사!");
          for (let angle = 0; angle < 360; angle += 30) {
            const rad = angle * Math.PI / 180;
            st.bullets.push({ 
              x: p.x + p.w / 2, 
              y: p.y + p.h / 2, 
              w: 3, 
              h: 3, 
              dx: Math.sin(rad) * 80,
              dy: -Math.cos(rad) * 80,
              shield: true
            });
          }
          playerStatsRef.current.skillCooldown = 9;
        }
      }
      
      // Stealth 모드 지속시간 감소
      if (playerStatsRef.current.stealthActive) {
        playerStatsRef.current.stealthDuration -= dt / 1000;
        if (playerStatsRef.current.stealthDuration <= 0) {
          playerStatsRef.current.stealthActive = false;
          playerStatsRef.current.moveSpeed = playerStatsRef.current.originalSpeed;
        }
      }
      
      // 순간이동 처리
      if (playerStatsRef.current.canTeleport && keysRef.current["Shift"] && playerStatsRef.current.teleportCooldown <= 0) {
        // 마우스 위치나 랜덤한 안전한 위치로 순간이동
        p.x = Math.random() * (PIXEL_W - p.w);
        p.y = Math.max(PIXEL_H * 0.5, Math.min(PIXEL_H - p.h, p.y));
        playerStatsRef.current.teleportCooldown = 3; // 3초 쿨다운
      }
      if (playerStatsRef.current.teleportCooldown > 0) {
        playerStatsRef.current.teleportCooldown -= dt / 1000;
      }

      if ((keysRef.current[" "] || keysRef.current["Space"]) && st.player.cooldown <= 0) {
        // 기본 발사
        st.bullets.push({ x: p.x + p.w / 2 - 1, y: p.y - 4, w: 2, h: 4, dy: -120 });

        // 대각선 공격이 활성화된 경우 대각선으로 발사
        if (playerStatsRef.current.diagonalShot) {
          st.bullets.push({ 
            x: p.x + p.w / 2 - 1, 
            y: p.y - 4, 
            w: 2, 
            h: 4, 
            dy: -100, 
            dx: -60  // 왼쪽 대각선
          });
          st.bullets.push({ 
            x: p.x + p.w / 2 - 1, 
            y: p.y - 4, 
            w: 2, 
            h: 4, 
            dy: -100, 
            dx: 60   // 오른쪽 대각선
          });
        }

        // 보스에서 획득한 tripleShot 스킬
        if (playerStatsRef.current.tripleShot) {
          for (let i = -1; i <= 1; i++) {
            if (i !== 0) { // 중앙은 이미 발사됨
              st.bullets.push({ 
                x: p.x + p.w / 2 - 1 + (i * 4), 
                y: p.y - 4, 
                w: 2, 
                h: 4, 
                dy: -120
              });
            }
          }
        }
        
        // pentaShot (5연사)
        if (playerStatsRef.current.pentaShot) {
          for (let i = -2; i <= 2; i++) {
            if (i !== 0) { // 중앙은 이미 발사됨
              st.bullets.push({ 
                x: p.x + p.w / 2 - 1 + (i * 3), 
                y: p.y - 4, 
                w: 2, 
                h: 4, 
                dy: -120
              });
            }
          }
        }

        // 보스 스킬 자동 발동 (레벨에 따라 확률 증가)
        const skillChance = Math.random();
        
        // 번개 공격 (레벨당 15% 확률)
        const lightningLevel = playerStatsRef.current.lightningLevel || 0;
        if (playerStatsRef.current.hasLightning && skillChance < 0.15 * lightningLevel) {
          const count = 2 + Math.floor(lightningLevel / 2);
          for (let i = 0; i < count; i++) {
            const x = p.x + (Math.random() - 0.5) * 50;
            st.bullets.push({
              x: Math.max(0, Math.min(PIXEL_W, x)),
              y: p.y - 10,
              w: 3,
              h: 8,
              dy: -300,
              color: "#ffff00",
              isLightning: true
            });
          }
        }

        // 시간 왜곡 (레벨당 12% 확률)
        const timeWarpLevel = playerStatsRef.current.timeWarpLevel || 0;
        if (playerStatsRef.current.hasTimeWarp && skillChance < 0.12 * timeWarpLevel) {
          const bulletCount = 6 + timeWarpLevel * 2;
          for (let i = 0; i < bulletCount; i++) {
            const angle = (i * 360 / bulletCount) * Math.PI / 180;
            st.bullets.push({
              x: p.x + p.w / 2,
              y: p.y,
              w: 3,
              h: 3,
              dy: Math.sin(angle) * -150,
              dx: Math.cos(angle) * 150,
              color: "#ff00ff"
            });
          }
        }

        // 별똥별 공격 (레벨당 10% 확률)
        const starfallLevel = playerStatsRef.current.starfallLevel || 0;
        if (playerStatsRef.current.hasStarfall && skillChance < 0.10 * starfallLevel) {
          const count = 2 + starfallLevel;
          for (let i = 0; i < count; i++) {
            st.bullets.push({
              x: p.x + (i - count/2) * 15,
              y: p.y - 10,
              w: 4,
              h: 4,
              dy: -250,
              color: "#ffffff",
              isStar: true
            });
          }
        }

        // 카오스 공격 (레벨당 8% 확률)
        const chaosLevel = playerStatsRef.current.chaosLevel || 0;
        if (playerStatsRef.current.hasChaos && skillChance < 0.08 * chaosLevel) {
          const bulletCount = 8 + chaosLevel * 2;
          for (let i = 0; i < bulletCount; i++) {
            const angle = (i * 360 / bulletCount + Math.random() * 20) * Math.PI / 180;
            st.bullets.push({
              x: p.x + p.w / 2,
              y: p.y,
              w: 4,
              h: 4,
              dy: Math.sin(angle) * -180,
              dx: Math.cos(angle) * 180,
              color: "#ff0000"
            });
          }
        }

        st.player.cooldown = playerStatsRef.current.shootCooldown;
      }


      // move bullets
      for (let i = st.bullets.length - 1; i >= 0; i--) {
        const b = st.bullets[i];
        
        // 레이저는 지속시간만 감소하고 플레이어를 따라다님
        if (b.laser) {
          b.laserDuration -= dt / 1000;
          if (b.laserDuration <= 0) {
            st.bullets.splice(i, 1);
            continue;
          }
          // 플레이어 위치를 따라다님
          if (b.followPlayer) {
            b.x = p.x + p.w / 2 - 2;
            b.h = p.y; // 플레이어까지의 높이
          }
          continue;
        }
        
        // 폭탄의 경우 적에게 닿으면 폭발 범위 피해
        if (b.bomb) {
          b.y += b.dy * dt / 1000;
          
          // 적과 충돌 체크
          for (const e of st.enemies) {
            if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
              // 폭발 범위 내의 모든 적에게 피해
              for (const target of st.enemies) {
                const dx = (target.x + target.w/2) - (b.x + b.w/2);
                const dy = (target.y + target.h/2) - (b.y + b.h/2);
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < b.bombRadius) {
                  target.hp -= playerStatsRef.current.attackPower * 2;
                }
              }
              st.bullets.splice(i, 1);
              break;
            }
          }
        } else {
          b.y += b.dy * dt / 1000;
          // 대각선 총알이나 보호막의 경우 x 좌표도 이동
          if (b.dx) {
            b.x += b.dx * dt / 1000;
          }
        }
        
        // 화면 밖으로 나가면 제거
        if (b.y + b.h < 0 || b.x < 0 || b.x > PIXEL_W) st.bullets.splice(i, 1);
      }
      for (let i = st.enemyBullets.length - 1; i >= 0; i--) {
        const b = st.enemyBullets[i];
        b.y += (b.dy || 80) * dt / 1000;
        if (b.y > PIXEL_H) st.enemyBullets.splice(i, 1);
      }

      // enemy movement
      let reverse = false;
      for (const e of st.enemies) {
        const speed = e.boss ? 10 : 20;
        e.x += e.dir * speed * dt / 1000;
        if (e.x < 0 || e.x + e.w > PIXEL_W) reverse = true;
      }
            if (reverse) {
        for (const e of st.enemies) {
          e.dir *= -1;
          if (!e.boss) e.y += e.h; // normal enemies descend by their height
        }
      }

      let reverseTriggered = false;
for (const e of st.enemies) {
  const speed = e.boss ? 20 : 40;
  e.x += e.dir * speed * dt / 1000;
  if (e.x < 0 || e.x + e.w > PIXEL_W) reverseTriggered = false;
}

if (reverseTriggered) {
  for (const e of st.enemies) {
    e.dir *= -0.25 ;
    if (!e.boss) e.y += e.h;
  }
  // 💡 reverse가 한 번 발생하면 바로 한 프레임 쉬기
  reverseTriggered = true;
}

      // normal enemy shooting timer
      const now = performance.now();
      if (st.enemies.length > 0 && now - (st.lastEnemyShotTime || 0) > 700) {
        const shooter = st.enemies[Math.floor(Math.random() * st.enemies.length)];
        if (shooter && !shooter.boss) {
          st.enemyBullets.push({ x: shooter.x + shooter.w / 2 - 1, y: shooter.y + shooter.h, w: 2, h: 4, dy: 80 });
        }
        st.lastEnemyShotTime = now;
      }

      // boss skills and basic attacks
      for (const e of st.enemies) {
        if (!e.boss) continue;
        
        // 기본 공격 (모든 보스가 사용)
        if (now - (e.lastBasicAttackTime || 0) > 1000) {
          st.enemyBullets.push({ x: e.x + e.w / 2 - 1, y: e.y + e.h, w: 2, h: 4, dy: 100 });
          e.lastBasicAttackTime = now;
        }

        // 특수 스킬 (랜덤 타이밍)
        if (!e.nextSkillTime) {
          // 처음 스폰되었을 때 다음 스킬 사용 시간 설정
          e.nextSkillTime = now + Math.random() * 2000 + 1000; // 1~3초 사이
        }
        
        if (now >= e.nextSkillTime) {
          // 다음 스킬 사용 시간을 새로 설정 (각 보스마다 다른 간격)
          let minDelay, maxDelay;
          switch(e.skill) {
            case "tripleShot": // Iron Drone: 더 자주 공격
              minDelay = 1500;
              maxDelay = 3000;
              break;
            case "rapidFire": // Plasma Reaper: 매우 빠른 간격
              minDelay = 1000;
              maxDelay = 2500;
              break;
            case "teleport": // Shadow Warden: 예측하기 어려운 간격
              minDelay = 2000;
              maxDelay = 4000;
              break;
            case "regen": // Omega Core: 긴 간격
              minDelay = 3000;
              maxDelay = 5000;
              break;
            case "final": // Void Overlord: 불규칙한 간격
              minDelay = 1500;
              maxDelay = 4000;
              break;
            default:
              minDelay = 2000;
              maxDelay = 4000;
          }
          e.nextSkillTime = now + Math.random() * (maxDelay - minDelay) + minDelay;
          if (e.skill === "tripleShot") {
            // Iron Drone: 3발 발사 + 양쪽으로 회전하는 총알
            for (let i = -1; i <= 1; i++) {
              st.enemyBullets.push({ x: e.x + e.w / 2 - 1 + i * 6, y: e.y + e.h, w: 2, h: 4, dy: 120 });
            }
            // 회전하는 총알
            for (let angle = 0; angle < 360; angle += 45) {
              const rad = angle * Math.PI / 180;
              st.enemyBullets.push({
                x: e.x + e.w / 2,
                y: e.y + e.h / 2,
                w: 2,
                h: 2,
                dy: Math.sin(rad) * 100,
                dx: Math.cos(rad) * 100
              });
            }
            e.skillCooldown = 3;
          } else if (e.skill === "rapidFire") {
            // Plasma Reaper: 빠른 연속 발사 + 레이저
            for (let i = 0; i < 5; i++) {
              setTimeout(() => {
                if (e.hp > 0) { // 보스가 살아있을 때만
                  st.enemyBullets.push({
                    x: e.x + e.w / 2 - 1,
                    y: e.y + e.h,
                    w: 2,
                    h: 4,
                    dy: 160,
                    dx: (Math.random() - 0.5) * 50 // 약간의 탄막 효과
                  });
                }
              }, i * 100);
            }
            e.skillCooldown = 2;
          } else if (e.skill === "teleport") {
            // Shadow Warden: 순간이동 후 전방위 공격
            const oldX = e.x;
            const oldY = e.y;
            e.x = Math.random() * (PIXEL_W - e.w);
            // 이동 흔적에 총알 발사
            for (let i = 0; i < 5; i++) {
              st.enemyBullets.push({
                x: oldX + (e.x - oldX) * (i / 4),
                y: oldY + e.h,
                w: 2,
                h: 2,
                dy: 120
              });
            }
            e.skillCooldown = 4;
          } else if (e.skill === "regen") {
            // Omega Core: 회복하면서 방사형 공격
            e.hp = Math.min(e.baseHp, e.hp + 3);
            for (let i = 0; i < 8; i++) {
              const angle = (i * 45) * Math.PI / 180;
              st.enemyBullets.push({
                x: e.x + e.w / 2,
                y: e.y + e.h / 2,
                w: 3,
                h: 3,
                dy: Math.sin(angle) * 120,
                dx: Math.cos(angle) * 120
              });
            }
            e.skillCooldown = 5;
          } else if (e.skill === "final") {
            // Void Overlord (50레벨 보스): 복합 패턴
            for (let i = -2; i <= 2; i++) {
              st.enemyBullets.push({
                x: e.x + e.w / 2 - 1 + i * 5,
                y: e.y + e.h,
                w: 2,
                h: 4,
                dy: 180,
                dx: i * 20
              });
            }
            e.x = Math.random() * (PIXEL_W - e.w);
            e.hp = Math.min(e.baseHp, e.hp + 5);
            e.skillCooldown = 3;
          } else if (e.skill === "lightning") {
            // Storm Striker (60레벨 보스): 번개 공격
            const lightningCount = 3;
            for (let i = 0; i < lightningCount; i++) {
              let x = Math.random() * PIXEL_W;
              for (let j = 0; j < 5; j++) {
                setTimeout(() => {
                  if (e.hp > 0) {
                    x += (Math.random() - 0.5) * 30; // 지그재그 효과
                    st.enemyBullets.push({
                      x: x,
                      y: e.y + e.h + j * 40,
                      w: 3,
                      h: 8,
                      dy: 300,
                      color: "#ffff00" // 노란색 번개
                    });
                  }
                }, j * 100);
              }
            }
            e.skillCooldown = 4;
          } else if (e.skill === "timeWarp") {
            // Time Twister (70레벨 보스): 시간 왜곡 공격
            const bulletCount = 12;
            for (let i = 0; i < bulletCount; i++) {
              const angle = (i * 360 / bulletCount) * Math.PI / 180;
              const speed = 100;
              st.enemyBullets.push({
                x: e.x + e.w / 2,
                y: e.y + e.h / 2,
                w: 3,
                h: 3,
                dy: Math.sin(angle) * speed,
                dx: Math.cos(angle) * speed,
                timeWarp: true,
                age: 0,
                color: "#ff00ff" // 보라색 시간 왜곡
              });
            }
            e.skillCooldown = 3;
          } else if (e.skill === "starfall") {
            // Star Destroyer (80레벨 보스): 별똥별 공격
            for (let i = 0; i < 4; i++) {
              const x = Math.random() * PIXEL_W;
              st.enemyBullets.push({
                x: x,
                y: e.y,
                w: 4,
                h: 4,
                dy: 200,
                dx: 0,
                isStar: true,
                splits: 3,
                color: "#ffffff" // 흰색 별
              });
            }
            e.skillCooldown = 3;
          } else if (e.skill === "chaos") {
            // Chaos Emperor (90레벨 보스): 혼돈의 공격
            // 1. 무작위 텔레포트
            e.x = Math.random() * (PIXEL_W - e.w);
            
            // 2. 전방위 공격
            const patterns = ["spiral", "cross", "random"][Math.floor(Math.random() * 3)];
            if (patterns === "spiral") {
              for (let i = 0; i < 16; i++) {
                const angle = (i * 22.5) * Math.PI / 180;
                st.enemyBullets.push({
                  x: e.x + e.w / 2,
                  y: e.y + e.h / 2,
                  w: 3,
                  h: 3,
                  dy: Math.sin(angle) * 150,
                  dx: Math.cos(angle) * 150,
                  color: "#ff0000" // 빨간색
                });
              }
            } else if (patterns === "cross") {
              for (let i = -2; i <= 2; i++) {
                st.enemyBullets.push({
                  x: e.x + e.w / 2,
                  y: e.y + e.h / 2,
                  w: 3,
                  h: 3,
                  dy: i * 100,
                  dx: 150,
                  color: "#00ffff" // 청록색
                });
                st.enemyBullets.push({
                  x: e.x + e.w / 2,
                  y: e.y + e.h / 2,
                  w: 3,
                  h: 3,
                  dy: i * 100,
                  dx: -150,
                  color: "#00ffff"
                });
              }
            } else {
              for (let i = 0; i < 8; i++) {
                st.enemyBullets.push({
                  x: e.x + e.w / 2,
                  y: e.y + e.h / 2,
                  w: 3,
                  h: 3,
                  dy: (Math.random() - 0.5) * 300,
                  dx: (Math.random() - 0.5) * 300,
                  color: "#ff00ff" // 보라색
                });
              }
            }
            e.skillCooldown = 2;
          } else if (e.skill === "ultimate") {
            // ETERNAL NEMESIS (100레벨 최종 보스): 모든 패턴 집대성
            if (!e.phaseCounter) e.phaseCounter = 0;
            e.phaseCounter = (e.phaseCounter + 1) % 5; // 5개 패턴으로 확장

            // 2페이즈 체크 - 더 강력한 패턴
            const isPhase2 = e.phase2 === true;
            const bulletMultiplier = isPhase2 ? 1.5 : 1;
            const speedMultiplier = isPhase2 ? 1.3 : 1;

            // 페이즈 1: 전방위 레이저 + 방어막
            if (e.phaseCounter === 0) {
              const bulletCount = isPhase2 ? 36 : 24;
              const angleStep = 360 / bulletCount;
              for (let i = 0; i < bulletCount; i++) {
                const angle = (i * angleStep) * Math.PI / 180;
                st.enemyBullets.push({
                  x: e.x + e.w / 2,
                  y: e.y + e.h / 2,
                  w: isPhase2 ? 5 : 4,
                  h: isPhase2 ? 5 : 4,
                  dy: Math.sin(angle) * 200 * speedMultiplier,
                  dx: Math.cos(angle) * 200 * speedMultiplier,
                  color: isPhase2 ? "#ff00ff" : "#ff0000",
                  ultimate: true
                });
              }
              // 2페이즈 추가 공격: 회전하는 레이저
              if (isPhase2) {
                for (let i = 0; i < 8; i++) {
                  const angle = (i * 45 + 22.5) * Math.PI / 180;
                  st.enemyBullets.push({
                    x: e.x + e.w / 2,
                    y: e.y + e.h / 2,
                    w: 6,
                    h: 6,
                    dy: Math.sin(angle) * 150,
                    dx: Math.cos(angle) * 150,
                    color: "#00ffff",
                    ultimate: true
                  });
                }
              }
            }
            // 페이즈 2: 타임워프 + 스타폴
            else if (e.phaseCounter === 1) {
              const starCount = isPhase2 ? 8 : 5;
              for (let i = 0; i < starCount; i++) {
                const x = e.x + (i - starCount/2) * (e.w / 2);
                st.enemyBullets.push({
                  x: x,
                  y: e.y,
                  w: isPhase2 ? 8 : 6,
                  h: isPhase2 ? 8 : 6,
                  dy: 150 * speedMultiplier,
                  dx: 0,
                  color: "#ffffff",
                  ultimate: true,
                  splits: isPhase2 ? 6 : 4
                });
              }
              // 2페이즈 추가: 나선형 탄막
              if (isPhase2) {
                for (let i = 0; i < 12; i++) {
                  const angle = (i * 30) * Math.PI / 180;
                  st.enemyBullets.push({
                    x: e.x + e.w / 2,
                    y: e.y + e.h / 2,
                    w: 4,
                    h: 4,
                    dy: Math.sin(angle) * 180,
                    dx: Math.cos(angle) * 180,
                    color: "#ffff00",
                    ultimate: true
                  });
                }
              }
            }
            // 페이즈 3: 번개 폭풍
            else if (e.phaseCounter === 2) {
              const lightningCount = isPhase2 ? 12 : 8;
              for (let i = 0; i < lightningCount; i++) {
                const x = (PIXEL_W / (lightningCount - 1)) * i;
                const waveCount = isPhase2 ? 5 : 3;
                for (let j = 0; j < waveCount; j++) {
                  setTimeout(() => {
                    if (e.hp > 0) {
                      st.enemyBullets.push({
                        x: x + (Math.random() - 0.5) * 30,
                        y: e.y + j * 30,
                        w: isPhase2 ? 5 : 4,
                        h: isPhase2 ? 12 : 10,
                        dy: 250 * speedMultiplier,
                        color: "#ffff00",
                        ultimate: true
                      });
                    }
                  }, j * (isPhase2 ? 80 : 100));
                }
              }
              // 2페이즈 추가: 가로 레이저
              if (isPhase2) {
                for (let i = 0; i < 3; i++) {
                  setTimeout(() => {
                    if (e.hp > 0) {
                      for (let k = 0; k < 5; k++) {
                        st.enemyBullets.push({
                          x: k * (PIXEL_W / 4),
                          y: e.y + e.h,
                          w: 6,
                          h: 4,
                          dy: 200,
                          dx: (k - 2) * 50,
                          color: "#ff0000",
                          ultimate: true
                        });
                      }
                    }
                  }, i * 300);
                }
              }
            }
            // 페이즈 4: Void Overlord 복합 패턴 (50레벨 보스 스킬)
            else if (e.phaseCounter === 3) {
              // 5방향 확산 탄막
              const spreadCount = isPhase2 ? 7 : 5;
              for (let i = -(spreadCount-1)/2; i <= (spreadCount-1)/2; i++) {
                st.enemyBullets.push({
                  x: e.x + e.w / 2 - 1 + i * 5,
                  y: e.y + e.h,
                  w: isPhase2 ? 3 : 2,
                  h: isPhase2 ? 5 : 4,
                  dy: 180 * speedMultiplier,
                  dx: i * 20 * speedMultiplier,
                  color: isPhase2 ? "#00ff00" : "#ffffff",
                  ultimate: true
                });
              }
              // 텔레포트
              e.x = Math.random() * (PIXEL_W - e.w);
              
              // 체력 회복 (50레벨 보스 특성)
              e.hp = Math.min(e.baseHp, e.hp + (isPhase2 ? 8 : 5));
              
              // 2페이즈 추가: 텔레포트 후 십자 탄막
              if (isPhase2) {
                // 상하좌우 십자 탄막
                for (let i = -3; i <= 3; i++) {
                  if (i !== 0) {
                    // 수평
                    st.enemyBullets.push({
                      x: e.x + e.w / 2,
                      y: e.y + e.h / 2,
                      w: 4,
                      h: 4,
                      dy: 0,
                      dx: i * 60,
                      color: "#ff8800",
                      ultimate: true
                    });
                    // 수직
                    st.enemyBullets.push({
                      x: e.x + e.w / 2,
                      y: e.y + e.h / 2,
                      w: 4,
                      h: 4,
                      dy: i * 60,
                      dx: 0,
                      color: "#ff8800",
                      ultimate: true
                    });
                  }
                }
              }
            }
            // 페이즈 5: 카오스 에너지
            else {
              e.x = Math.random() * (PIXEL_W - e.w); // 텔레포트
              const chaosCount = isPhase2 ? 24 : 16;
              for (let i = 0; i < chaosCount; i++) {
                const angle = (i * (360 / chaosCount)) * Math.PI / 180;
                const speed = 180 * speedMultiplier;
                st.enemyBullets.push({
                  x: e.x + e.w / 2,
                  y: e.y + e.h / 2,
                  w: isPhase2 ? 5 : 4,
                  h: isPhase2 ? 5 : 4,
                  dy: Math.sin(angle) * speed,
                  dx: Math.cos(angle) * speed,
                  color: "#ff00ff",
                  ultimate: true
                });
              }
              // 2페이즈 추가: 추적 탄막
              if (isPhase2) {
                const p = st.player;
                for (let i = 0; i < 8; i++) {
                  const angleToPlayer = Math.atan2(p.y - e.y, p.x - e.x);
                  const spreadAngle = angleToPlayer + (i - 4) * 0.2;
                  st.enemyBullets.push({
                    x: e.x + e.w / 2,
                    y: e.y + e.h / 2,
                    w: 5,
                    h: 5,
                    dy: Math.sin(spreadAngle) * 220,
                    dx: Math.cos(spreadAngle) * 220,
                    color: "#00ff00",
                    ultimate: true
                  });
                }
              }
            }

            // 체력 회복 (2페이즈에서는 확률 감소)
            if (Math.random() < (isPhase2 ? 0.05 : 0.1)) {
              e.hp = Math.min(e.baseHp, e.hp + (isPhase2 ? 5 : 10));
            }

            e.skillCooldown = isPhase2 ? 1.0 : 1.5; // 2페이즈에서 더 빠른 스킬 사용
          } else {
            e.skillCooldown = 1;
          }
        }
      }

      // collisions: player bullets -> enemies
      for (let i = st.bullets.length - 1; i >= 0; i--) {
        const b = st.bullets[i];
        let bulletRemoved = false;
        
        for (let j = st.enemies.length - 1; j >= 0; j--) {
          const e = st.enemies[j];
          
          // 레이저는 특별 충돌 처리 (x축 범위 체크)
          if (b.laser) {
            if (b.x < e.x + e.w && b.x + b.w > e.x && e.y < b.y + b.h && e.y + e.h > 0) {
              const dmg = (playerStatsRef.current.attackPower || 1) * 3; // 레이저는 3배 데미지
              e.hp -= dmg * (dt / 1000) * 10; // 지속 피해
            }
            continue; // 레이저는 제거하지 않음
          }
          
          // 일반 충돌 체크
          if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
            const dmg = playerStatsRef.current.attackPower || 1;
            
            // 미사일은 2배 데미지
            if (b.missile) {
              e.hp -= dmg * 2;
            } 
            // 보호막은 1.5배 데미지
            else if (b.shield) {
              e.hp -= dmg * 1.5;
            }
            // 일반 총알
            else {
              e.hp -= dmg;
            }
            
            // 레이저와 보호막은 관통, 나머지는 제거
            if (!b.laser && !b.shield) {
              st.bullets.splice(i, 1);
              bulletRemoved = true;
            }

            // 최종 보스 2페이즈 전환 체크
            if (e.boss && e.skill === "ultimate" && e.hp <= 10 && !e.phase2) {
              e.phase2 = true;
              e.hp = e.baseHp; // 체력 완전 회복
              e.maxPhase2Hp = e.baseHp; // 2페이즈 최대 체력 저장
              // 2페이즈 시작 효과 (전방위 폭발)
              for (let k = 0; k < 32; k++) {
                const angle = (k * 11.25) * Math.PI / 180;
                st.enemyBullets.push({
                  x: e.x + e.w / 2,
                  y: e.y + e.h / 2,
                  w: 5,
                  h: 5,
                  dy: Math.sin(angle) * 250,
                  dx: Math.cos(angle) * 250,
                  color: "#ff0000",
                  phase2: true
                });
              }
              break;
            }

            if (e.hp <= 0) {
              const wasBoss = e.boss;
              const bossSkill = e.skill;
              st.enemies.splice(j, 1);
              // 💥 보스 처치 시 특별 업그레이드 등장
              if (wasBoss) {
                let picks = bossSpecialUpgrades.slice().sort(() => 0.5 - Math.random()).slice(0, 3);
                
                // 25% 확률로 보스 스킬을 업그레이드 목록에 추가
                if (Math.random() < 0.25 && bossSkill && bossSkillToUpgrade[bossSkill]) {
                  picks[Math.floor(Math.random() * picks.length)] = bossSkillToUpgrade[bossSkill];
                }
                
                setAvailableUpgrades(picks);
                availableUpgradesRef.current = picks;
                setShowUpgrade(true);
                showUpgradeRef.current = true;
                setRunning(false);
                runningRef.current = false;
              }
            }

            if (bulletRemoved) break;
          }
        }
      }

      // enemy bullets -> player
      for (let i = st.enemyBullets.length - 1; i >= 0; i--) {
        const eb = st.enemyBullets[i];
        if (eb.x < p.x + p.w && eb.x + eb.w > p.x && eb.y < p.y + p.h && eb.y + eb.h > p.y) {
          st.enemyBullets.splice(i, 1);
          
          // 스텔스 모드 중에는 피해 무시
          if (playerStatsRef.current.stealthActive) {
            continue;
          }
          
          setHitFlashTimed();
          if (playerStatsRef.current.shield > 0) {
            setPlayerStats(ps => { const nv = { ...ps, shield: Math.max(0, ps.shield - 1) }; playerStatsRef.current = nv; return nv; });
            continue;
          }
          setLives((l) => {
            const nv = l - 1;
            livesRef.current = nv;
            if (nv <= 0) {
              setGameOver(true); gameOverRef.current = true;
              setRunning(false); runningRef.current = false;
            }
            return Math.max(0, nv);
          });
        }
      }

      // 적이 화면 끝까지 내려오면 라이프 감소
      let enemiesReachedBottom = 0;
      for (let i = st.enemies.length - 1; i >= 0; i--) {
        const e = st.enemies[i];
        if (e.y >= PIXEL_H) {
          enemiesReachedBottom++;
          st.enemies.splice(i, 1);
        }
      }
      
      if (enemiesReachedBottom > 0) {
        setLives((l) => {
          const nv = l - enemiesReachedBottom;
          livesRef.current = nv;
          if (nv <= 0) {
            setGameOver(true); 
            gameOverRef.current = true;
            setRunning(false); 
            runningRef.current = false;
          }
          return Math.max(0, nv);
        });
      }

      // wave cleared?
     
      if (st.enemies.length === 0 && !st.nextWaveScheduled) {
        st.nextWaveScheduled = true;
        setTimeout(() => {
          const nextLevel = levelRef.current + 1;
          if (nextLevel > 100) {
            setGameOver(true); gameOverRef.current = true;
            setRunning(false); runningRef.current = false;
            return;
          }
          setLevel(nextLevel); levelRef.current = nextLevel;

          // every 5 waves show upgrades, except if it's a boss wave (10,20,...)
          if (nextLevel % 5 === 0 && nextLevel % 10 !== 0) {
            let picks = allUpgrades.slice().sort(() => 0.5 - Math.random()).slice(0, 3);
            if (Math.random() < 0.1) {
              const rare = rareUpgrades[Math.floor(Math.random() * rareUpgrades.length)];
              picks[Math.floor(Math.random() * 3)] = rare;
            }
            setAvailableUpgrades(picks); availableUpgradesRef.current = picks;
            setShowUpgrade(true); showUpgradeRef.current = true;
            setRunning(false); runningRef.current = false;
          } else {
            spawnWave(nextLevel);
          }
        }, 900);
      }
    }

    function loop(now) {
      const dt = now - last;
      last = now;
      if (runningRef.current) update(dt);
      draw();
      animRef.current = requestAnimationFrame(loop);
    }

    last = performance.now();
    animRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animRef.current);
  }, []); // << run once

  // ----- choose upgrade from UI -----
  function chooseUpgrade(u) {
    applyUpgrade(u);
  }

  // ----- select aircraft -----
  function selectAircraft(aircraftId) {
    const aircraft = aircraftTypes.find(a => a.id === aircraftId);
    if (aircraft) {
      setSelectedAircraft(aircraft);
      selectedAircraftRef.current = aircraft;
      setShowAircraftSelect(false);
      setShowLevelSelect(true);
    }
  }

  // ----- start game with selected level -----
  function startGameAtLevel(selectedLevel) {
    const aircraft = selectedAircraftRef.current || aircraftTypes[0];
    
    setLives(aircraft.stats.lives); 
    livesRef.current = aircraft.stats.lives;
    setLevel(selectedLevel); 
    levelRef.current = selectedLevel;
    setGameOver(false); 
    gameOverRef.current = false;
    setRunning(true); 
    runningRef.current = true;
    setShowUpgrade(false); 
    showUpgradeRef.current = false;
    setShowLevelSelect(false);
    
    setPlayerStats({ 
      moveSpeed: aircraft.stats.moveSpeed, 
      shootCooldown: aircraft.stats.shootCooldown, 
      shield: aircraft.stats.shield,
      attackPower: aircraft.stats.attackPower,
      aircraftId: aircraft.id,
      skillCooldown: 0,
      stealthActive: false,
      stealthDuration: 0,
      originalSpeed: aircraft.stats.moveSpeed
    }); 
    playerStatsRef.current = { 
      moveSpeed: aircraft.stats.moveSpeed, 
      shootCooldown: aircraft.stats.shootCooldown, 
      shield: aircraft.stats.shield,
      attackPower: aircraft.stats.attackPower,
      aircraftId: aircraft.id,
      skillCooldown: 0,
      stealthActive: false,
      stealthDuration: 0,
      originalSpeed: aircraft.stats.moveSpeed
    };

    gameRef.current = {
      player: { x: 76, y: 400, w: 10, h: 8, cooldown: 0 },
      bullets: [], enemyBullets: [], enemies: [], barriers: [], lastEnemyShotTime: 0, nextWaveScheduled: false
    };
    spawnWave(selectedLevel);
  }

  // ----- render UI -----
  return (
    <div style={{ textAlign: "center", color: "#ddd", fontFamily: "monospace", paddingTop: 8 }}>
      <div style={{ display: "inline-block", background: "#071020", padding: 6, borderRadius: 8 }}>
        <canvas ref={canvasRef} style={{ imageRendering: "pixelated", width: 320, height: 480, display: "block" }} />
      </div>

      {showAircraftSelect ? (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#222",
          padding: 30,
          borderRadius: 10,
          border: "2px solid #555",
          zIndex: 100,
          maxWidth: "90%",
          maxHeight: "90vh",
          overflowY: "auto"
        }}>
          <h2 style={{ margin: "0 0 20px 0", color: "#fff", textAlign: "center" }}>✈️ 비행기 선택</h2>
          <div style={{ display: "flex", flexDirection: "row", gap: 15, justifyContent: "center", flexWrap: "wrap" }}>
            {aircraftTypes.map((aircraft) => (
              <div
                key={aircraft.id}
                onClick={() => selectAircraft(aircraft.id)}
                style={{
                  padding: "15px",
                  background: "#333",
                  border: "2px solid #666",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  minWidth: "180px",
                  maxWidth: "200px"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = `2px solid ${aircraft.color}`;
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = "2px solid #666";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <div style={{ fontSize: "16px", fontWeight: "bold", color: aircraft.color, marginBottom: "8px" }}>
                  {aircraft.name}
                </div>
                <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "10px" }}>
                  {aircraft.description}
                </div>
                <div style={{ fontSize: "11px", textAlign: "left", color: "#ccc" }}>
                  <div>💖 Lives: {aircraft.stats.lives}</div>
                  <div>🚀 Speed: {aircraft.stats.moveSpeed}</div>
                  <div>🔥 Fire Rate: {(1/aircraft.stats.shootCooldown).toFixed(1)}/s</div>
                  <div>🛡️ Shield: {aircraft.stats.shield}</div>
                  <div>💥 Attack: {aircraft.stats.attackPower}</div>
                  <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #555" }}>
                    <div style={{ color: "#ffff00", fontWeight: "bold" }}>⚡ {aircraft.skillName}</div>
                    <div style={{ fontSize: "10px", color: "#999" }}>{aircraft.skillDesc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : showLevelSelect ? (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#222",
          padding: 20,
          borderRadius: 10,
          border: "2px solid #555",
          zIndex: 100
        }}>
          <h2 style={{ margin: "0 0 20px 0", color: "#fff" }}>레벨 선택</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 5, marginBottom: 20, maxHeight: "400px", overflowY: "auto" }}>
            {[...Array(100)].map((_, i) => (
              <button
                key={i}
                onClick={() => startGameAtLevel(i + 1)}
                style={{
                  padding: "8px",
                  background: "#333",
                  color: "#fff",
                  border: "1px solid #666",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px" // 버튼 크기 조정을 위해 글자 크기 줄임
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13 }}>
            Lives: {lives} &nbsp;•&nbsp; Level: {level}
          </div>
          <div style={{ marginTop: 6 }}>
            <button onClick={() => { setRunning(r => { runningRef.current = !r; return !r; }); }}>
              {runningRef.current ? "Pause" : "Resume"}
            </button>
            <button onClick={() => {
              setShowLevelSelect(true);
              setRunning(false);
              runningRef.current = false;
            }} style={{ marginLeft: 8 }}>Level Select</button>
            <button onClick={() => {
              setShowAircraftSelect(true);
              setShowLevelSelect(false);
              setRunning(false);
              runningRef.current = false;
              setGameOver(false);
              gameOverRef.current = false;
            }} style={{ marginLeft: 8 }}>Change Aircraft</button>
          </div>
        </div>
      )}

      {showUpgrade && (
        <div style={{
          position: "absolute", top: "36%", left: "50%", transform: "translate(-50%, -50%)",
          background: "#222", padding: 12, borderRadius: 10, border: "2px solid #555"
        }}>
          <h3 style={{ margin: 0 }}>⚙️ Choose an Upgrade</h3>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
            {availableUpgrades.map((u, idx) => (
              <button key={idx} onClick={() => chooseUpgrade(u)} style={{
                padding: "6px 10px",
                fontWeight: (rareUpgrades.includes(u) ? "bold" : "normal"),
                color: (rareUpgrades.includes(u) ? "#0ff" : "#000")
              }}>
               {u === "attackPower" && "💥 +1 damage"}
                {u === "speed" && "🚀 Move Speed +10"}
                {u === "fire" && "🔥 Fire Rate Up"}
                {u === "life" && "💖 +1 Life"}
                {u === "ultraSpeed" && "⚡ Ultra Speed +30"}
                {u === "ultraFire" && "💥 Ultra Fire Rate"}
                {u === "shield" && "🛡️ Add 3 Shield"}
                {u === "superShield" && "🛡️✨ add 5 shield"}
                {u === "megaAttack" && "💢💥 +3 damage"}
                {u === "diagonalShot" && "↖️↗️ Diagonal Shot"}
                {u === "playerTripleShot" && "🎯 Triple Shot"}
                {u === "playerRapidFire" && "⚡ Super Fast Fire"}
                {u === "playerTeleport" && "💫 Teleport (Shift)"}
                {u === "playerRegen" && "💖 Auto Heal"}
                {u === "playerLightning" && "⚡🌩️ Lightning (Auto)"}
                {u === "playerTimeWarp" && "🌀⏰ Time Warp (Auto)"}
                {u === "playerStarfall" && "⭐💫 Starfall (Auto)"}
                {u === "playerChaos" && "🌪️💥 Chaos (Auto)"}
                {u === "playerFinalForm" && "✨ Ultimate Power"}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameOver && (
        <div style={{ marginTop: 10, color: "#f66", fontWeight: "bold" }}>
          {level > 100 ? "YOU WIN! GAME CLEAR 🎉" : "GAME OVER"} — Press Enter to restart
        </div>
      )}

      <div style={{ marginTop: 6, fontSize: 12, color: "#aaa" }}>
        Controls: Arrow keys to move — Space to shoot — Shift: Teleport — Boss skills auto-trigger
      </div>
    </div>
  );
}

// render into #root
ReactDOM.createRoot(document.getElementById("root")).render(<PixelClassicShooter />);
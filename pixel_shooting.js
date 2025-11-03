const bossSpecialUpgrades = [
  "megaAttack",   // 공격력 +3
  "superShield",  // 방어막 +5
  "doubleFire",   // 두 발씩 발사
  "diagonalShot", // 대각선 방향으로 발사
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
  const [showLevelSelect, setShowLevelSelect] = useState(true);
  const [availableUpgrades, setAvailableUpgrades] = useState([]);
  const [hitFlash, setHitFlash] = useState(false);

  // persistent upgrade trackers
  const [barrierExtraCount, setBarrierExtraCount] = useState(0);
  const [barrierHPBonus, setBarrierHPBonus] = useState(0);
  const [playerStats, setPlayerStats] = useState({ moveSpeed: 50, shootCooldown: 0.3, shield: 0 });

  // ----- refs to keep main loop stable (avoid reruns) -----
  const livesRef = useRef(lives);
  const levelRef = useRef(level);
  const runningRef = useRef(running);
  const gameOverRef = useRef(gameOver);
  const showUpgradeRef = useRef(showUpgrade);
  const availableUpgradesRef = useRef(availableUpgrades);
  const playerStatsRef = useRef(playerStats);
  const barrierExtraCountRef = useRef(barrierExtraCount);
  const barrierHPBonusRef = useRef(barrierHPBonus);
  const hitFlashRef = useRef(false);

  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { showUpgradeRef.current = showUpgrade; }, [showUpgrade]);
  useEffect(() => { availableUpgradesRef.current = availableUpgrades; }, [availableUpgrades]);
  useEffect(() => { playerStatsRef.current = playerStats; }, [playerStats]);
  useEffect(() => { barrierExtraCountRef.current = barrierExtraCount; }, [barrierExtraCount]);
  useEffect(() => { barrierHPBonusRef.current = barrierHPBonus; }, [barrierHPBonus]);
  useEffect(() => { hitFlashRef.current = hitFlash; }, [hitFlash]);

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
  const BARRIER_Y = 380;

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
        const cols = Math.min(5, 4,  3 + Math.floor(levelNum / 2));
        const rows = Math.min(2, 1 + Math.floor(levelNum / 3));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            enemies.push({ x: 8 + c * 18, y: 8 + r * 14, w: 8, h: 6, dir: 1, hp: enemyHP, baseHp: enemyHP, boss: false });
          }
        }
      } else if (patternType === 1) {
        // 🔹 삼각형 형태
        const rows =  Math.min(4, 3, 2 + Math.floor(levelNum / 2));
        for (let r = 0; r < rows; r++) {
          const count = r + 1;
          const startX = (PIXEL_W / 2) - (count * 9);
          for (let c = 0; c < count; c++) {
            enemies.push({ x: startX + c * 18, y: 10 + r * 14, w: 8, h: 6, dir: 1, hp: enemyHP, baseHp: enemyHP, boss: false });
          }
        }
      } else if (patternType === 2) {
        // 🔸 지그재그 형태
        const rows = Math.min(5, 4, 3, 2, 1.5 + Math.floor(levelNum / 2));
        const cols = 2;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const offset = (r % 2) * 9;
            enemies.push({ x: 10 + c * 18 + offset, y: 10 + r * 14, w: 8, h: 6, dir: 1, hp: enemyHP, baseHp: enemyHP, boss: false });
          }
        }
      } else {
        // 🔹 랜덤 스프레드 형태
        const count = Math.min(10, 9, 8, 7, 6, 5, 4, 3 + Math.floor(levelNum / 2));
        for (let i = 0; i < count; i++) {
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


    // barriers: base 3 + extras; hp = base 3 + bonus
    const baseCount = 3;
    const totalCount = baseCount + (barrierExtraCountRef.current || 0);
    const baseHp = 3 + (barrierHPBonusRef.current || 0);
    const barriers = [];
    const spacing = Math.floor((PIXEL_W - 40) / Math.max(1, totalCount));
    for (let i = 0; i < totalCount; i++) {
      const x = 20 + i * spacing;
      barriers.push({ x, y: BARRIER_Y, w: 12, h: 6, hp: baseHp });
    }

    const st = gameRef.current;
    st.enemies = enemies;
    st.barriers = barriers;
    st.bullets = [];
    st.enemyBullets = [];
    st.nextWaveScheduled = false;
    st.lastEnemyShotTime = 0;
  }

  // ----- upgrades pools -----
  const allUpgrades = ["speed", "fire", "life", "barrierAdd", "barrierHP","attackPower"];
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
    if (type === "barrierAdd") {
  setBarrierExtraCount((n) => {
    const nv = n + 1;
    barrierExtraCountRef.current = nv;

    // 💡 즉시 새로운 방해물 추가
    const st = gameRef.current;
    const baseHp = 3 + (barrierHPBonusRef.current || 0);
    const totalCount = 3 + nv; // 기본 3개 + 추가
    const spacing = Math.floor((PIXEL_W - 40) / Math.max(1, totalCount));
    st.barriers = [];
    for (let i = 0; i < totalCount; i++) {
      const x = 20 + i * spacing;
      st.barriers.push({ x, y: BARRIER_Y, w: 12, h: 6, hp: baseHp });
    }

    return nv;
  });
}

    if (type === "attackPower") { setPlayerStats((p) => ({ ...p, attackPower: p.attackPower + 1 }));
    }
    if (type === "barrierHP") {
      setBarrierHPBonus((n) => { const nv = n + 1; barrierHPBonusRef.current = nv; return nv; });
      // boost existing barriers now
      gameRef.current.barriers.forEach(b => b.hp += 1);
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
    if (type === "doubleFire") {
      // 더블샷 모드 활성화
      playerStatsRef.current.doubleFire = true;
    }
    if (type === "diagonalShot") {
      // 대각선 공격 모드 활성화
      playerStatsRef.current.diagonalShot = true;
    }
    
    // 보스 스킬 업그레이드
    if (type === "playerTripleShot") {
      playerStatsRef.current.tripleShot = true;
    }
    if (type === "playerRapidFire") {
      setPlayerStats(p => {
        const nv = { ...p, shootCooldown: Math.max(0.05, p.shootCooldown * 0.5) };
        playerStatsRef.current = nv;
        return nv;
      });
    }
    if (type === "playerTeleport") {
      playerStatsRef.current.canTeleport = true;
      playerStatsRef.current.teleportCooldown = 0;
    }
    if (type === "playerRegen") {
      playerStatsRef.current.regenEnabled = true;
      // 3초마다 체력 1 회복
      setInterval(() => {
        if (playerStatsRef.current.regenEnabled && livesRef.current < 10) {
          setLives(l => {
            const nv = Math.min(10, l + 1);
            livesRef.current = nv;
            return nv;
          });
        }
      }, 3000);
    }
    if (type === "playerLightning") {
      // 번개 공격 능력
      playerStatsRef.current.hasLightning = true;
      playerStatsRef.current.lightningCooldown = 0;
    }
    if (type === "playerTimeWarp") {
      // 시간 왜곡 능력 - 주기적으로 원형 탄막 발사
      playerStatsRef.current.hasTimeWarp = true;
      playerStatsRef.current.timeWarpCooldown = 0;
    }
    if (type === "playerStarfall") {
      // 별똥별 공격 능력
      playerStatsRef.current.hasStarfall = true;
      playerStatsRef.current.starfallCooldown = 0;
    }
    if (type === "playerChaos") {
      // 카오스 공격 - 무작위 강력한 공격
      playerStatsRef.current.hasChaos = true;
      playerStatsRef.current.chaosCooldown = 0;
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
    setLives(10); livesRef.current = 10;
    setLevel(1); levelRef.current = 1;
    setGameOver(false); gameOverRef.current = false;
    setRunning(true); runningRef.current = true;
    setShowUpgrade(false); showUpgradeRef.current = false;
    setPlayerStats({ moveSpeed: 50, shootCooldown: 0.3, shield: 0 }); playerStatsRef.current = { moveSpeed: 50, shootCooldown: 0.3, shield: 0 };
    setBarrierExtraCount(0); barrierExtraCountRef.current = 0;
    setBarrierHPBonus(0); barrierHPBonusRef.current = 0;

    gameRef.current = {
      player: { x: 76, y: 400, w: 10, h: 8, cooldown: 0 },
      bullets: [], enemyBullets: [], enemies: [], barriers: [], lastEnemyShotTime: 0, nextWaveScheduled: false
    };
    spawnWave(1);
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
      
      // Base color
      ctx.fillStyle = hitFlashRef.current ? "#ff3333" : "#66d9ff";
      
      // Main body
      ctx.fillRect(p.x + 3, p.y, p.w - 6, p.h + 2); // Fuselage
      
      // Wings
      ctx.fillRect(p.x, p.y + 3, p.w, 2); // Main wings
      ctx.fillRect(p.x + 2, p.y + 1, 4, 1); // Small front wings
      
      // Tail
      ctx.fillRect(p.x + 3, p.y + 6, 2, 2); // Vertical stabilizer
      
      // Cockpit
      ctx.fillStyle = hitFlashRef.current ? "#ff9999" : "#99ffff";
      ctx.fillRect(p.x + 3, p.y + 1, 2, 2);
      
      // Shield effect
      if (playerStatsRef.current.shield > 0) {
        ctx.strokeStyle = "#00ffff";
        ctx.strokeRect(p.x - 1, p.y - 1, p.w + 2, p.h + 4);
      }

      // bullets
      for (const b of st.bullets) {
        ctx.fillStyle = b.color || "#ffff66";
        ctx.fillRect(b.x, b.y, b.w, b.h);
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
            const gradient = ctx.createLinearGradient(e.x, e.y, e.x + e.w, e.y + e.h);
            gradient.addColorStop(0, "#ff0000");
            gradient.addColorStop(0.5, "#ff00ff");
            gradient.addColorStop(1, "#0000ff");
            ctx.fillStyle = gradient;
            
            // 보스 주위에 에너지 오라 효과
            ctx.save();
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 3; i++) {
              const pulseScale = 1 + Math.sin(performance.now() / 200) * 0.1;
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
            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 1;
            const time = performance.now() / 1000;
            for (let i = 0; i < 8; i++) {
              const angle = (time + i * Math.PI / 4) % (Math.PI * 2);
              ctx.beginPath();
              ctx.moveTo(
                e.x + e.w/2 + Math.cos(angle) * (e.w/2 + 5),
                e.y + e.h/2 + Math.sin(angle) * (e.h/2 + 5)
              );
              ctx.lineTo(
                e.x + e.w/2 + Math.cos(angle) * (e.w/2 + 15),
                e.y + e.h/2 + Math.sin(angle) * (e.h/2 + 15)
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
          ctx.fillStyle = e.skill === "ultimate" ? "#ffff99" : "#ff99ff";
          ctx.font = e.skill === "ultimate" ? "bold 10px monospace" : "bold 8px monospace";
          const nameWidth = ctx.measureText(e.name).width;
          
          // 이름 배경
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(
            e.x + e.w/2 - nameWidth/2 - 2,
            e.y + e.h + 2,
            nameWidth + 4,
            e.skill === "ultimate" ? 12 : 10
          );
          
          // 이름 텍스트
          ctx.fillStyle = e.skill === "ultimate" ? "#ffff99" : "#ff99ff";
          ctx.fillText(
            e.name,
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

      // barriers
      for (const bar of st.barriers) {
        const color = ["#666", "#999", "#ccc"][Math.max(0, Math.min(2, bar.hp - 1))] || "#333";
        ctx.fillStyle = color;
        ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
      }

      // UI
      ctx.fillStyle = hitFlashRef.current ? "#ff4444" : "#fff";
      ctx.font = "8px monospace";
      ctx.fillText(`LIVES:${livesRef.current}`, PIXEL_W - 62, 10);
      ctx.fillText(`LEVEL:${levelRef.current}`, PIXEL_W / 2 - 20, 10);

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
        
        // 더블파이어가 활성화된 경우 추가 2발 발사
        if (playerStatsRef.current.doubleFire) {
          st.bullets.push({ x: p.x + p.w / 2 - 4, y: p.y - 4, w: 2, h: 4, dy: -120 }); // 왼쪽 추가 총알
          st.bullets.push({ x: p.x + p.w / 2 + 2, y: p.y - 4, w: 2, h: 4, dy: -120 }); // 오른쪽 추가 총알
        }

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

        // 보스 스킬 자동 발동 (15% 확률)
        const skillChance = Math.random();
        
        // 번개 공격 (15% 확률)
        if (playerStatsRef.current.hasLightning && skillChance < 0.15) {
          for (let i = 0; i < 2; i++) {
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

        // 시간 왜곡 (12% 확률)
        if (playerStatsRef.current.hasTimeWarp && skillChance < 0.12) {
          for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
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

        // 별똥별 공격 (10% 확률)
        if (playerStatsRef.current.hasStarfall && skillChance < 0.10) {
          for (let i = 0; i < 2; i++) {
            st.bullets.push({
              x: p.x + (i - 0.5) * 15,
              y: p.y - 10,
              w: 4,
              h: 4,
              dy: -250,
              color: "#ffffff",
              isStar: true
            });
          }
        }

        // 카오스 공격 (8% 확률)
        if (playerStatsRef.current.hasChaos && skillChance < 0.08) {
          for (let i = 0; i < 8; i++) {
            const angle = (i * 45 + Math.random() * 20) * Math.PI / 180;
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
        b.y += b.dy * dt / 1000;
        // 대각선 총알의 경우 x 좌표도 이동
        if (b.dx) {
          b.x += b.dx * dt / 1000;
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
            e.phaseCounter = (e.phaseCounter + 1) % 4;

            // 페이즈 1: 전방위 레이저 + 방어막
            if (e.phaseCounter === 0) {
              for (let i = 0; i < 24; i++) {
                const angle = (i * 15) * Math.PI / 180;
                st.enemyBullets.push({
                  x: e.x + e.w / 2,
                  y: e.y + e.h / 2,
                  w: 4,
                  h: 4,
                  dy: Math.sin(angle) * 200,
                  dx: Math.cos(angle) * 200,
                  color: "#ff0000",
                  ultimate: true
                });
              }
            }
            // 페이즈 2: 타임워프 + 스타폴
            else if (e.phaseCounter === 1) {
              for (let i = 0; i < 5; i++) {
                const x = e.x + (i - 2) * (e.w / 2);
                st.enemyBullets.push({
                  x: x,
                  y: e.y,
                  w: 6,
                  h: 6,
                  dy: 150,
                  dx: 0,
                  color: "#ffffff",
                  ultimate: true,
                  splits: 4
                });
              }
            }
            // 페이즈 3: 번개 폭풍
            else if (e.phaseCounter === 2) {
              for (let i = 0; i < 8; i++) {
                const x = (PIXEL_W / 7) * i;
                for (let j = 0; j < 3; j++) {
                  setTimeout(() => {
                    if (e.hp > 0) {
                      st.enemyBullets.push({
                        x: x + (Math.random() - 0.5) * 30,
                        y: e.y + j * 30,
                        w: 4,
                        h: 10,
                        dy: 250,
                        color: "#ffff00",
                        ultimate: true
                      });
                    }
                  }, j * 100);
                }
              }
            }
            // 페이즈 4: 카오스 에너지
            else {
              e.x = Math.random() * (PIXEL_W - e.w); // 텔레포트
              for (let i = 0; i < 16; i++) {
                const angle = (i * 22.5) * Math.PI / 180;
                const speed = 180;
                st.enemyBullets.push({
                  x: e.x + e.w / 2,
                  y: e.y + e.h / 2,
                  w: 4,
                  h: 4,
                  dy: Math.sin(angle) * speed,
                  dx: Math.cos(angle) * speed,
                  color: "#ff00ff",
                  ultimate: true
                });
              }
            }

            // 체력 회복 (낮은 확률)
            if (Math.random() < 0.1) {
              e.hp = Math.min(e.baseHp, e.hp + 10);
            }

            e.skillCooldown = 1.5; // 더 빠른 스킬 사용
          } else {
            e.skillCooldown = 1;
          }
        }
      }

      // collisions: player bullets -> enemies
      for (let i = st.bullets.length - 1; i >= 0; i--) {
        const b = st.bullets[i];
        for (let j = st.enemies.length - 1; j >= 0; j--) {
          const e = st.enemies[j];
          if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
            const dmg = playerStatsRef.current.attackPower || 1;  // 💥 업그레이드된 공격력 적용
            e.hp -= dmg;
            st.bullets.splice(i, 1);

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

            break;
          }
        }
      }

      // enemy bullets -> barriers
      for (let i = st.enemyBullets.length - 1; i >= 0; i--) {
        const eb = st.enemyBullets[i];
        for (let j = st.barriers.length - 1; j >= 0; j--) {
          const bar = st.barriers[j];
          if (eb.x < bar.x + bar.w && eb.x + eb.w > bar.x && eb.y < bar.y + bar.h && eb.y + eb.h > bar.y) {
            st.enemyBullets.splice(i, 1);
            bar.hp -= 1;
            break;
          }
        }
      }
      st.barriers = st.barriers.filter(b => b.hp > 0);

      // enemy bullets -> player
      for (let i = st.enemyBullets.length - 1; i >= 0; i--) {
        const eb = st.enemyBullets[i];
        if (eb.x < p.x + p.w && eb.x + eb.w > p.x && eb.y < p.y + p.h && eb.y + eb.h > p.y) {
          st.enemyBullets.splice(i, 1);
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

      // enemy reached barrier line => game over
      for (const e of st.enemies) {
        if (e.y + e.h >= BARRIER_Y) {
          setGameOver(true); gameOverRef.current = true;
          setRunning(false); runningRef.current = false;
          break;
        }
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

  // ----- start game with selected level -----
  function startGameAtLevel(selectedLevel) {
    setLives(10); livesRef.current = 10;
    setLevel(selectedLevel); levelRef.current = selectedLevel;
    setGameOver(false); gameOverRef.current = false;
    setRunning(true); runningRef.current = true;
    setShowUpgrade(false); showUpgradeRef.current = false;
    setShowLevelSelect(false);
    setPlayerStats({ moveSpeed: 50, shootCooldown: 0.3, shield: 0 }); 
    playerStatsRef.current = { moveSpeed: 50, shootCooldown: 0.3, shield: 0 };
    setBarrierExtraCount(0); barrierExtraCountRef.current = 0;
    setBarrierHPBonus(0); barrierHPBonusRef.current = 0;

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

      {showLevelSelect ? (
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
                color: (rareUpgrades.includes(u) ? "#0ff" : "#fff")
              }}>
               {u === "attackPower" && "💥 +1 damage"}
                {u === "speed" && "🚀 Move Speed +10"}
                {u === "fire" && "🔥 Fire Rate Up"}
                {u === "life" && "💖 +1 Life"}
                {u === "barrierAdd" && "🧱 Add Barrier"}
                {u === "barrierHP" && "💪 Barrier HP +1"}
                {u === "ultraSpeed" && "⚡ Ultra Speed +30"}
                {u === "ultraFire" && "💥 Ultra Fire Rate"}
                {u === "shield" && "🛡️ Add 3 Shield"}
                {u === "superShield" && "🛡️✨ add 5 shield"}
                {u === "megaAttack" && "💢💥 +3 damage"}
                {u === "doubleFire" && "💥💥 shoting 2 bullets"}
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
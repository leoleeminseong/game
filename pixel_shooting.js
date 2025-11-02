const bossSpecialUpgrades = [
  "megaAttack",   // 공격력 +3
  "superShield",  // 방어막 +5
  "doubleFire",   // 두 발씩 발사
  ];


const { useRef, useEffect, useState } = React;

function PixelClassicShooter() {
  // ----- UI state -----
  const [lives, setLives] = useState(10);
  const [level, setLevel] = useState(1);
  const [running, setRunning] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
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
    player: { x: 76, y: 400, w: 8, h: 6, cooldown: 0 },
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

  // boss definitions (10,20,30,40,50)
  const bossDefinitions = [
    { name: "Iron Drone", skill: "tripleShot" },
    { name: "Plasma Reaper", skill: "rapidFire" },
    { name: "Shadow Warden", skill: "teleport" },
    { name: "Omega Core", skill: "regen" },
    { name: "Void Overlord", skill: "final" },
  ];

  // ----- spawn wave (reads barrier refs) -----
    function spawnWave(levelNum = 1) {
    const enemies = [];
    const isBossWave = levelNum % 10 === 0;
    if (isBossWave) {
      const idx = Math.max(0, Math.min(bossDefinitions.length - 1, Math.floor(levelNum / 10) - 1));
      const def = bossDefinitions[idx];
      enemies.push({
        x: PIXEL_W / 2 - 15,
        y: 13,
        w: 30,
        h: 18,
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
      player: { x: 76, y: 400, w: 8, h: 6, cooldown: 0 },
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

      // player
      const p = st.player;
      
      ctx.fillStyle = hitFlashRef.current ? "#ff3333" : "#66d9ff";
      ctx.fillRect(p.x, p.y, p.w, p.h);
      if (playerStatsRef.current.shield > 0) {
        ctx.strokeStyle = "#00ffff";
        ctx.strokeRect(p.x - 1, p.y - 1, p.w + 2, p.h + 2);
      }

      // bullets
      for (const b of st.bullets) {
        ctx.fillStyle = "#ffff66";
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
      for (const b of st.enemyBullets) {
        ctx.fillStyle = "#ff6666";
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }

      // enemies
      for (const e of st.enemies) {
        if (e.boss) {
          ctx.fillStyle = "#ff00ff";
          ctx.fillRect(e.x, e.y, e.w, e.h);
          ctx.fillStyle = "#fff";
          ctx.font = "7px monospace";
          ctx.fillText(e.name, e.x - 5, e.y - 6);
          ctx.fillText(`HP:${Math.ceil(e.hp)}`, e.x, e.y - 15);
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
        ctx.fillText(levelRef.current >= 50 ? "YOU WIN! GAME CLEAR 🎉" : "GAME OVER", PIXEL_W / 2 - 40, PIXEL_H / 2);
        ctx.font = "7px monospace";
        ctx.fillText("Press Enter to restart", PIXEL_W / 2 - 45, PIXEL_H / 2 + 10);
      }
    }

    function update(dt) {
      if (gameOverRef.current || showUpgradeRef.current) return;
      const st = gameRef.current;
      const p = st.player;

      // movement
      if (keysRef.current["ArrowLeft"]) p.x -= playerStatsRef.current.moveSpeed * dt / 700;
      if (keysRef.current["ArrowRight"]) p.x += playerStatsRef.current.moveSpeed * dt / 700;
      if (keysRef.current["ArrowUp"]) p.y -= playerStatsRef.current.moveSpeed * dt / 700;
      if (keysRef.current["ArrowDown"]) p.y += playerStatsRef.current.moveSpeed * dt / 700;
      p.x = Math.max(0, Math.min(PIXEL_W - p.w, p.x));
      p.y = Math.max(0, Math.min(PIXEL_H - p.h, p.y));

      // shooting
      st.player.cooldown -= dt / 1000;
      if ((keysRef.current[" "] || keysRef.current["Space"]) && st.player.cooldown <= 0) {
        if (playerStatsRef.current.doubleFire) {
          st.bullets.push({ x: p.x + p.w / 2 - 4, y: p.y - 4, w: 2, h: 4, dy: -120 });
          st.bullets.push({ x: p.x + p.w / 2 + 2, y: p.y - 4, w: 2, h: 4, dy: -120 });
        } else {
          st.bullets.push({ x: p.x + p.w / 2 - 1, y: p.y - 4, w: 2, h: 4, dy: -120 });
        }
        st.player.cooldown = playerStatsRef.current.shootCooldown;
      }


      // move bullets
      for (let i = st.bullets.length - 1; i >= 0; i--) {
        const b = st.bullets[i];
        b.y += b.dy * dt / 1000;
        if (b.y + b.h < 0) st.bullets.splice(i, 1);
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

      // boss skills
      for (const e of st.enemies) {
        if (!e.boss) continue;
        e.skillCooldown -= dt / 1000;
        if (e.skillCooldown <= 0) {
          if (e.skill === "tripleShot") {
            for (let i = -1; i <= 1; i++) st.enemyBullets.push({ x: e.x + e.w / 2 - 1 + i * 4, y: e.y + e.h, w: 2, h: 4, dy: 120 });
            e.skillCooldown = 3;
          } else if (e.skill === "rapidFire") {
            st.enemyBullets.push({ x: e.x + e.w / 2 - 1, y: e.y + e.h, w: 2, h: 4, dy: 160 });
            e.skillCooldown = 0.4;
          } else if (e.skill === "teleport") {
            e.x = Math.random() * (PIXEL_W - e.w);
            e.skillCooldown = 4;
          } else if (e.skill === "regen") {
            e.hp = Math.min(e.baseHp, e.hp + 3);
            e.skillCooldown = 5;
          } else if (e.skill === "final") {
            for (let i = -1; i <= 1; i++) st.enemyBullets.push({ x: e.x + e.w / 2 - 1 + i * 4, y: e.y + e.h, w: 2, h: 4, dy: 180 });
            e.x = Math.random() * (PIXEL_W - e.w);
            e.hp = Math.min(e.baseHp, e.hp + 5);
            e.skillCooldown = 3;
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
              st.enemies.splice(j, 1);
              // 💥 보스 처치 시 특별 업그레이드 등장
              if (wasBoss) {
                const picks = bossSpecialUpgrades.slice().sort(() => 0.5 - Math.random()).slice(0, 3);
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
          if (nextLevel > 50) {
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

  // ----- render UI -----
  return (
    <div style={{ textAlign: "center", color: "#ddd", fontFamily: "monospace", paddingTop: 8 }}>
      <div style={{ display: "inline-block", background: "#071020", padding: 6, borderRadius: 8 }}>
        <canvas ref={canvasRef} style={{ imageRendering: "pixelated", width: 320, height: 480, display: "block" }} />
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13 }}>
          Lives: {lives} &nbsp;•&nbsp; Level: {level}
        </div>
        <div style={{ marginTop: 6 }}>
          <button onClick={() => { setRunning(r => { runningRef.current = !r; return !r; }); }}>
            {runningRef.current ? "Pause" : "Resume"}
          </button>
          <button onClick={restartGame} style={{ marginLeft: 8 }}>Restart</button>
        </div>
      </div>

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
              </button>
            ))}
          </div>
        </div>
      )}

      {gameOver && (
        <div style={{ marginTop: 10, color: "#f66", fontWeight: "bold" }}>
          {level >= 50 ? "YOU WIN! GAME CLEAR 🎉" : "GAME OVER"} — Press Enter to restart
        </div>
      )}

      <div style={{ marginTop: 6, fontSize: 12, color: "#aaa" }}>
        Controls: Arrow keys to move — Space to shoot — Enter to restart (when game over)
      </div>
    </div>
  );
}

// render into #root
ReactDOM.createRoot(document.getElementById("root")).render(<PixelClassicShooter />);
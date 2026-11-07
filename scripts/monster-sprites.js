(function () {
  'use strict';

  const IDLE_FRAMES = 4;
  const ATTACK_FRAMES = 6;
  const IDLE_FRAME_MS = 160;
  const ATTACK_FRAME_MS = 150;
  const ATTACK_DURATION = ATTACK_FRAMES * ATTACK_FRAME_MS;
  const ASSET_VERSION = '20261107-7';
  const attacks = { single:0, player:0, rival:0 };
  const downed = { player:false, rival:false };
  const frameLoads = new Map();
  const frameBounds = new Map();
  const floorBaselines = new Map();
  let snapshot = window.monsterSpriteSnapshot || null;
  let activeBattleId = '';

  function safeId(monster) {
    const id = monster && String(monster.id || '');
    return /^[a-z0-9-]+$/.test(id) ? id : 'ember-drake';
  }

  function pathFor(monster, animation, frame) {
    const safeFrame = String(frame).padStart(2, '0');
    return '/' + safeId(monster) + '/' + animation + '/frame-' + safeFrame + '.png?v=' + ASSET_VERSION;
  }

  function measureVisibleFloor(image) {
    try {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      if (!width || !height) return null;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d',{willReadFrequently:true});
      context.drawImage(image,0,0);
      const pixels = context.getImageData(0,0,width,height).data;
      const minimumPixels = Math.max(4,Math.floor(width * .003));
      let bottom = -1;
      for (let y = height - 1; y >= 0; y -= 1) {
        let opaque = 0;
        for (let x = 0; x < width; x += 1) {
          if (pixels[(y * width + x) * 4 + 3] > 48) opaque += 1;
          if (opaque >= minimumPixels) break;
        }
        if (opaque >= minimumPixels) { bottom = y; break; }
      }
      canvas.width = 0;
      canvas.height = 0;
      return bottom >= 0 ? { bottom:bottom, height:height } : null;
    } catch (error) {
      return null;
    }
  }

  function updateFloorBaseline(monster) {
    if (!monster) return;
    const id = safeId(monster);
    const prefix = '/' + id + '/';
    let bottom = -1;
    let height = 0;
    frameBounds.forEach(function (bounds,path) {
      if (path.indexOf(prefix) === 0 && bounds && bounds.bottom > bottom) {
        bottom = bounds.bottom;
        height = bounds.height;
      }
    });
    if (bottom >= 0 && height > 0) floorBaselines.set(id,{ bottom:bottom, height:height });
  }

  function setFrameFloorShift(image, monster, path) {
    const bounds = frameBounds.get(path);
    const baseline = floorBaselines.get(safeId(monster));
    if (!bounds || !baseline) return;
    const amount = Math.max(0,baseline.bottom - bounds.bottom);
    const shift = -(amount / baseline.height) * 100;
    image.style.setProperty('--sprite-floor-shift',shift.toFixed(3) + '%');
  }

  function loadFrame(path, retry) {
    if (retry) frameLoads.delete(path);
    if (!frameLoads.has(path)) {
      frameLoads.set(path,new Promise(function (resolve) {
        const preload = new Image();
        preload.onload = function () {
          const bounds = measureVisibleFloor(preload);
          if (bounds) frameBounds.set(path,bounds);
          resolve(true);
        };
        preload.onerror = function () { resolve(false); };
        preload.src = path;
      }));
    }
    return frameLoads.get(path);
  }

  function warmAnimation(monster, animation, count, retry) {
    if (!monster) return Promise.resolve(true);
    const requests = [];
    for (let frame = 1; frame <= count; frame += 1) {
      requests.push(loadFrame(pathFor(monster,animation,frame),retry));
    }
    return Promise.all(requests).then(function (results) {
      updateFloorBaseline(monster);
      return results.every(Boolean);
    });
  }

  function warmBattle(player, rival, retry) {
    return Promise.all([player,rival].map(function (monster) {
      return Promise.all([
        warmAnimation(monster,'idle',IDLE_FRAMES,retry),
        warmAnimation(monster,'attack',ATTACK_FRAMES,retry)
      ]);
    })).then(function (results) {
      [player,rival].forEach(updateFloorBaseline);
      return results.every(function (pair) { return pair.every(Boolean); });
    });
  }

  function warmSnapshot() {
    if (!snapshot) return;
    if ((snapshot.phase === 'battleReady' || snapshot.phase === 'battle') && snapshot.rival) {
      warmBattle(snapshot.monster,snapshot.rival,false);
    } else {
      warmAnimation(snapshot.monster,'idle',IDLE_FRAMES,false);
      if (snapshot.phase === 'training') warmAnimation(snapshot.monster,'attack',ATTACK_FRAMES,false);
    }
  }

  function setFrame(image, monster, animation, frame) {
    if (!image || !monster) return;
    const id = safeId(monster);
    if (image.dataset.monsterId !== id) {
      image.removeAttribute('src');
      image.dataset.monsterId = id;
      image.dataset.spriteFrame = '';
      image.dataset.spritePending = '';
    }
    const path = pathFor(monster,animation,frame);
    if (image.dataset.spriteFrame === path && image.getAttribute('src') === path) return;
    if (image.dataset.spritePending === path) return;
    image.dataset.spritePending = path;
    loadFrame(path).then(function (loaded) {
      if (image.dataset.spritePending !== path || image.dataset.monsterId !== id) return;
      image.dataset.spritePending = '';
      if (!loaded) return;
      image.dataset.spriteFrame = path;
      image.src = path;
      setFrameFloorShift(image,monster,path);
    });
  }

  function frameFor(monster, side, now, maxFrames) {
    if (downed[side]) return null;
    const started = attacks[side];
    if (started && now - started < ATTACK_DURATION) {
      const attackFrame = Math.min(ATTACK_FRAMES,Math.floor((now - started) / ATTACK_FRAME_MS) + 1);
      return { animation:'attack', frame:attackFrame };
    }
    if (started) attacks[side] = 0;
    const seed = safeId(monster).split('').reduce(function (sum,character) { return sum + character.charCodeAt(0); },0);
    const idleFrame = Math.floor((now + seed * 31) / IDLE_FRAME_MS) % maxFrames + 1;
    return { animation:'idle', frame:idleFrame };
  }

  function update(now) {
    if (snapshot) {
      const isBattle = snapshot.phase === 'battleReady' || snapshot.phase === 'battle';
      const battleDisplay = document.getElementById('battle-art-fallback');
      const singleDisplay = document.getElementById('art-fallback');
      if (battleDisplay) battleDisplay.hidden = !isBattle;
      if (singleDisplay) singleDisplay.hidden = false;

      if (isBattle && snapshot.monster && snapshot.rival) {
        const playerImage = document.getElementById('player-model-fallback');
        const rivalImage = document.getElementById('rival-model-fallback');
        const playerFrame = frameFor(snapshot.monster,'player',now,IDLE_FRAMES);
        const rivalFrame = frameFor(snapshot.rival,'rival',now,IDLE_FRAMES);
        if (playerFrame) setFrame(playerImage,snapshot.monster,playerFrame.animation,playerFrame.frame);
        if (rivalFrame) setFrame(rivalImage,snapshot.rival,rivalFrame.animation,rivalFrame.frame);
        if (playerImage) playerImage.alt = snapshot.monster.name + (playerFrame && playerFrame.animation === 'attack' ? ' attacking' : ' stance');
        if (rivalImage) rivalImage.alt = snapshot.rival.name + ' rival';
      } else if (snapshot.monster) {
        const singleImage = document.getElementById('single-monster-sprite');
        const singleFrame = frameFor(snapshot.monster,'single',now,IDLE_FRAMES);
        if (singleFrame) setFrame(singleImage,snapshot.monster,singleFrame.animation,singleFrame.frame);
      }
    }
    window.requestAnimationFrame(update);
  }

  window.monsterSpritesSetState = function (nextSnapshot) {
    const nextBattleId = nextSnapshot && nextSnapshot.battle && nextSnapshot.battle.assetId || '';
    if (nextBattleId !== activeBattleId) {
      downed.player = false;
      downed.rival = false;
      attacks.player = 0;
      attacks.rival = 0;
      activeBattleId = nextBattleId;
    }
    if (!nextSnapshot || !nextSnapshot.battle || !nextSnapshot.battle.ended) {
      downed.player = false;
      downed.rival = false;
    } else if (nextSnapshot.battle.outcome) {
      downed.player = !nextSnapshot.battle.outcome.won;
      downed.rival = !!nextSnapshot.battle.outcome.won;
    }
    snapshot = nextSnapshot || null;
    warmSnapshot();
  };
  window.monsterSpritesWarmBattle = warmBattle;
  window.monsterSpritesDowned = function (side) {
    if (side !== 'player' && side !== 'rival') return;
    downed[side] = true;
    attacks[side] = 0;
  };
  window.monsterSpritesAttack = function (side) {
    if (side !== 'player' && side !== 'rival') return Promise.resolve();
    downed[side] = false;
    const monster = snapshot && (side === 'player' ? snapshot.monster : snapshot.rival);
    return warmAnimation(monster,'attack',ATTACK_FRAMES,false).then(function () {
      attacks[side] = performance.now();
      return new Promise(function (resolve) { window.setTimeout(resolve,ATTACK_DURATION); });
    });
  };

  warmSnapshot();
  window.requestAnimationFrame(update);
})();

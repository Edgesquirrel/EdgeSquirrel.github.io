(function () {
  'use strict';

  const IDLE_FRAMES = 4;
  const ATTACK_FRAMES = 6;
  const IDLE_FRAME_MS = 160;
  const ATTACK_FRAME_MS = 95;
  const ATTACK_DURATION = ATTACK_FRAMES * ATTACK_FRAME_MS;
  const attacks = { player:0, rival:0 };
  let snapshot = window.monsterSpriteSnapshot || null;

  function safeId(monster) {
    const id = monster && String(monster.id || '');
    return /^[a-z0-9-]+$/.test(id) ? id : 'ember-drake';
  }

  function pathFor(monster, animation, frame) {
    const safeFrame = String(frame).padStart(2, '0');
    return 'monster-animations/' + safeId(monster) + '/' + animation + '/frame-' + safeFrame + '.png';
  }

  function setFrame(image, monster, animation, frame) {
    if (!image || !monster) return;
    const path = pathFor(monster, animation, frame);
    if (image.dataset.spriteFrame !== path) {
      image.dataset.spriteFrame = path;
      image.src = path;
    }
  }

  function frameFor(monster, side, now, maxFrames) {
    const started = attacks[side];
    if (started && now - started < ATTACK_DURATION) {
      const attackFrame = Math.min(ATTACK_FRAMES, Math.floor((now - started) / ATTACK_FRAME_MS) + 1);
      return { animation:'attack', frame:attackFrame };
    }
    if (started) attacks[side] = 0;
    const seed = safeId(monster).split('').reduce(function (sum, character) { return sum + character.charCodeAt(0); }, 0);
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
        const playerFrame = frameFor(snapshot.monster, 'player', now, IDLE_FRAMES);
        const rivalFrame = frameFor(snapshot.rival, 'rival', now, IDLE_FRAMES);
        setFrame(playerImage, snapshot.monster, playerFrame.animation, playerFrame.frame);
        setFrame(rivalImage, snapshot.rival, rivalFrame.animation, rivalFrame.frame);
        if (playerImage) playerImage.alt = snapshot.monster.name + ' attacking' + (playerFrame.animation === 'attack' ? '' : ' stance');
        if (rivalImage) rivalImage.alt = snapshot.rival.name + ' rival';
      } else if (snapshot.monster) {
        const singleImage = document.getElementById('single-monster-sprite');
        const singleFrame = frameFor(snapshot.monster, 'single', now, IDLE_FRAMES);
        setFrame(singleImage, snapshot.monster, singleFrame.animation, singleFrame.frame);
      }
    }
    window.requestAnimationFrame(update);
  }

  window.monsterSpritesSetState = function (nextSnapshot) {
    snapshot = nextSnapshot || null;
  };
  window.monsterSpritesAttack = function (side) {
    if (side === 'player' || side === 'rival') attacks[side] = performance.now();
  };

  window.requestAnimationFrame(update);
})();

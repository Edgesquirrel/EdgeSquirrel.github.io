(function () {
  const THREE_URL = './scripts/vendor/three.module.js';
  const GLTF_LOADER_URL = './scripts/vendor/addons/loaders/GLTFLoader.js';
  const DRACO_LOADER_URL = './scripts/vendor/addons/loaders/DRACOLoader.js';
  const CREATURE_MODELS = {
    dragon:'assets/monsters/dragon.glb', wolf:'assets/monsters/wolf.glb',
    raptor:'assets/monsters/dinosaur.glb', golem:'assets/monsters/golem.glb',
    squirrel:'assets/monsters/squirrel.glb', lion:'assets/monsters/lion.glb',
    'squirrel-rare':'assets/monsters/crystal-squirrel.glb',
    ghost:'assets/monsters/ghost.glb', serpent:'assets/monsters/snake.glb',
    bird:'assets/monsters/bird.glb'
  };

  Promise.all([import(THREE_URL),import(GLTF_LOADER_URL),import(DRACO_LOADER_URL)]).then(function (modules) {
    const THREE = modules[0];
    const GLTFLoader = modules[1].GLTFLoader;
    const DRACOLoader = modules[2].DRACOLoader;
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./scripts/vendor/draco/');
    gltfLoader.setDRACOLoader(dracoLoader);
    const cachedAssets = new Map();
    const pendingAssets = new Map();
    function loadCreature(archetype) {
      if (cachedAssets.has(archetype)) return Promise.resolve(cachedAssets.get(archetype));
      if (pendingAssets.has(archetype)) return pendingAssets.get(archetype);
      const path = CREATURE_MODELS[archetype] || CREATURE_MODELS.dragon;
      const request = gltfLoader.loadAsync(path).then(function (gltf) {
        cachedAssets.set(archetype,gltf.scene);
        return gltf.scene;
      }).finally(function () { pendingAssets.delete(archetype); });
      pendingAssets.set(archetype,request);
      return request;
    }
    const preview = makeStage(THREE,document.getElementById('monster-canvas'),false,loadCreature);
    const battle = makeStage(THREE,document.getElementById('battle-canvas'),true,loadCreature);

    window.hatch3dSetState = function (snapshot) {
      preview.setState(snapshot);
      battle.setState(snapshot);
    };
    window.hatch3dAttack = function (side) {
      battle.attack(side);
      const flash = document.getElementById('effect-flash');
      flash.classList.remove('active');
      void flash.offsetWidth;
      flash.classList.add('active');
    };
    if (window.hatch3dSnapshot) window.hatch3dSetState(window.hatch3dSnapshot);
  }).catch(function () {
    document.getElementById('art-fallback').hidden = false;
    document.getElementById('three-warning').textContent = 'The 3D display could not start in this browser. Your game progress and controls still work.';
    document.getElementById('three-warning').hidden = false;
  });

  function makeStage(THREE, canvas, isBattle, loadCreature) {
    if (!canvas) return { setState:function () {}, attack:function () {} };
    const renderer = new THREE.WebGLRenderer({ canvas:canvas, alpha:true, antialias:true, powerPreference:'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4,4,2.25,-2.25,.1,80);
    camera.position.set(0,4.5,11);
    camera.lookAt(0,1.05,0);

    const hemisphere = new THREE.HemisphereLight(0xe7e1ff,0x1b1724,2.0);
    scene.add(hemisphere);
    const keyLight = new THREE.DirectionalLight(0xfff0dd,3.0);
    keyLight.position.set(-4,8,5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512,512);
    keyLight.shadow.camera.left = -7;
    keyLight.shadow.camera.right = 7;
    keyLight.shadow.camera.top = 7;
    keyLight.shadow.camera.bottom = -7;
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x9a7bff,20,18);
    rimLight.position.set(0,4,-3);
    scene.add(rimLight);

    const floorMaterial = new THREE.MeshStandardMaterial({ color:'#181523', roughness:.86, metalness:.12 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(6.2,56),floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -.08;
    floor.receiveShadow = true;
    scene.add(floor);
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.8,.14,12),new THREE.MeshStandardMaterial({ color:'#241d35', roughness:.55, metalness:.2 }));
    platform.position.y = -.01;
    platform.receiveShadow = true;
    scene.add(platform);
    const outerRingMaterial = new THREE.MeshStandardMaterial({ color:'#8064be', roughness:.45, metalness:.32, emissive:'#2c1d56', emissiveIntensity:.7 });
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(4.45,.035,6,72),outerRingMaterial);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = .08;
    scene.add(outerRing);
    const centerRing = new THREE.Mesh(new THREE.TorusGeometry(1.25,.025,5,48),new THREE.MeshStandardMaterial({ color:'#65cbd0', emissive:'#174e5d', emissiveIntensity:.8 }));
    centerRing.rotation.x = Math.PI / 2;
    centerRing.position.y = .09;
    scene.add(centerRing);

    const grid = new THREE.GridHelper(12,18,0x685292,0x322845);
    grid.position.y = .015;
    grid.material.transparent = true;
    grid.material.opacity = .2;
    scene.add(grid);

    const environmentColors = {
      crystal:{ bg:'#171126',floor:'#201a30',rim:'#a884ff',light:'#8b68ff' },
      ember:{ bg:'#211411',floor:'#2b1b19',rim:'#ed8259',light:'#e8663f' },
      moon:{ bg:'#10172a',floor:'#171e32',rim:'#698be2',light:'#5579e8' },
      moss:{ bg:'#111d17',floor:'#19291f',rim:'#71ca91',light:'#56ad70' },
      gym:{ bg:'#171521',floor:'#211d29',rim:'#b69aff',light:'#9274dd' }
    };
    const environmentPalette = { meadow:'moss',volcano:'ember',ice:'moon',forest:'moss',coast:'moon','crystal-arena':'crystal' };
    const stageSurface = isBattle ? canvas.parentElement : null;
    let currentEnvironment = '';
    function setEnvironment(environmentId) {
      const palette = environmentPalette[environmentId] || environmentId || 'crystal';
      if (currentEnvironment === palette) return;
      currentEnvironment = palette;
      const colors = environmentColors[palette] || environmentColors.crystal;
      scene.background = null;
      scene.fog = null;
      floor.material.color.set(colors.floor);
      outerRing.material.color.set(colors.rim);
      outerRing.material.emissive.set(colors.light);
      centerRing.material.color.set(colors.rim);
      centerRing.material.emissive.set(colors.light);
      rimLight.color.set(colors.light);
      if (stageSurface) stageSurface.style.background = 'radial-gradient(ellipse at 50% 18%,' + colors.bg + ' 0%,transparent 58%),linear-gradient(180deg,#12111c,#0b0b12 88%)';
      platform.visible = true;
      outerRing.visible = true;
      centerRing.visible = true;
      grid.visible = true;
    }
    setEnvironment('crystal');
    const models = { single:null, player:null, rival:null };
    let snapshot = null;
    let action = null;
    const clock = new THREE.Clock();
    function syncBattleFallback() {
      if (!isBattle) return;
      const fallback = document.getElementById('battle-art-fallback');
      if (!fallback) return;
      fallback.hidden = !!(models.player && models.player.loaded && models.rival && models.rival.loaded);
    }

    function clearModel(model) {
      if (!model) return;
      scene.remove(model.root);
      model.root.traverse(function (item) {
        if ((!model.sharedGeometry || item.userData.disposeGeometry) && item.geometry) item.geometry.dispose();
        if (item.material) {
          if (Array.isArray(item.material)) item.material.forEach(function (material) { material.dispose(); });
          else item.material.dispose();
        }
      });
    }
    function setModel(key, creature, facing) {
      const model = models[key];
      const nextId = creature ? creature.id : 'mystery-egg';
      if (model && model.id === nextId) {
        if (!isBattle && model.loaded) {
          document.getElementById('art-fallback').hidden = true;
          document.getElementById('three-warning').hidden = true;
        }
        syncBattleFallback();
        return model;
      }
      clearModel(model);
      const next = creature ? { root:new THREE.Group(),body:new THREE.Group(),facing:facing || 1,sharedGeometry:true } : buildEgg(THREE);
      next.id = nextId;
      models[key] = next;
      if (creature) next.root.add(next.body);
      scene.add(next.root);
      if (creature) {
        const assetKey = creature.archetype === 'squirrel' && creature.rare ? 'squirrel-rare' : creature.archetype;
        loadCreature(assetKey).then(function (asset) {
          if (models[key] !== next) return;
          const instance = asset.clone(true);
          const bounds = new THREE.Box3().setFromObject(instance);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());
          const scale = 2.15 / Math.max(.01,size.y,size.x * .58,size.z * .58);
          instance.scale.setScalar(scale);
          instance.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
          instance.traverse(function (item) {
            if (!item.isMesh) return;
            item.castShadow = true;
            item.receiveShadow = true;
            const materials = Array.isArray(item.material) ? item.material : [item.material];
            const recolored = materials.map(function (source) {
              const material = source.clone();
              if (creature.archetype === 'squirrel' && creature.rare) {
                material.onBeforeCompile = function (shader) {
                  shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <color_fragment>',
                    '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.31, 0.045, 0.78), 0.58);'
                  );
                };
                material.customProgramCacheKey = function () { return 'edgesquirrel-crystal-squirrel'; };
              } else if (material.color) {
                material.color.lerp(new THREE.Color(creature.color || '#ffffff'),.12);
              }
              return material;
            });
            item.material = Array.isArray(item.material) ? recolored : recolored[0];
          });
          next.body.rotation.y = next.facing > 0 ? .28 : -.28;
          next.body.add(instance);
          if (!isBattle) document.getElementById('art-fallback').hidden = true;
          document.getElementById('three-warning').hidden = true;
          next.loaded = true;
          syncBattleFallback();
        }).catch(function () {
          if (models[key] !== next) return;
          const warning = document.getElementById('three-warning');
          if (!isBattle) document.getElementById('art-fallback').hidden = false;
          warning.textContent = 'This creature model could not load. Your game controls still work; refresh to try again.';
          warning.hidden = false;
          syncBattleFallback();
        });
      }
      return next;
    }
    function setState(nextSnapshot) {
      snapshot = nextSnapshot || null;
      if (!snapshot) return;
      const fighting = snapshot.phase === 'battleReady' || snapshot.phase === 'battle';
      const stageEnvironment = isBattle ? (fighting ? (snapshot.arena === 'crystal' ? 'crystal-arena' : snapshot.arena) : snapshot.room) : (snapshot.phase === 'training' ? 'gym' : snapshot.room);
      setEnvironment(stageEnvironment);
      if (isBattle && fighting) {
        setModel('player',snapshot.monster,1);
        setModel('rival',snapshot.rival,-1);
        if (models.single) { clearModel(models.single); models.single = null; }
      } else if (!isBattle && !fighting) {
        setModel('single',snapshot.monster,1);
        if (models.player) { clearModel(models.player); models.player = null; }
        if (models.rival) { clearModel(models.rival); models.rival = null; }
      } else {
        Object.keys(models).forEach(function (key) {
          if (models[key]) { clearModel(models[key]); models[key] = null; }
        });
      }
    }
    let lastWidth = 0;
    let lastHeight = 0;
    function resize() {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width < 2 || height < 2) return;
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      renderer.setSize(width,height,false);
      const aspect = width / height;
      const halfHeight = isBattle ? 2.38 : 2.0;
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('resize',resize);
    function draw() {
      requestAnimationFrame(draw);
      if (!snapshot || canvas.clientWidth < 2 || canvas.clientHeight < 2) return;
      resize();
      const time = clock.getElapsedTime();
      if (isBattle && (snapshot.phase === 'battleReady' || snapshot.phase === 'battle')) {
        const aspect = canvas.clientWidth / canvas.clientHeight;
        const spread = Math.min(2.7,Math.max(1.1,aspect * .9));
        const scale = aspect < 1.55 ? .68 : (aspect < 2 ? .84 : 1.06);
        let playerLunge = 0;
        let rivalLunge = 0;
        if (action) {
          const progress = (performance.now() - action.started) / 580;
          if (progress >= 1) action = null;
          else {
            const eased = Math.sin(Math.PI * Math.min(1,progress));
            if (action.side === 'player') playerLunge = eased * .75;
            if (action.side === 'rival') rivalLunge = eased * .75;
          }
        }
        placeModel(models.player,-spread + playerLunge,scale,time);
        placeModel(models.rival,spread - rivalLunge,scale,time + 1.1);
      } else if (!isBattle && models.single) {
        placeModel(models.single,0,1.08,time);
      }
      renderer.render(scene,camera);
    }
    function placeModel(model,x,scale,time) {
      if (!model) return;
      model.root.position.set(x,.08 + Math.sin(time * 2.5) * .06,0);
      model.root.scale.set(scale,scale,scale);
      model.root.rotation.y = Math.sin(time * 1.4) * .025;
      model.body.rotation.z = Math.sin(time * 2.1) * .015;
    }
    draw();
    return {
      setState:setState,
      attack:function (side) { action = { side:side,started:performance.now() }; }
    };
  }

  function material(THREE,color,options) {
    const settings = options || {};
    return new THREE.MeshStandardMaterial({
      color:color || '#a88bff', roughness:settings.roughness == null ? .68 : settings.roughness,
      metalness:settings.metalness || 0, flatShading:true, transparent:!!settings.transparent,
      opacity:settings.opacity == null ? 1 : settings.opacity, emissive:settings.emissive || '#000000',
      emissiveIntensity:settings.emissiveIntensity || 0, side:settings.doubleSide ? THREE.DoubleSide : THREE.FrontSide
    });
  }
  function mesh(parent,THREE,geometry,color,options) {
    const item = new THREE.Mesh(geometry,material(THREE,color,options));
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function ico(parent,THREE,color,x,y,z,sx,sy,sz,detail,options) {
    const item = mesh(parent,THREE,new THREE.IcosahedronGeometry(1,detail == null ? 1 : detail),color,options);
    item.position.set(x,y,z);
    item.scale.set(sx,sy,sz);
    return item;
  }
  function block(parent,THREE,color,x,y,z,sx,sy,sz,options) {
    const item = mesh(parent,THREE,new THREE.BoxGeometry(sx,sy,sz),color,options);
    item.position.set(x,y,z);
    return item;
  }
  function cone(parent,THREE,color,x,y,z,radius,height,options) {
    const item = mesh(parent,THREE,new THREE.ConeGeometry(radius,height,5,1),color,options);
    item.position.set(x,y,z);
    return item;
  }
  function limb(parent,THREE,color,a,b,radius,options) {
    const start = new THREE.Vector3(a[0],a[1],a[2]);
    const end = new THREE.Vector3(b[0],b[1],b[2]);
    const direction = new THREE.Vector3().subVectors(end,start);
    const item = mesh(parent,THREE,new THREE.CylinderGeometry(radius * .72,radius,direction.length(),6,1),color,options);
    item.position.copy(start).add(end).multiplyScalar(.5);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    return item;
  }
  function triangle(parent,THREE,points,color,options) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    geometry.computeVertexNormals();
    return mesh(parent,THREE,geometry,color,Object.assign({ doubleSide:true },options || {}));
  }
  function addEyes(root,THREE,headX,headY,dir,accent,size) {
    const eyeSize = size || 1;
    for (const side of [-1,1]) {
      const eye = ico(root,THREE,'#17131d',headX + dir*.12,headY+.055,side*.245,.058*eyeSize,.071*eyeSize,.036*eyeSize,1);
      ico(root,THREE,accent,headX + dir*.145,headY+.065,side*.272,.021*eyeSize,.028*eyeSize,.014*eyeSize,1,{emissive:accent,emissiveIntensity:.55});
      eye.userData.eye = true;
      const brow = limb(root,THREE,'#402b2b',[dir*(headX-dir*.01),headY+.17,side*.22],[dir*(headX+dir*.17),headY+.19,side*.2],.035*eyeSize);
      brow.castShadow = false;
    }
  }
  function addElementDetails(root,THREE,monster,dir,accent) {
    const kind = monster.element;
    if (kind === 'Fire') {
      for (let i=0;i<3;i++) cone(root,THREE,i===1?'#ffc15f':accent,-dir*(.24+i*.27),1.72+i*.04,0,.22,.56,{emissive:'#a53c20',emissiveIntensity:.22});
    } else if (kind === 'Water') {
      for (let i=0;i<4;i++) ico(root,THREE,i%2?'#b6ffff':'#4fd4e0',-dir*.45+i*.29,1.9+(i%2)*.16,-.15,.09,.15,.08,0,{transparent:true,opacity:.88,emissive:'#237f9b',emissiveIntensity:.2});
    } else if (kind === 'Grass') {
      for (let i=0;i<4;i++) cone(root,THREE,i%2?'#a9e46d':'#52ae65',-dir*(.5-i*.27),1.66+i*.09,0,.16,.48);
    } else if (kind === 'Earth') {
      ico(root,THREE,'#a88b67',-dir*.72,1.75,-.12,.27,.27,.25,0);
      ico(root,THREE,'#829b68',-dir*.35,1.9,.12,.18,.2,.19,0);
    } else if (kind === 'Light') {
      const halo = mesh(root,THREE,new THREE.TorusGeometry(.57,.055,5,12),accent,{emissive:accent,emissiveIntensity:.7,metalness:.25});
      halo.position.set(dir*.55,2.18,0);
      halo.rotation.x = .35;
    } else if (kind === 'Dark') {
      cone(root,THREE,'#241b37',-dir*.17,1.94,.18,.23,.68);
      cone(root,THREE,'#241b37',-dir*.45,1.83,-.15,.19,.55);
    } else if (kind === 'Ice') {
      for (let i=0;i<4;i++) cone(root,THREE,i%2?'#d8fcff':'#7fe7fa',-dir*(.47-i*.26),1.83+i*.05,.05,.15,.55,{metalness:.18,emissive:'#287d9e',emissiveIntensity:.18});
    } else if (kind === 'Electric') {
      const points = [new THREE.Vector3(-dir*.2,1.96,.3),new THREE.Vector3(dir*.03,1.65,.32),new THREE.Vector3(-dir*.12,1.45,.35),new THREE.Vector3(dir*.16,1.2,.34)];
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#f3fdff'}));
      root.add(line);
      ico(root,THREE,accent,-dir*.52,2.03,-.2,.11,.11,.11,1,{emissive:accent,emissiveIntensity:1.3});
    } else if (kind === 'Psychic') {
      const ring = mesh(root,THREE,new THREE.TorusGeometry(.82,.025,5,24),accent,{emissive:accent,emissiveIntensity:.8});
      ring.position.set(-dir*.52,1.35,-.25);
      ring.rotation.y = .65;
      ico(root,THREE,'#f5dcff',dir*.15,2.28,-.05,.13,.13,.13,1,{emissive:'#c28bff',emissiveIntensity:1.2});
    } else if (kind === 'Ghost') {
      for (let i=0;i<3;i++) ico(root,THREE,accent,-dir*.7+i*.28,1.93+(i%2)*.2,-.28,.11,.11,.11,1,{emissive:accent,emissiveIntensity:.75,transparent:true,opacity:.83});
    } else if (kind === 'Poison') {
      for (let i=0;i<4;i++) ico(root,THREE,i%2?'#c9f56a':'#75c947',-dir*.56+i*.32,1.78+(i%2)*.28,.17,.095,.095,.095,1,{emissive:'#306e24',emissiveIntensity:.5});
    } else if (kind === 'Air') {
      cone(root,THREE,'#eef8ff',-dir*.44,1.97,.12,.12,.5);
      cone(root,THREE,'#d3edff',-dir*.12,2.03,.12,.13,.56);
      cone(root,THREE,'#b6ddfa',dir*.2,1.98,.12,.12,.46);
    } else if (kind === 'Metal') {
      block(root,THREE,'#c0d1de',-dir*.18,1.54,.45,.5,.24,.12,{metalness:.82,roughness:.32});
      block(root,THREE,'#9aafbd',-dir*.68,1.28,.4,.32,.38,.14,{metalness:.78,roughness:.35});
    }
  }
  function buildCreature(THREE,monster,facing) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    // Build every creature facing right; the stage mirrors the whole model for the rival.
    const dir = 1;
    const type = monster.archetype || 'dragon';
    const color = monster.color || '#a88bff';
    const accent = monster.light || '#e5d5ff';
    const dark = new THREE.Color(color).multiplyScalar(.58).getStyle();
    const belly = new THREE.Color(color).lerp(new THREE.Color('#f1dfbe'),.48).getStyle();
    const eyeColor = monster.element === 'Light' ? '#fff0a7' : (monster.element === 'Dark' ? '#dd9dff' : accent);
    const metal = monster.element === 'Metal' ? .58 : .08;
    const x = function (distance) { return dir * distance; };
    function orb(px,py,pz,sx,sy,sz,tint,detail,options) {
      return ico(body,THREE,tint,x(px),py,pz,sx,sy,sz,detail == null ? 1 : detail,options);
    }
    function bone(a,b,radius,tint,options) {
      return limb(body,THREE,tint,[x(a[0]),a[1],a[2]],[x(b[0]),b[1],b[2]],radius,options);
    }
    function claw(px,py,pz,scale,tint) {
      const talon = cone(body,THREE,tint,x(px),py,pz,.075*scale,.28*scale);
      talon.rotation.z = dir*Math.PI/2;
      return talon;
    }
    function quadrupedLegs(legColor,heavy) {
      const pairs = [[.47,-.34],[-.55,-.32]];
      pairs.forEach(function (pair) {
        [-1,1].forEach(function (side) {
          const hip = pair[0], z = side*.35, kneeX = hip + (hip > 0 ? -.1 : .14);
          const kneeY = heavy ? .48 : .46;
          bone([hip,.88,z],[kneeX,kneeY,z],heavy ? .23 : .17,legColor,{metalness:metal});
          orb(kneeX,kneeY,z,heavy ? .23 : .17,heavy ? .21 : .17,.18,legColor,0);
          bone([kneeX,kneeY,z],[hip+.04,.17,z],heavy ? .16 : .12,legColor,{metalness:metal});
          orb(hip+.13,.14,z+.035,.25,.14,.2,legColor,0);
          for (let toe=-1;toe<=1;toe++) claw(hip+.31,.09,z+toe*.105,heavy?1.1:.8,monster.element==='Metal'?'#d9e2e6':dark);
        });
      });
    }
    function taperedTail(points,baseColor,spines) {
      for (let i=0;i<points.length-1;i++) {
        const a=points[i],b=points[i+1],r=.25-i*.055;
        bone(a,b,Math.max(.045,r),i%2?baseColor:dark);
        orb(b[0],b[1],b[2],Math.max(.055,r*.62),Math.max(.055,r*.62),Math.max(.055,r*.62),baseColor,0);
        if (spines && i<points.length-2) {
          const spike=cone(body,THREE,accent,x((a[0]+b[0])*.5),Math.max(a[1],b[1])+.14,0,.1,.3);
          spike.rotation.z=Math.PI;
        }
      }
    }
    function face(headX,headY,headScale,muzzleScale,muzzleColor) {
      const head = orb(headX,headY,0,headScale,headScale*.84,headScale*.82,color,1,{metalness:metal,roughness:.58});
      orb(headX+dir*headScale*.61,headY-headScale*.26,.035,muzzleScale,muzzleScale*.58,muzzleScale*.65,muzzleColor || belly,0);
      orb(headX+dir*headScale*.9,headY-headScale*.25,.04,.07,.055,.09,dark,0);
      addEyes(body,THREE,headX+dir*headScale*.25,headY+.02,dir,eyeColor,Math.max(.72,headScale/.39));
      return head;
    }

    if (type === 'dragon') {
      orb(-.16,1.02,0,1.02,.52,.56,color,1,{metalness,roughness:.63});
      orb(.48,1.12,0,.5,.48,.48,color,1);
      orb(-.66,.97,0,.48,.43,.46,dark,1);
      orb(-.12,.84,.04,.64,.24,.47,belly,1);
      bone([.38,1.24,0],[.77,1.53,0],.27,color);
      const headX=.98, headY=1.59;
      face(headX,headY,.37,.25,belly);
      for (const side of [-1,1]) {
        const horn=cone(body,THREE,accent,x(.77),1.93,side*.2,.14,.45,{metalness:.18}); horn.rotation.z=dir*.2;
        bone([-.1,1.36,side*.28],[-.45,1.76,side*.91],.11,dark);
        bone([-.45,1.76,side*.91],[-.83,2.15,side*1.34],.055,accent);
        bone([-.45,1.76,side*.91],[-.61,1.1,side*1.24],.055,dark);
        triangle(body,THREE,[[x(-.1),1.36,side*.28],[x(-.45),1.76,side*.91],[x(-.61),1.1,side*1.24]],dark,{transparent:true,opacity:.94,metalness:.08});
        triangle(body,THREE,[[x(-.45),1.76,side*.91],[x(-.83),2.15,side*1.34],[x(-.61),1.1,side*1.24]],color,{transparent:true,opacity:.94});
      }
      quadrupedLegs(color,false);
      taperedTail([[-.72,.98,0],[-1.13,.89,0],[-1.52,.72,0],[-1.88,.45,0],[-2.18,.38,0]],color,true);
      for (let i=0;i<5;i++) {
        const spike=cone(body,THREE,accent,x(.25-i*.31),1.53-i*.045,-.25,.11,.3);
        spike.rotation.z=Math.PI;
      }
    } else if (type === 'raptor') {
      orb(-.16,1.02,0,.73,.48,.48,color,1,{metalness,roughness:.62});
      orb(-.57,.9,0,.39,.39,.38,dark,1);
      orb(.32,1.28,0,.39,.5,.38,color,1);
      const headX=.63, headY=1.79;
      bone([.28,1.46,0],[.52,1.69,0],.2,color);
      face(headX,headY,.31,.3,belly);
      for (const side of [-1,1]) {
        const armEnd=[.47,.94,side*.52];
        bone([.23,1.34,side*.28],[.53,1.2,side*.45],.14,color);
        bone([.53,1.2,side*.45],armEnd,.09,dark);
        for (let toe=0;toe<3;toe++) claw(armEnd[0]+.12,.91,side*.45+(toe-1)*.07,.7,accent);
        for (let i=0;i<3;i++) {
          const spike=cone(body,THREE,accent,x(-.28-i*.27),1.44-i*.045,side*.16,.095,.28);
          spike.rotation.z=Math.PI;
        }
      }
      for (const side of [-1,1]) {
        bone([-.34,.91,side*.27],[-.49,.48,side*.28],.22,color);
        orb(-.49,.48,side*.28,.2,.2,.19,color,0);
        bone([-.49,.48,side*.28],[-.25,.14,side*.3],.13,dark);
        orb(-.1,.13,side*.3,.25,.13,.17,color,0);
        for(let toe=-1;toe<=1;toe++) claw(.11,.09,side*.3+toe*.08,.88,accent);
      }
      taperedTail([[-.58,.97,0],[-1.05,.87,0],[-1.53,.72,0],[-1.98,.57,0],[-2.28,.38,0]],color,true);
      for (const side of [-1,1]) {
        const crest=cone(body,THREE,accent,x(.48),2.08,side*.13,.11,.33); crest.rotation.z=dir*.15;
      }
    } else if (type === 'wolf' || type === 'lion') {
      orb(-.12,1.02,0,.82,.47,.48,color,1,{metalness,roughness:.58});
      orb(.45,1.13,0,.48,.48,.43,color,1);
      orb(-.62,.95,0,.43,.42,.43,dark,1);
      orb(-.05,.84,.035,.59,.21,.39,belly,1);
      const headX=.98, headY=1.48;
      if (type === 'lion') {
        const mane=mesh(body,THREE,new THREE.IcosahedronGeometry(.53,1),accent,{metalness:.12,roughness:.76});
        mane.position.set(x(.89),1.48,0); mane.scale.set(.9,1,.88);
        for(let i=0;i<11;i++) {
          const angle=i*Math.PI*2/11;
          const tuft=cone(body,THREE,i%2?'#f8d477':'#d99a3c',x(.89+Math.cos(angle)*.48),1.48+Math.sin(angle)*.48,.05,.13,.36);
          tuft.rotation.z=Math.PI/2-angle;
        }
      }
      face(headX,headY,.34,.32,type==='wolf'?'#bca9bd':belly);
      for (const side of [-1,1]) {
        if (type === 'wolf') {
          const ear=cone(body,THREE,dark,x(.83),1.91,side*.2,.18,.48); ear.rotation.z=dir*.14;
          cone(body,THREE,'#cf8290',x(.84),1.91,side*.225,.085,.27);
          for(let i=0;i<5;i++) {
            const ruff=cone(body,THREE,i%2?color:dark,x(.55-i*.26),1.22+i*.08,side*.35,.13,.32); ruff.rotation.z=dir*.55;
          }
        } else {
          orb(.89,1.45,side*.3,.44,.48,.17,accent,0);
          const ear=cone(body,THREE,accent,x(.82),1.9,side*.22,.16,.4); ear.rotation.z=dir*.15;
        }
      }
      quadrupedLegs(color,type==='lion');
      taperedTail([[-.78,1.02,0],[-1.13,1.2,0],[-1.42,1.35,0]],color,false);
      if(type==='lion') orb(-1.45,1.38,0,.16,.18,.17,accent,1);
    } else if (type === 'squirrel') {
      orb(-.12,1.02,0,.53,.69,.43,color,1,{metalness:.08,roughness:.55});
      orb(-.13,.7,.02,.47,.35,.42,belly,1);
      const headX=.34,headY=1.72;
      face(headX,headY,.34,.23,belly);
      for(const side of [-1,1]) {
        const ear=cone(body,THREE,monster.rare?accent:dark,x(.19),2.13,side*.18,.15,.45); ear.rotation.z=dir*.08;
        cone(body,THREE,'#efb4bb',x(.19),2.12,side*.2,.075,.27);
        bone([.22,.83,side*.24],[.47,.54,side*.32],.13,color);
        orb(.5,.5,side*.32,.16,.16,.14,color,0);
        bone([-.33,.7,side*.27],[-.45,.28,side*.27],.17,dark);
        orb(-.3,.16,side*.28,.23,.14,.18,dark,0);
        for(let toe=0;toe<3;toe++) claw(-.1,.12,side*.28+(toe-1)*.07,.65,accent);
      }
      const tailPoints=[[-.48,.93,0],[-.96,1.02,-.02],[-1.36,1.32,-.05],[-1.48,1.75,-.08],[-1.27,2.04,-.1],[-.94,2.04,-.1]];
      for(let i=0;i<tailPoints.length-1;i++) bone(tailPoints[i],tailPoints[i+1],.31-i*.033,i>2?accent:color,{metalness:monster.rare ? .42 : .08,emissive:monster.rare?'#5b1b98':'#000000',emissiveIntensity:monster.rare ? .35 : 0});
      orb(-.94,2.04,-.1,.16,.16,.16,monster.rare?accent:color,0,{emissive:monster.rare?accent:'#000000',emissiveIntensity:monster.rare ? .5 : 0});
      if(monster.rare) {
        for(let i=0;i<7;i++) {
          const spike=cone(body,THREE,i%2?'#f1caff':'#b776ff',x(-1.43+i*.075),1.35+i*.1,-.12,.105,.42,{metalness:.44,emissive:'#7535bc',emissiveIntensity:.55});
          spike.rotation.z=dir*.3;
        }
      } else {
        for(let i=0;i<3;i++) cone(body,THREE,accent,x(-1.45+i*.13),1.55+i*.12,-.1,.1,.28);
      }
    } else if (type === 'golem') {
      const metalOptions={metalness:monster.element === 'Metal' ? .68 : .14,roughness:.82};
      const torso=mesh(body,THREE,new THREE.DodecahedronGeometry(.72,0),color,metalOptions);
      torso.position.set(x(-.05),1.1,0); torso.scale.set(1.05,1.15,.8);
      orb(-.05,1.12,.47,.4,.47,.14,dark,0,{emissive:monster.element==='Metal'?'#6ad4e4':'#000000',emissiveIntensity:.45});
      block(body,THREE,color,x(.02),1.77,0,.64,.26,.57,metalOptions);
      const head=mesh(body,THREE,new THREE.DodecahedronGeometry(.31,0),color,metalOptions); head.position.set(x(.49),1.88,0);
      for(const side of [-1,1]) {
        orb(.57,1.9,side*.19,.065,.07,.035,'#b8f0d1',0,{emissive:'#4bd68c',emissiveIntensity:.75});
        const shoulder=mesh(body,THREE,new THREE.DodecahedronGeometry(.29,0),dark,metalOptions); shoulder.position.set(x(.02),1.42,side*.43);
        bone([.02,1.4,side*.45],[.27,.92,side*.53],.25,color,metalOptions);
        orb(.27,.92,side*.53,.27,.26,.25,dark,0,metalOptions);
        bone([.27,.92,side*.53],[.48,.57,side*.53],.24,color,metalOptions);
        orb(.53,.47,side*.54,.35,.3,.31,color,0,metalOptions);
        bone([-.36,.85,side*.28],[-.42,.35,side*.3],.24,dark,metalOptions);
        orb(-.35,.24,side*.3,.34,.22,.32,color,0,metalOptions);
        for(let i=0;i<3;i++) {
          const shard=cone(body,THREE,monster.element==='Metal'?'#d4e6ed':accent,x(-.05+i*.14),2.0,side*.18,.13,.32,metalOptions); shard.rotation.z=Math.PI;
        }
      }
      for(let i=0;i<5;i++) {
        const plate=ico(body,THREE,i%2?dark:accent,x(-.57+i*.26),1.13,.51,.18,.13,.1,0,{metalness:.35});
        plate.rotation.z=dir*.18;
      }
    } else if (type === 'serpent') {
      const bodyPoints=[[-1.32,.37,0],[-.98,.48,0],[-.66,.69,0],[-.3,.92,0],[.05,1.13,0],[.35,1.37,0],[.48,1.69,0]];
      for(let i=0;i<bodyPoints.length-1;i++) {
        bone(bodyPoints[i],bodyPoints[i+1],.28-i*.028,i%2?color:dark);
        orb(bodyPoints[i+1][0],bodyPoints[i+1][1],0,.26-i*.028,.24-i*.02,.25-i*.022,color,0);
      }
      const headX=.54,headY=1.84;
      orb(headX,headY,0,.32,.32,.3,color,1);
      orb(.8,1.76,.02,.28,.16,.24,belly,0);
      addEyes(body,THREE,.57,1.88,dir,'#f7e77c',.78);
      for(const side of [-1,1]) {
        const hood=triangle(body,THREE,[[x(.1),1.42,side*.14],[x(-.3),1.91,side*.48],[x(.44),1.7,side*.15]],accent,{transparent:true,opacity:.9});
        hood.material.side=THREE.DoubleSide;
        cone(body,THREE,accent,x(.48),2.15,side*.17,.09,.32);
      }
    } else if (type === 'bird') {
      orb(-.04,1.02,0,.72,.48,.48,color,1,{metalness,roughness:.58});
      orb(.56,1.42,0,.34,.37,.32,color,1);
      const beak=cone(body,THREE,'#e9a54c',x(.91),1.36,.02,.18,.46); beak.rotation.z=-dir*Math.PI/2;
      addEyes(body,THREE,.62,1.45,dir,eyeColor,.82);
      for(const side of [-1,1]) {
        triangle(body,THREE,[[x(.15),1.34,side*.3],[x(-.31),1.95,side*.85],[x(-.66),.95,side*.58]],accent,{metalness:.12});
        for(let feather=0;feather<3;feather++) triangle(body,THREE,[[x(-.15-feather*.08),1.43,side*.38],[x(-.5-feather*.1),1.15,side*(.65+feather*.1)],[x(-.45-feather*.1),.98,side*.5]],dark);
        bone([-.2,.76,side*.16],[-.2,.24,side*.16],.1,'#a87443');
        for(let toe=0;toe<3;toe++) claw(.01,.19,side*.16+(toe-1)*.09,.7,'#d9b76a');
      }
      taperedTail([[-.55,.98,0],[-1.02,.79,0],[-1.4,.7,0]],accent,false);
    } else if (type === 'ghost') {
      const robe=mesh(body,THREE,new THREE.ConeGeometry(.58,1.34,8,3),color,{transparent:true,opacity:.82,emissive:color,emissiveIntensity:.28});
      robe.position.set(x(-.05),.93,0); robe.scale.set(1,.94,.8);
      orb(.25,1.72,0,.4,.4,.35,color,1,{transparent:true,opacity:.88,emissive:color,emissiveIntensity:.23});
      addEyes(body,THREE,.32,1.76,dir,eyeColor,.9);
      for(const side of [-1,1]) {
        bone([.04,1.26,side*.25],[.46,1.02,side*.47],.13,color,{transparent:true,opacity:.8,emissive:color,emissiveIntensity:.2});
        const wisp=cone(body,THREE,accent,x(.48),.45,side*.1,.16,.55,{transparent:true,opacity:.75,emissive:accent,emissiveIntensity:.48}); wisp.rotation.z=Math.PI;
      }
      for(let i=0;i<3;i++) cone(body,THREE,accent,x(-.45+i*.4),.29+(i%2)*.08,-.06,.15,.42,{transparent:true,opacity:.78,emissive:accent,emissiveIntensity:.42});
    }
    addElementDetails(body,THREE,monster,dir,accent);
    return { root:root,body:body,facing:facing || 1 };
  }
  function buildEgg(THREE) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const shell = mesh(body,THREE,new THREE.SphereGeometry(.78,9,7),'#e8d9ff',{roughness:.34,metalness:.16,emissive:'#6741a7',emissiveIntensity:.2});
    shell.position.y = 1.02;
    shell.scale.set(.72,1.06,.72);
    const band = mesh(body,THREE,new THREE.TorusGeometry(.54,.035,5,16),'#b892ff',{emissive:'#7046c2',emissiveIntensity:.75});
    band.position.y = 1.02;
    band.rotation.x = Math.PI / 2;
    cone(body,THREE,'#cbb1ff',0,1.85,0,.17,.34,{emissive:'#7949d2',emissiveIntensity:.5});
    return { root:root,body:body,facing:1 };
  }
})();

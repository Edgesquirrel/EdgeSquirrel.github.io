(function () {
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js';

  import(THREE_URL).then(function (THREE) {
    const preview = makeStage(THREE, document.getElementById('monster-canvas'), false);
    const battle = makeStage(THREE, document.getElementById('battle-canvas'), true);

    window.hatch3dSetState = function (snapshot) {
      preview.setState(snapshot);
      battle.setState(snapshot);
      document.getElementById('art-fallback').hidden = true;
      document.getElementById('three-warning').hidden = true;
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
    document.getElementById('three-warning').hidden = false;
  });

  function makeStage(THREE, canvas, isBattle) {
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
      'crystal-arena':{ bg:'#171126',floor:'#201a30',rim:'#a884ff',light:'#8b68ff' },
      ember:{ bg:'#211411',floor:'#2b1b19',rim:'#ed8259',light:'#e8663f' },
      moon:{ bg:'#10172a',floor:'#171e32',rim:'#698be2',light:'#5579e8' },
      moss:{ bg:'#111d17',floor:'#19291f',rim:'#71ca91',light:'#56ad70' },
      gym:{ bg:'#211b1a',floor:'#302725',rim:'#dfa96a',light:'#b97542' },
      meadow:{ bg:'#14251c',floor:'#243627',rim:'#9bd479',light:'#70b56e' },
      volcano:{ bg:'#2b1718',floor:'#38201b',rim:'#ff8a58',light:'#ff633f' },
      ice:{ bg:'#14222f',floor:'#263846',rim:'#a4eaff',light:'#68b8df' },
      forest:{ bg:'#142018',floor:'#202b22',rim:'#8fc28a',light:'#4f9364' },
      coast:{ bg:'#14252e',floor:'#26363a',rim:'#7ce5ee',light:'#47aebb' }
    };
    let environmentGroup = null;
    let environmentKey = '';
    function clearEnvironment() {
      if (!environmentGroup) return;
      scene.remove(environmentGroup);
      environmentGroup.traverse(function (item) {
        if (item.geometry) item.geometry.dispose();
        if (item.material) {
          if (Array.isArray(item.material)) item.material.forEach(function (entry) { entry.dispose(); });
          else item.material.dispose();
        }
      });
      environmentGroup = null;
    }
    function setEnvironment(environmentId, trainingFocus) {
      const nextKey = (environmentId || 'crystal') + ':' + (trainingFocus || '');
      if (environmentKey === nextKey) return;
      environmentKey = nextKey;
      clearEnvironment();
      const kind = environmentId || 'crystal';
      const colors = environmentColors[kind] || environmentColors.crystal;
      scene.background = new THREE.Color(colors.bg);
      scene.fog = new THREE.Fog(colors.bg,14,30);
      floor.material.color.set(colors.floor);
      outerRing.material.color.set(colors.rim);
      outerRing.material.emissive.set(colors.light);
      rimLight.color.set(colors.light);
      const isArena = ['meadow','volcano','ice','forest','coast','crystal-arena'].includes(kind);
      platform.visible = !isArena && kind !== 'gym';
      outerRing.visible = !isArena && kind !== 'gym';
      centerRing.visible = kind === 'crystal' || kind === 'ember' || kind === 'moon' || kind === 'moss';
      grid.visible = kind === 'crystal' || kind === 'ember' || kind === 'moon' || kind === 'moss';
      environmentGroup = new THREE.Group();
      scene.add(environmentGroup);
      const g = environmentGroup;
      function rock(x,y,z,sx,sy,sz,color,detail) {
        return ico(g,THREE,color,x,y,z,sx,sy,sz,detail == null ? 0 : detail);
      }
      function tree(x,z,scale,color,haunted) {
        const trunk = mesh(g,THREE,new THREE.CylinderGeometry(.13*scale,.22*scale,1.55*scale,5),haunted?'#292633':'#594139');
        trunk.position.set(x,.76*scale,z);
        trunk.rotation.z = haunted ? (x < 0 ? -.13 : .12) : 0;
        for (let tier=0;tier<3;tier++) {
          const crown = mesh(g,THREE,new THREE.ConeGeometry((.72-tier*.12)*scale,.9*scale,5),color);
          crown.position.set(x,(1.32+tier*.43)*scale,z);
        }
      }
      function peak(x,z,scale,color,snow) {
        cone(g,THREE,color,x,scale*.9,z,.9*scale,1.8*scale);
        if (snow) cone(g,THREE,snow,x,scale*1.48,z,.43*scale,.7*scale);
      }
      function shard(x,y,z,scale,color) {
        const item = cone(g,THREE,color,x,y,z,.27*scale,1.55*scale,{emissive:color,emissiveIntensity:.28,metalness:.18});
        item.rotation.z = (x < 0 ? -.12 : .12);
      }

      if (kind === 'gym') {
        block(g,THREE,'#49352d',0,1.45,-3.45,8.8,3.1,.18);
        block(g,THREE,'#76513d',0,2.92,-3.3,9,.12,.24);
        for (let x=-3.5;x<=3.5;x+=1.75) block(g,THREE,'#352723',x,1.4,-3.27,.09,2.8,.16);
        for (let x=-3.1;x<=3.1;x+=1.55) {
          const glow = trainingFocus === 'speed' ? '#d3a1ff' : '#80604c';
          block(g,THREE,glow,x,.035,-.7,.055,.025,4.2,{emissive:trainingFocus === 'speed' ? '#8c54b9' : '#000000',emissiveIntensity:.35});
        }
        const rackColor = trainingFocus === 'strength' ? '#f0c47b' : '#b6a99f';
        for (const x of [-2.65,-1.9]) {
          const post = mesh(g,THREE,new THREE.CylinderGeometry(.055,.055,1.42,6),rackColor,{metalness:.68,roughness:.38,emissive:trainingFocus === 'strength' ? '#87572a' : '#000000',emissiveIntensity:.28});
          post.position.set(x,.72,-1.75);
        }
        const bar = mesh(g,THREE,new THREE.CylinderGeometry(.055,.055,.95,8),rackColor,{metalness:.72,roughness:.35});
        bar.position.set(-2.27,1.25,-1.75); bar.rotation.z=Math.PI/2;
        for (const x of [-2.68,-1.86]) {
          const weight = mesh(g,THREE,new THREE.CylinderGeometry(.28,.28,.12,8),trainingFocus === 'strength' ? '#d49a4f' : '#6d7782',{metalness:.48});
          weight.position.set(x,1.25,-1.75); weight.rotation.z=Math.PI/2;
        }
        const dummyColor = trainingFocus === 'defense' ? '#e9bf82' : '#8d6b57';
        const dummy = mesh(g,THREE,new THREE.CylinderGeometry(.25,.32,.9,6),dummyColor,{emissive:trainingFocus === 'defense' ? '#77512e' : '#000000',emissiveIntensity:.28});
        dummy.position.set(2.42,.92,-1.9);
        const head = ico(g,THREE,dummyColor,2.42,1.55,-1.9,.3,.31,.27,0);
        for (const side of [-1,1]) limb(g,THREE,dummyColor,[2.42+side*.2,1.2,-1.9],[2.42+side*.52,.87,-1.85],.09);
        block(g,THREE,'#d2b18d',2.42,.09,-1.9,.85,.12,.6);
        for (const x of [-3.5,3.5]) {
          const lamp = mesh(g,THREE,new THREE.SphereGeometry(.13,8,6),trainingFocus === 'speed' ? '#d9c0ff' : '#f1c982',{emissive:trainingFocus === 'speed' ? '#8d62db' : '#9d6237',emissiveIntensity:.8});
          lamp.position.set(x,2.42,-3.16);
        }
      } else if (kind === 'meadow') {
        rock(-2.7,.05,-3.3,2.2,.75,.45,'#3e7651'); rock(2.7,.04,-3.7,2.5,.8,.5,'#4c8153');
        tree(-3.4,-2.7,.76,'#57915d',false); tree(3.3,-3.15,.9,'#568e5a',false); tree(-1.7,-4,.58,'#669f65',false);
        for (let i=0;i<9;i++) {
          const flower=ico(g,THREE,i%2?'#f6d47d':'#d7b5ff',-3.5+i*.86,.13,-1.7-(i%3)*.4,.08,.13,.08,0);
          flower.rotation.z=i*.2;
        }
        const sun=mesh(g,THREE,new THREE.SphereGeometry(.48,10,8),'#f4d993',{emissive:'#b47d3a',emissiveIntensity:.55}); sun.position.set(2.6,3.4,-4.5);
      } else if (kind === 'volcano') {
        peak(-2.5,-4.3,2.55,'#4c2824','#ff9361'); peak(2.9,-4.8,1.65,'#382322','#9a5142');
        rock(-3,.08,-2.5,1.5,.25,.7,'#742d25'); rock(2.8,.07,-2.4,1.35,.22,.72,'#8f3829');
        for (let i=0;i<6;i++) {
          const lava=block(g,THREE,'#ff7549',-2.35+i*.92,.13,-1.65-(i%2)*.3,.055,.075,1.35,{emissive:'#e84124',emissiveIntensity:1.3});
          lava.rotation.y=(i%2 ? .22 : -.18);
        }
        const glow = new THREE.PointLight(0xff4b26,8,9); glow.position.set(0,1.4,-2.8); g.add(glow);
      } else if (kind === 'ice') {
        peak(-3.1,-4.3,2.25,'#47728a','#dbf7ff'); peak(0,-4.8,2.8,'#527f97','#effcff'); peak(3,-4.1,2,'#355d79','#c5edfa');
        shard(-2.8,.7,-2.6,1.1,'#79d9ec'); shard(2.65,.72,-2.4,1.2,'#a5ecfa');
        rock(-3.7,.1,-1.9,.9,.28,.5,'#739db0'); rock(3.7,.1,-2,.8,.32,.55,'#557f9b');
      } else if (kind === 'forest') {
        for (let i=0;i<7;i++) tree(-3.7+i*1.23,-3.1-(i%2)*.55,.75+(i%3)*.12,i%2?'#34583e':'#273e35',true);
        for (let i=0;i<5;i++) {
          const wisp=mesh(g,THREE,new THREE.SphereGeometry(.09,7,6),i%2?'#a3f1c4':'#b1baff',{emissive:i%2?'#3aaf77':'#585fc4',emissiveIntensity:1.25,transparent:true,opacity:.8});
          wisp.position.set(-2.7+i*1.3,.65+(i%2)*.55,-1.6-(i%3)*.35);
        }
        const moon=mesh(g,THREE,new THREE.SphereGeometry(.42,10,8),'#c8d5cf',{emissive:'#809c9e',emissiveIntensity:.75}); moon.position.set(2.65,3.35,-4.6);
      } else if (kind === 'coast') {
        for (let i=0;i<5;i++) {
          const wave=block(g,THREE,i%2?'#397f91':'#4b9eaa',-3.2+i*1.6,.18,-3.8+(i%2)*.35,1.5,.11,.14,{emissive:'#1b5968',emissiveIntensity:.35});
          wave.rotation.y=-.06;
        }
        rock(-3.45,.55,-2.7,1.25,1.05,.95,'#766b62'); rock(3.35,.62,-2.9,1.35,1.1,.92,'#5e6465');
        rock(-3.1,1.34,-2.7,.85,.35,.8,'#879174'); rock(3.2,1.39,-2.9,.9,.34,.78,'#899479');
        for (let i=0;i<4;i++) block(g,THREE,'#b2ecdf',-2.4+i*1.55,.22,-2.2+(i%2)*.3,.78,.035,.07,{emissive:'#3d9ba5',emissiveIntensity:.65});
      } else if (kind === 'crystal') {
        for (let i=0;i<9;i++) {
          const x=-3.6+i*.9; const h=.75+(i%4)*.35;
          shard(x,h/2,-2.65-(i%3)*.3,h,i%2?'#9476e8':'#54c6d3');
        }
        for (let i=0;i<5;i++) {
          const ceiling=cone(g,THREE,i%2?'#634b91':'#437c8b',-3+i*1.5,3.35,-3.1,.4,.95,{emissive:i%2?'#634b91':'#437c8b',emissiveIntensity:.2});
          ceiling.rotation.z=Math.PI;
        }
      } else {
        for (let i=0;i<7;i++) shard(-3+i,.55+(i%3)*.18,-2.8-(i%2)*.35,.8+(i%2)*.3,i%2?'#a78bff':'#66d7db');
        const rune=mesh(g,THREE,new THREE.TorusGeometry(.82,.035,5,16),'#d6bcff',{emissive:'#8d62db',emissiveIntensity:.75});
        rune.position.set(0,1.35,-2.25); rune.rotation.x=.7;
      }
    }
    setEnvironment('crystal');

    const models = { single:null, player:null, rival:null };
    let snapshot = null;
    let action = null;
    const clock = new THREE.Clock();

    function clearModel(model) {
      if (!model) return;
      scene.remove(model.root);
      model.root.traverse(function (item) {
        if (item.geometry) item.geometry.dispose();
        if (item.material) {
          if (Array.isArray(item.material)) item.material.forEach(function (material) { material.dispose(); });
          else item.material.dispose();
        }
      });
    }
    function setModel(key, creature, facing) {
      const model = models[key];
      const nextId = creature ? creature.id : 'mystery-egg';
      if (model && model.id === nextId) return model;
      clearModel(model);
      const next = creature ? buildCreature(THREE,creature,facing) : buildEgg(THREE);
      next.id = nextId;
      models[key] = next;
      scene.add(next.root);
      return next;
    }
    function setState(nextSnapshot) {
      snapshot = nextSnapshot || null;
      if (!snapshot) return;
      const fighting = snapshot.phase === 'battleReady' || snapshot.phase === 'battle';
      const stageEnvironment = isBattle ? (fighting ? (snapshot.arena === 'crystal' ? 'crystal-arena' : snapshot.arena) : snapshot.room) : (snapshot.phase === 'training' ? 'gym' : snapshot.room);
      setEnvironment(stageEnvironment, !isBattle && snapshot.phase === 'training' ? snapshot.trainingFocus : '');
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
      const facing = model.facing || 1;
      model.root.scale.set(scale * facing,scale,scale);
      model.root.rotation.y = Math.sin(time * 1.4) * .025;
      model.body.rotation.z = Math.sin(time * 2.1) * .025;
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
  function addEyes(root,THREE,dir,accent) {
    for (const side of [-1,1]) {
      const eye = ico(root,THREE,'#201a2b',dir * .72,1.62,side * .31,.075,.09,.045,1);
      ico(root,THREE,accent,dir * .75,1.65,side * .35,.027,.03,.018,1,{emissive:accent,emissiveIntensity:.25});
      eye.userData.eye = true;
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
    const dir = facing || 1;
    const type = monster.archetype || 'dragon';
    const color = monster.color || '#a88bff';
    const accent = monster.light || '#e5d5ff';
    const dark = new THREE.Color(color).multiplyScalar(.58).getStyle();
    const rock = type === 'golem';
    if (type === 'ghost') {
      const robe = mesh(body,THREE,new THREE.ConeGeometry(.66,1.55,7,2),color,{transparent:true,opacity:.78,emissive:color,emissiveIntensity:.16});
      robe.position.set(-dir*.08,.88,0);
    } else if (type === 'golem') {
      const torso = mesh(body,THREE,new THREE.DodecahedronGeometry(.8,0),color,{metalness:monster.element === 'Metal' ? .62 : .2,roughness:.82});
      torso.position.set(-dir*.08,1.03,0);
      torso.scale.set(1.12,.92,.76);
      block(body,THREE,dark,-dir*.12,1.58,0,.92,.4,.78,{metalness:monster.element === 'Metal' ? .58 : .1});
    } else {
      const width = type === 'serpent' ? 1.25 : (type === 'squirrel' ? .58 : .96);
      const height = type === 'bird' ? .58 : (type === 'squirrel' ? .72 : .65);
      const torso = mesh(body,THREE,new THREE.IcosahedronGeometry(.78,1),color,{metalness:monster.element === 'Metal' ? .48 : .08,roughness:.7});
      torso.position.set(-dir*.08,1.06,0);
      torso.scale.set(width,height,.68);
    }
    if (type === 'serpent') {
      for (let i=0;i<5;i++) ico(body,THREE,i%2?dark:color,-dir*(.72-i*.3),.72+i*.18,0,.38-i*.025,.34-i*.02,.38-i*.025,1);
    }

    const headX = dir * (type === 'bird' ? .55 : .6);
    const head = mesh(body,THREE,type === 'golem' ? new THREE.DodecahedronGeometry(.45,0) : new THREE.IcosahedronGeometry(.43,1),accent,{metalness:monster.element === 'Metal' ? .5 : 0});
    head.position.set(headX,1.63,0);
    if (type === 'squirrel') head.scale.set(.93,1.04,.9);
    if (type === 'golem') head.scale.set(1.05,.88,.9);
    if (type === 'bird') head.scale.set(.95,.8,.82);
    const muzzleColor = type === 'golem' ? dark : color;
    if (type !== 'ghost') {
      const muzzle = ico(body,THREE,muzzleColor,headX+dir*.3,1.48,.18,.32,.2,.24,0);
      if (type === 'bird') {
        const beak = cone(body,THREE,'#e7b252',headX+dir*.48,1.55,.12,.17,.42,{roughness:.5});
        beak.rotation.z = -dir * Math.PI / 2;
      }
      if (type === 'dragon' || type === 'wolf' || type === 'raptor' || type === 'squirrel' || type === 'lion') addEyes(body,THREE,dir,accent);
      if (type === 'serpent') addEyes(body,THREE,dir,'#f7e77c');
      if (type === 'golem') {
        ico(body,THREE,'#b8f0d1',headX+dir*.08,1.65,.39,.09,.065,.04,1,{emissive:'#4bd68c',emissiveIntensity:.45});
        ico(body,THREE,'#b8f0d1',headX-dir*.17,1.65,.39,.09,.065,.04,1,{emissive:'#4bd68c',emissiveIntensity:.45});
      }
      if (type === 'ghost') addEyes(body,THREE,dir,accent);
    }

    if (type !== 'ghost' && type !== 'serpent') {
      const legCount = type === 'bird' ? 2 : 4;
      const positions = type === 'bird' ? [[-.1,.38],[.32,.38]] : [[-.55,-.3],[-.55,.3],[.48,-.3],[.48,.3]];
      for (let i=0;i<legCount;i++) {
        const item = positions[i];
        const top = [dir*item[0],.82,item[1]];
        const foot = [dir * (item[0] + (item[0] > 0 ? .08 : -.05)),.12,item[1]];
        limb(body,THREE,rock ? dark : color,top,foot,type === 'golem' ? .19 : .13,{metalness:monster.element === 'Metal' ? .5 : 0});
        ico(body,THREE,rock?accent:dark,foot[0]+dir*.05,.12,foot[2],.22,.13,.2,0);
      }
    }

    if (type === 'dragon' || type === 'raptor') {
      cone(body,THREE,accent,headX-dir*.17,2.02,.12,.14,.45);
      cone(body,THREE,accent,headX+dir*.02,2.0,-.12,.13,.39);
      for (let side of [-1,1]) {
        triangle(body,THREE,[[ -dir*.2,1.58,side*.34 ],[ -dir*.8,2.12,side*.76 ],[ -dir*.66,.9,side*.54 ]],dark,{transparent:true,opacity:.92});
        if (type === 'raptor') cone(body,THREE,accent,-dir*.38,1.82,side*.15,.15,.45);
      }
      for (let i=0;i<4;i++) cone(body,THREE,accent,-dir*(.15+i*.28),1.62-i*.04,-.2,.12,.35);
    } else if (type === 'wolf' || type === 'squirrel') {
      const earColor = type==='squirrel' ? accent : dark;
      cone(body,THREE,earColor,headX-dir*.15,2.0,.16,.22,.55);
      cone(body,THREE,earColor,headX-dir*.15,2.0,-.16,.22,.55);
      if (type === 'wolf') {
        for (let i=0;i<4;i++) cone(body,THREE,dark,-dir*(.2+i*.23),1.62,-.3,.14,.34);
      }
    } else if (type === 'golem') {
      for (let side of [-1,1]) {
        block(body,THREE,color,-dir*.64,1.35,side*.36,.55,.68,.52,{metalness:monster.element === 'Metal' ? .58 : .08});
        block(body,THREE,dark,-dir*.7,.48,side*.31,.42,.4,.44);
        cone(body,THREE,accent,-dir*.3,2.02,side*.18,.24,.58,{metalness:.24});
      }
      for (let i=0;i<3;i++) cone(body,THREE,accent,-dir*(.1+i*.35),1.85,-.25,.16,.4);
    } else if (type === 'squirrel') {
      const tail = mesh(body,THREE,new THREE.TorusGeometry(.58,.25,5,9),color,{metalness:.2,emissive:monster.rare ? '#401078' : '#000000',emissiveIntensity:monster.rare ? .4 : 0});
      tail.position.set(-dir*1.08,1.1,-.16);
      tail.rotation.z = dir*.45;
      for (let i=0;i<5;i++) {
        cone(body,THREE,i%2?'#f5d2ff':'#d9a5ff',-dir*(.72+i*.17),1.56+(i%3)*.16,-.12,.12,.5,{metalness:.38,emissive:'#7546a7',emissiveIntensity:.42});
      }
    } else if (type === 'lion') {
      const mane = mesh(body,THREE,new THREE.TorusGeometry(.48,.19,5,10),accent,{metalness:.18,emissive:'#8c5d1e',emissiveIntensity:.28});
      mane.position.set(headX,1.65,0);
      for (let i=0;i<7;i++) {
        const angle = i * Math.PI * 2 / 7;
        cone(body,THREE,accent,headX+Math.cos(angle)*.55,1.64+Math.sin(angle)*.55,.1,.13,.32);
      }
      cone(body,THREE,accent,headX-dir*.15,2.05,.12,.16,.48);
    } else if (type === 'ghost') {
      for (let i=0;i<3;i++) cone(body,THREE,accent,dir*(.42-i*.4),.3,-.05,.18,.52,{transparent:true,opacity:.72,emissive:accent,emissiveIntensity:.4});
    } else if (type === 'bird') {
      for (let side of [-1,1]) triangle(body,THREE,[[-dir*.1,1.45,side*.34],[-dir*.65,2.03,side*.78],[dir*.25,1.05,side*.6]],accent,{metalness:.08});
      cone(body,THREE,accent,headX-dir*.15,2.0,.1,.14,.45);
    }

    if (type === 'wolf' || type === 'dragon' || type === 'raptor' || type === 'squirrel' || type === 'lion') {
      for (let i=0;i<4;i++) ico(body,THREE,i%2?dark:color,-dir*(.78+i*.25),1.02+(type==='wolf'?i*.13:0),0,.25-i*.035,.2-i*.02,.2-i*.02,0);
    }
    addElementDetails(body,THREE,monster,dir,accent);
    return { root:root,body:body,facing:dir };
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

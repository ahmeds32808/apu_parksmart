function initializeParkingGarage() {
  const container = document.querySelector("#parking-scene");
  const canvas = container && container.querySelector(".scene-canvas");
  const statusElement = document.querySelector("#scene-status");
  const countElement = document.querySelector("#scene-count");
  const updatedElement = document.querySelector("#scene-updated");
  const fullMessage = document.querySelector("#scene-full-message");
  const speedControl = document.querySelector("#scene-speed");
  if (!container || !canvas) return;

  let speed = 1;
  if (speedControl) {
    speedControl.addEventListener("change", () => {
      speed = speedControl.value === "fast" ? 2.1 : 1;
    });
  }

  function updateSceneSummary(currentZones) {
    const free = currentZones.reduce((sum, zone) => sum + zone.available, 0);
    const capacity = currentZones.reduce((sum, zone) => sum + zone.total, 0);
    const ratio = free / capacity;
    const status = free === 0
      ? { key: "red", label: "Full" }
      : ratio <= 0.3
        ? { key: "amber", label: "Nearly Full" }
        : { key: "green", label: "Available" };
    if (statusElement) {
      statusElement.textContent = status.label;
      statusElement.className = `scene-status status-label status-${status.key}`;
    }
    if (countElement) countElement.textContent = `${free} / ${capacity} spaces free`;
    if (updatedElement) {
      const dashboardTime = document.querySelector("#last-updated");
      updatedElement.textContent = dashboardTime ? dashboardTime.textContent : "";
      updatedElement.dateTime = dashboardTime ? dashboardTime.dateTime : "";
    }
    if (fullMessage) fullMessage.hidden = free !== 0;
  }

  window.updateParkingScene = (currentZones) => {
    updateSceneSummary(currentZones);
  };
  window.updateParkingScene(zones);

  if (!window.THREE) return;
  const THREE = window.THREE;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch (error) {
    console.warn("ParkSmart garage scene could not start; showing the fallback illustration.", error);
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeff0f8);
  const camera = new THREE.OrthographicCamera(-10, 10, 9, -9, 0.1, 100);
  const lookAt = new THREE.Vector3(0, 1.15, 0);
  const ambient = new THREE.HemisphereLight(0xffffff, 0x77718a, 0.78);
  scene.add(ambient);
  const sunlight = new THREE.DirectionalLight(0xfff5e8, 1.08);
  sunlight.position.set(-12, 20, 16);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  sunlight.shadow.camera.left = -18;
  sunlight.shadow.camera.right = 18;
  sunlight.shadow.camera.top = 18;
  sunlight.shadow.camera.bottom = -18;
  sunlight.shadow.bias = -0.0004;
  scene.add(sunlight);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0xffffff, 1);

  const material = (color, roughness = 0.88, extra = {}) => new THREE.MeshStandardMaterial({
    color,
    roughness,
    ...extra
  });
  const materials = {
    ground: material(0x292b47),
    deck: material(0xaab4cb),
    deckEdge: material(0x8994ae),
    deckAccent: material(0x535673),
    wood: material(0xc87543),
    woodLight: material(0xe99d60),
    pillar: material(0x936147),
    line: material(0xfafaff),
    dark: material(0x29304c),
    glass: material(0x348e91, 0.32, { metalness: 0.08 }),
    sign: material(0x246db6),
    green: material(0x39c980, 0.32, { emissive: 0x1da95c, emissiveIntensity: 1.2 }),
    red: material(0xe35460, 0.32, { emissive: 0xb82d42, emissiveIntensity: 1.1 }),
    yellow: material(0xffcf6e, 0.35, { emissive: 0xed9e35, emissiveIntensity: 0.65 })
  };
  const carColors = [0xd95358, 0x438ac1, 0xe59a50, 0xf2eee8, 0x56aaa5, 0x7776ac];
  const carPaints = carColors.map((color) => material(color, 0.58));
  function addBox(width, height, depth, mat, x, y, z, parent = scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const island = new THREE.Mesh(new THREE.CircleGeometry(11.6, 6), materials.ground);
  island.rotation.x = -Math.PI / 2;
  island.position.y = -0.56;
  island.receiveShadow = true;
  scene.add(island);

  const lowerTop = 0.42;
  const upperTop = 3.08;
  const deckWidth = 12.2;
  const deckDepth = 13;
  const parkingRows = [
    { z: -5.85, aisleZ: -4.4 },
    { z: -2.95, aisleZ: -4.4 },
    { z: -1.45, aisleZ: 0 },
    { z: 1.45, aisleZ: 0 },
    { z: 2.95, aisleZ: 4.4 },
    { z: 5.85, aisleZ: 4.4 }
  ];

  function buildDeck(top) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(deckWidth, 0.3, deckDepth), materials.deck);
    slab.position.set(0, top - 0.15, 0);
    slab.receiveShadow = true;
    slab.castShadow = true;
    scene.add(slab);

    addBox(deckWidth + 0.38, 0.11, deckDepth + 0.38, materials.deckAccent, 0, top - 0.29, 0);
    addBox(deckWidth + 0.16, 0.22, 0.28, materials.wood, 0, top - 0.05, -6.5);
    addBox(deckWidth + 0.16, 0.22, 0.28, materials.wood, 0, top - 0.05, 6.5);
    addBox(0.28, 0.22, deckDepth, materials.wood, -6.05, top - 0.05, 0);
    addBox(0.28, 0.22, deckDepth, materials.wood, 6.05, top - 0.05, 0);

    const dividerGeometry = new THREE.BoxGeometry(0.045, 0.025, 1.07);
    for (let column = 0; column <= 9; column += 1) {
      const x = -5.175 + column * 1.15;
      for (const { z } of parkingRows) {
        const divider = new THREE.Mesh(dividerGeometry, materials.line);
        divider.position.set(x, top + 0.012, z);
        scene.add(divider);
      }
    }
  }

  buildDeck(lowerTop);
  buildDeck(upperTop);

  [-5.55, 5.55].forEach((x) => {
    [-5.8, 5.8].forEach((z) => {
      addBox(0.48, upperTop - 0.08, 0.48, materials.pillar, x, (upperTop + 0.12) / 2, z);
    });
  });
  [-4.3, 0, 4.3].forEach((z) => {
    addBox(0.4, upperTop - 0.08, 0.4, materials.pillar, -5.55, (upperTop + 0.12) / 2, z);
  });

  const tower = addBox(1.65, 4.2, 1.85, materials.wood, -6.8, 2.38, -5.2);
  tower.castShadow = true;
  addBox(1.78, 0.2, 1.98, materials.woodLight, -6.8, 4.54, -5.2);
  [-0.48, 0.38].forEach((xOffset) => {
    [0.98, 3.24].forEach((y) => {
      addBox(0.52, 1.2, 0.06, materials.glass, -6.8 + xOffset, y, -4.245);
    });
  });
  addBox(0.06, 2.45, 0.08, materials.glass, -5.965, 2.35, -5.2);

  const signBoard = addBox(0.95, 1.08, 0.16, materials.sign, 5.7, 1.27, 6.18);
  signBoard.castShadow = true;
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 160;
  signCanvas.height = 160;
  const signContext = signCanvas.getContext("2d");
  if (signContext) {
    signContext.fillStyle = "#246db6";
    signContext.fillRect(0, 0, 160, 160);
    signContext.fillStyle = "#fff";
    signContext.font = "700 118px Arial";
    signContext.textAlign = "center";
    signContext.textBaseline = "middle";
    signContext.fillText("P", 80, 83);
    const signFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.88),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
    );
    signFace.position.set(5.7, 1.27, 6.268);
    scene.add(signFace);
  }

  const ramp = addBox(2.35, 0.24, 12.2, materials.wood, 7.25, (lowerTop + upperTop) / 2, 0);
  ramp.rotation.x = Math.atan((upperTop - lowerTop) / 12.2);
  const rampSurface = addBox(2.16, 0.07, 12.08, materials.deckEdge, 7.25, (lowerTop + upperTop) / 2 + 0.02, 0);
  rampSurface.rotation.x = ramp.rotation.x;
  [-0.94, 0.94].forEach((xOffset) => {
    const rail = addBox(0.12, 0.28, 12.15, materials.woodLight, 7.25 + xOffset, (lowerTop + upperTop) / 2 + 0.23, 0);
    rail.rotation.x = ramp.rotation.x;
  });
  [-4.6, -2.3, 0, 2.3, 4.6].forEach((z) => {
    const dash = addBox(0.09, 0.035, 0.78, materials.line, 7.25, rampHeight(z) + 0.03, z);
    dash.rotation.x = ramp.rotation.x;
  });
  [-4.2, 0, 4.2].forEach((z) => {
    const y = (lowerTop + upperTop) / 2 - ((upperTop - lowerTop) / 12.2) * z;
    addBox(0.32, y * 2, 0.32, materials.pillar, 5.95, y, z);
    addBox(0.32, y * 2, 0.32, materials.pillar, 8.55, y, z);
  });

  const approachRoad = addBox(3.6, 0.12, 10, materials.dark, 7.25, lowerTop + 0.01, 10.8);
  approachRoad.receiveShadow = true;
  for (let index = 0; index < 4; index += 1) {
    addBox(0.1, 0.025, 0.62, materials.line, 7.25, lowerTop + 0.09, 7.6 + index * 2.1);
  }

  const gatePost = addBox(0.26, 1.2, 0.28, materials.wood, 5.35, 0.12, 7.8);
  const gatePivot = new THREE.Group();
  gatePivot.position.set(5.35, 0.65, 7.8);
  scene.add(gatePivot);
  const gateArm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.14), materials.woodLight);
  gateArm.position.x = 1.6;
  gateArm.castShadow = true;
  gatePivot.add(gateArm);
  const gateTip = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.13, 0.16), materials.red);
  gateTip.position.set(2.93, 0, 0);
  gatePivot.add(gateTip);
  gatePost.castShadow = true;

  const carGeometry = {
    body: new THREE.BoxGeometry(0.76, 0.34, 1.14),
    cabin: new THREE.BoxGeometry(0.57, 0.28, 0.59),
    beacon: new THREE.BoxGeometry(0.2, 0.075, 0.16)
  };
  function createCar(index) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(carGeometry.body, carPaints[index % carPaints.length]);
    body.position.y = 0.18;
    body.castShadow = true;
    group.add(body);
    const cabin = new THREE.Mesh(carGeometry.cabin, materials.glass);
    cabin.position.set(0, 0.45, -0.03);
    cabin.castShadow = true;
    group.add(cabin);
    const beacon = new THREE.Mesh(carGeometry.beacon, materials.yellow);
    beacon.position.set(0, 0.63, 0.14);
    beacon.visible = false;
    group.add(beacon);
    group.visible = false;
    scene.add(group);
    return { group, beacon, mode: "parked", curve: null, progress: 0, delay: 0, duration: 0 };
  }

  const spots = [];
  const floorOccupancy = [0, 0];
  let globalIndex = 0;
  zones.forEach((zone) => {
    for (let index = 0; index < zone.total; index += 1) {
      const floorIndex = (index + 1) % 2;
      const rowIndex = floorOccupancy[floorIndex];
      const column = rowIndex % 9;
      const row = parkingRows[Math.floor(rowIndex / 9)];
      floorOccupancy[floorIndex] += 1;
      const x = -4.6 + column * 1.15;
      const floorY = floorIndex === 0 ? lowerTop : upperTop;
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 8, 6),
        materials.green
      );
      bulb.position.set(x + 0.43, floorY + 1.18, row.z - 0.42);
      scene.add(bulb);
      spots.push({
        zoneId: zone.id,
        index,
        floorY,
        x,
        z: row.z,
        aisleZ: row.aisleZ,
        occupied: false,
        bulb,
        car: createCar(globalIndex)
      });
      globalIndex += 1;
    }
  });

  const waitingCar = createCar(globalIndex);
  waitingCar.group.position.set(7.25, lowerTop, 11.25);
  waitingCar.group.rotation.y = Math.PI;
  waitingCar.group.scale.setScalar(0.92);
  waitingCar.mode = "waiting";

  function point(x, y, z) {
    return new THREE.Vector3(x, y, z);
  }
  function curveThrough(points) {
    return new THREE.CatmullRomCurve3(points, false, "centripetal");
  }
  function rampHeight(z) {
    return (lowerTop + upperTop) / 2 - ((upperTop - lowerTop) / 12.2) * z + 0.045;
  }
  function routeToSpot(spot) {
    const entry = [
      point(7.25, lowerTop, 10.3),
      point(7.25, lowerTop, 6.2)
    ];
    if (spot.floorY === upperTop) {
      entry.push(
        point(7.25, rampHeight(5.8), 5.8),
        point(7.25, rampHeight(3), 3),
        point(7.25, rampHeight(0), 0),
        point(7.25, rampHeight(-3), -3),
        point(7.25, rampHeight(-5.8), -5.8),
        point(7.25, upperTop, -6.2),
        point(5.5, upperTop, -6.2),
        point(5.5, upperTop, spot.aisleZ),
        point(spot.x, upperTop, spot.aisleZ)
      );
    } else {
      entry.push(
        point(5.5, lowerTop, 6.2),
        point(5.5, lowerTop, spot.aisleZ),
        point(spot.x, lowerTop, spot.aisleZ)
      );
    }
    entry.push(point(spot.x, spot.floorY, spot.z));
    return entry;
  }
  function routeToExit(spot) {
    const exit = [
      point(spot.x, spot.floorY, spot.z),
      point(spot.x, spot.floorY, spot.aisleZ),
      point(5.5, spot.floorY, spot.aisleZ)
    ];
    if (spot.floorY === upperTop) {
      exit.push(
        point(5.5, upperTop, -6.2),
        point(7.25, upperTop, -6.2),
        point(7.25, rampHeight(-5.8), -5.8),
        point(7.25, rampHeight(-3), -3),
        point(7.25, rampHeight(0), 0),
        point(7.25, rampHeight(3), 3),
        point(7.25, rampHeight(5.8), 5.8),
        point(7.25, lowerTop, 6.2)
      );
    } else {
      exit.push(
        point(5.5, lowerTop, 6.2),
        point(7.25, lowerTop, 6.2)
      );
    }
    exit.push(point(7.25, lowerTop, 10.8));
    return exit;
  }
  let activeCar = null;
  function startMoving(spot, entering) {
    const car = spot.car;
    const route = entering ? routeToSpot(spot) : routeToExit(spot);
    if (entering) {
      car.group.position.copy(route[0]);
      car.group.rotation.y = Math.atan2(route[1].x - route[0].x, route[1].z - route[0].z);
    }
    car.curve = curveThrough(route);
    car.progress = 0;
    car.duration = Math.max(2.8, car.curve.getLength() / 3.8);
    car.mode = entering ? "arriving" : "departing";
    car.beacon.visible = true;
    car.group.scale.setScalar(1.16);
    car.group.visible = true;
    activeCar = spot;
  }
  function dispatchNextCar() {
    if (activeCar) return;
    const nextSpot = spots.find((spot) => (
      spot.car.mode === "parked" && spot.occupied !== spot.car.group.visible
    ));
    if (nextSpot) startMoving(nextSpot, nextSpot.occupied);
  }

  function settleAtBay(spot) {
    const car = spot.car;
    car.mode = "parked";
    car.beacon.visible = false;
    car.group.scale.setScalar(1);
    car.group.visible = spot.occupied;
    if (spot.occupied) {
      car.group.position.set(spot.x, spot.floorY, spot.z);
      car.group.rotation.y = spot.z < 0 ? Math.PI : 0;
    }
  }

  function updateSignals(currentZones) {
    const incomingCount = new Map(currentZones.map((zone) => [zone.id, zone.available]));
    const changedSpots = [];
    spots.forEach((spot) => {
      const free = incomingCount.get(spot.zoneId);
      const shouldBeOccupied = spot.index >= free;
      if (shouldBeOccupied !== spot.occupied) {
        spot.occupied = shouldBeOccupied;
        spot.bulb.material = shouldBeOccupied ? materials.red : materials.green;
        changedSpots.push(spot);
      }
    });
    const movingSpot = activeCar || changedSpots.shift();
    changedSpots.forEach((spot) => {
      if (spot !== movingSpot) settleAtBay(spot);
    });
    if (!activeCar && movingSpot) startMoving(movingSpot, movingSpot.occupied);
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let pointerX = 0;
  let pointerY = 0;
  let time = 0;
  let previousFrame = 0;
  let gateOpenUntil = 0;
  container.addEventListener("pointermove", (event) => {
    const bounds = container.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 1.2;
    pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.65;
  });
  container.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
  });

  function resizeScene() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    const viewHeight = 17.4;
    const viewWidth = viewHeight * (width / height);
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  }

  function initializeOccupiedBays(currentZones) {
    const availableByZone = new Map(currentZones.map((zone) => [zone.id, zone.available]));
    spots.forEach((spot) => {
      spot.occupied = spot.index >= availableByZone.get(spot.zoneId);
      spot.bulb.material = spot.occupied ? materials.red : materials.green;
      if (spot.occupied) {
        spot.car.group.visible = true;
        spot.car.mode = "parked";
        spot.car.beacon.visible = false;
        spot.car.group.scale.setScalar(1);
        spot.car.group.position.set(spot.x, spot.floorY, spot.z);
        spot.car.group.rotation.y = spot.z < 0 ? Math.PI : 0;
      }
    });
    waitingCar.group.visible = currentZones.every((zone) => zone.available === 0);
  }

  function animate(timestamp) {
    window.requestAnimationFrame(animate);
    if (document.hidden || timestamp - previousFrame < 33) return;
    const delta = Math.min((timestamp - previousFrame) / 1000, 0.06);
    previousFrame = timestamp;
    time += delta;
    let gateShouldOpen = false;
    if (activeCar) {
      const spot = activeCar;
      const car = spot.car;
      car.progress = Math.min(1, car.progress + (delta * speed) / car.duration);
      const position = car.curve.getPointAt(car.progress);
      const tangent = car.curve.getTangentAt(car.progress);
      car.group.position.copy(position);
      car.group.rotation.y = Math.atan2(tangent.x, tangent.z);
      if (Math.hypot(position.x - 7.25, position.z - 7.8) < 3.4) {
        gateShouldOpen = true;
        gateOpenUntil = time + 0.8;
      }
      if (car.progress === 1) {
        if (car.mode === "departing") {
          car.group.visible = false;
          car.mode = "parked";
        } else {
          car.mode = "parked";
          car.group.position.set(spot.x, spot.floorY, spot.z);
          car.group.rotation.y = spot.z < 0 ? Math.PI : 0;
        }
        car.beacon.visible = false;
        car.group.scale.setScalar(1);
        activeCar = null;
        dispatchNextCar();
      }
    }

    const full = zones.every((zone) => zone.available === 0);
    waitingCar.group.visible = full;
    gatePivot.rotation.z = THREE.MathUtils.damp(
      gatePivot.rotation.z,
      gateShouldOpen || time < gateOpenUntil ? Math.PI / 2 : 0,
      3.2,
      delta
    );
    if (!reducedMotion) {
      const sway = Math.sin(time * 0.22) * 0.24;
      camera.position.set(23.5 + sway + pointerX, 22 + pointerY, 23.5 - sway);
      camera.lookAt(lookAt.x + pointerX * 0.18, lookAt.y, lookAt.z + pointerY * 0.12);
    } else {
      camera.position.set(23.5 + pointerX, 22 + pointerY, 23.5);
      camera.lookAt(lookAt.x + pointerX * 0.18, lookAt.y, lookAt.z + pointerY * 0.12);
    }
    renderer.render(scene, camera);
  }

  initializeOccupiedBays(zones);
  const demoArrival = spots.find((spot) => spot.floorY === upperTop && spot.occupied);
  if (demoArrival) startMoving(demoArrival, true);
  resizeScene();
  window.addEventListener("resize", resizeScene);
  if ("ResizeObserver" in window) new ResizeObserver(resizeScene).observe(container);
  camera.position.set(23.5, 22, 23.5);
  camera.lookAt(lookAt);
  renderer.render(scene, camera);
  container.classList.add("three-ready");
  window.requestAnimationFrame(animate);

  window.updateParkingScene = (currentZones) => {
    updateSceneSummary(currentZones);
    updateSignals(currentZones);
  };
}

initializeParkingGarage();

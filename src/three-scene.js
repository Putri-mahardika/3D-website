import * as THREE from 'three';
import gsap from 'gsap';
import { createCupMesh, createLiquidMesh, createStrawMesh, createFruitMesh } from './three-models';
import { FLAVORS } from './content';

let scene, camera, renderer;
let mainGroup, cupContainer, fruitsGroup, particleSystem;
let currentFlavorId = 'mango';

// Animation state
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
const floatingFruits = [];
let particleMaterial;

// Custom lighting references
let keyLight, fillLight, pointLight;

/**
 * Initializes the entire Three.js environment
 */
export function initThreeScene(canvasContainer) {
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  // 1. Scene
  scene = new THREE.Scene();

  // 2. Camera
  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  // 3. Renderer with premium settings
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  canvasContainer.appendChild(renderer.domElement);

  // 4. Container Groups
  mainGroup = new THREE.Group();
  cupContainer = new THREE.Group();
  fruitsGroup = new THREE.Group();
  
  mainGroup.add(cupContainer);
  mainGroup.add(fruitsGroup);
  scene.add(mainGroup);

  // 5. Lighting System (Stunning studio setup)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  // Key Light (Cast sharp shadows)
  keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.position.set(5, 5, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  // Fill Light (Soften shadows, add color bounce)
  fillLight = new THREE.DirectionalLight(0xfff0dd, 0.8);
  fillLight.position.set(-5, 2, 2);
  scene.add(fillLight);

  // Backlight (Creates the translucent glow on the liquid and glass)
  const backLight = new THREE.DirectionalLight(0xffffff, 2.5);
  backLight.position.set(0, 0, -6);
  scene.add(backLight);

  // Tiny point light inside to add extra sparkle
  pointLight = new THREE.PointLight(0xffaa00, 1.5, 5);
  pointLight.position.set(0, 1, 1);
  scene.add(pointLight);

  // 6. Build Initial Cup and Straw
  buildJuiceCup(FLAVORS[currentFlavorId]);

  // 7. Spawn Initial Fruits
  spawnFloatingFruits(FLAVORS[currentFlavorId].fruits);

  // 8. Spawn Juice Particles
  buildSplashParticles(FLAVORS[currentFlavorId].colors.primary);

  // 9. Event Listeners
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);

  // 10. Start Animation Loop
  animate();
}

/**
 * Builds the central cup, liquid, and straw
 */
function buildJuiceCup(flavor) {
  // Clear any existing cup parts
  while(cupContainer.children.length > 0){
    cupContainer.remove(cupContainer.children[0]);
  }

  // Create individual parts
  const cup = createCupMesh();
  const liquid = createLiquidMesh(flavor.colors.liquid);
  const straw = createStrawMesh(flavor.colors.straw, flavor.colors.strawStripe);

  // Scale down the cup system slightly for framing
  const cupSystem = new THREE.Group();
  cupSystem.name = 'cupSystem';
  cupSystem.add(liquid);
  cupSystem.add(cup);
  cupSystem.add(straw);

  // Central placement
  cupSystem.position.y = -0.2;
  cupContainer.add(cupSystem);
}

/**
 * Spawns fruits and distributes them in a floating 3D sphere
 */
function spawnFloatingFruits(fruitTypes) {
  // Clear existing fruits from the group and array
  while(fruitsGroup.children.length > 0) {
    fruitsGroup.remove(fruitsGroup.children[0]);
  }
  floatingFruits.length = 0;

  // We want to spawn about 12 floating fruits around the cup
  const totalFruits = 14;
  for (let i = 0; i < totalFruits; i++) {
    // Pick fruit type from flavor's list
    const fruitType = fruitTypes[i % fruitTypes.length];
    const fruitMesh = createFruitMesh(fruitType);

    // Distribution mathematics: Place in a spiral/orbit around the cup
    const angle = (i / totalFruits) * Math.PI * 2 + Math.random() * 0.5;
    const distance = 1.8 + Math.random() * 1.5; // Radius from cup
    const height = -2.0 + Math.random() * 4.0;  // Up and down range
    const depth = -1.0 + Math.random() * 2.0;   // Depth parallax

    fruitMesh.position.set(
      Math.cos(angle) * distance,
      height,
      Math.sin(angle) * distance + depth
    );

    // Give each fruit unique rotation starting values
    fruitMesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );

    // Stagger float animation variables
    floatingFruits.push({
      mesh: fruitMesh,
      baseY: height,
      angle: angle,
      distance: distance,
      floatSpeed: 0.8 + Math.random() * 0.7,
      floatRange: 0.15 + Math.random() * 0.15,
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.6,
        y: (Math.random() - 0.5) * 0.6,
        z: (Math.random() - 0.5) * 0.6
      },
      phase: Math.random() * Math.PI * 2
    });

    // Start invisible, GSAP will animate scale in
    fruitMesh.scale.set(0.001, 0.001, 0.001);
    fruitsGroup.add(fruitMesh);

    // Pop in animation
    gsap.to(fruitMesh.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 1.0,
      delay: i * 0.05,
      ease: 'back.out(1.7)'
    });
  }
}

/**
 * Creates juice splash/droplet particle system
 */
function buildSplashParticles(colorHex) {
  if (particleSystem) {
    scene.remove(particleSystem);
  }

  const particleCount = 120;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const speeds = [];
  const angles = [];
  const phases = [];

  for (let i = 0; i < particleCount; i++) {
    // Spiral pattern distribution around the cup
    const angle = Math.random() * Math.PI * 2;
    const distance = 0.8 + Math.random() * 2.5;
    const y = -2.5 + Math.random() * 5.0;

    positions[i * 3] = Math.cos(angle) * distance;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * distance;

    speeds.push(0.005 + Math.random() * 0.015);
    angles.push(angle);
    phases.push(Math.random() * Math.PI * 2);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // High performance glowing point material
  particleMaterial = new THREE.PointsMaterial({
    color: new THREE.Color(colorHex),
    size: 0.08,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  particleSystem = new THREE.Points(geometry, particleMaterial);
  scene.add(particleSystem);

  // Store metadata on the system object
  particleSystem.userData = { speeds, angles, phases, particleCount };
}

/**
 * Capture mouse movement for parallax
 */
function onMouseMove(event) {
  // Normalize coordinates: -1.0 to +1.0
  mouse.targetX = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.targetY = -(event.clientY / window.innerHeight) * 2 + 1;
}

/**
 * Handle screen resizing
 */
function onWindowResize() {
  const container = document.getElementById('canvas-container');
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

/**
 * Triggers a massive premium GSAP morph animation between juice flavors
 */
export function transitionFlavor(flavorId) {
  if (flavorId === currentFlavorId) return;
  
  const oldFlavor = FLAVORS[currentFlavorId];
  const newFlavor = FLAVORS[flavorId];
  currentFlavorId = flavorId;

  // 1. Point Light Color shift
  gsap.to(pointLight.color, {
    r: new THREE.Color(newFlavor.colors.primary).r,
    g: new THREE.Color(newFlavor.colors.primary).g,
    b: new THREE.Color(newFlavor.colors.primary).b,
    duration: 1.2
  });

  // 2. Liquid & Straw Color Morphing
  const liquidMesh = cupContainer.getObjectByName('liquid');
  if (liquidMesh) {
    gsap.to(liquidMesh.material.color, {
      r: new THREE.Color(newFlavor.colors.liquid).r,
      g: new THREE.Color(newFlavor.colors.liquid).g,
      b: new THREE.Color(newFlavor.colors.liquid).b,
      duration: 1.5,
      ease: 'power2.out'
    });
  }

  // Swap straw materials color (using uniforms in shader)
  const strawGroup = cupContainer.getObjectByName('strawGroup');
  if (strawGroup && strawGroup.children[0]) {
    const strawMesh = strawGroup.children[0];
    gsap.to(strawMesh.material.uniforms.baseColor.value, {
      r: new THREE.Color(newFlavor.colors.straw).r,
      g: new THREE.Color(newFlavor.colors.straw).g,
      b: new THREE.Color(newFlavor.colors.straw).b,
      duration: 1.2
    });
  }

  // 3. Juice particles color shift
  gsap.to(particleMaterial.color, {
    r: new THREE.Color(newFlavor.colors.primary).r,
    g: new THREE.Color(newFlavor.colors.primary).g,
    b: new THREE.Color(newFlavor.colors.primary).b,
    duration: 1.0
  });

  // 4. Burst the particles outwards temporarily
  const positions = particleSystem.geometry.attributes.position.array;
  const count = particleSystem.userData.particleCount;
  
  for (let i = 0; i < count; i++) {
    const index = i * 3;
    const force = 1.5 + Math.random() * 2.0;
    
    // Animate individual particle coordinate explosion outwards
    gsap.to(positions, {
      [index]: positions[index] * force,
      [index + 1]: positions[index + 1] + (Math.random() - 0.5) * 2,
      [index + 2]: positions[index + 2] * force,
      duration: 0.5,
      yoyo: true,
      repeat: 1,
      ease: 'power2.out',
      onUpdate: () => {
        particleSystem.geometry.attributes.position.needsUpdate = true;
      }
    });
  }

  // 5. Spin and pop the cup (gives a delicious dynamic bounce)
  const cupSystem = cupContainer.getObjectByName('cupSystem');
  if (cupSystem) {
    gsap.to(cupSystem.rotation, {
      y: cupSystem.rotation.y + Math.PI * 2,
      x: 0.2, // Tilted slightly forward during spin
      duration: 1.2,
      ease: 'power3.inOut',
      onComplete: () => {
        gsap.to(cupSystem.rotation, { x: 0, duration: 0.4 });
      }
    });

    gsap.to(cupSystem.scale, {
      x: 0.85,
      y: 0.85,
      z: 0.85,
      duration: 0.5,
      yoyo: true,
      repeat: 1,
      ease: 'back.inOut(2.0)'
    });
  }

  // 6. Fruits Scatter and Regrow
  floatingFruits.forEach((item, index) => {
    gsap.to(item.mesh.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.4,
      delay: index * 0.02,
      ease: 'back.in(1.5)',
      onComplete: () => {
        // Once collapsed, spawn the new fruit types
        if (index === floatingFruits.length - 1) {
          spawnFloatingFruits(newFlavor.fruits);
        }
      }
    });
  });
}

/**
 * Main animation rendering loop (60fps)
 */
function animate() {
  requestAnimationFrame(animate);

  const time = performance.now() * 0.001;

  // 1. Smooth mouse parallax (linear interpolation)
  mouse.x += (mouse.targetX - mouse.x) * 0.08;
  mouse.y += (mouse.targetY - mouse.y) * 0.08;

  // Rotate main camera group based on mouse
  mainGroup.rotation.y = mouse.x * 0.45;
  mainGroup.rotation.x = -mouse.y * 0.35;

  // 2. Liquid gentle sloshing inside the cup
  const liquid = cupContainer.getObjectByName('liquid');
  if (liquid) {
    // Gentle floating sway
    liquid.rotation.z = Math.sin(time * 2.5) * 0.04 + (mouse.x * 0.08);
    liquid.rotation.x = Math.cos(time * 2.5) * 0.04 + (mouse.y * 0.08);
    liquid.position.y = -0.15 + Math.sin(time * 3.5) * 0.015;
  }

  // 3. Floating fruits movement (sinusoidal waves)
  floatingFruits.forEach(item => {
    // Orbit rotation around its own center
    item.mesh.rotation.x += item.rotSpeed.x * 0.025;
    item.mesh.rotation.y += item.rotSpeed.y * 0.025;
    item.mesh.rotation.z += item.rotSpeed.z * 0.025;

    // Up and down sine wave floating
    item.mesh.position.y = item.baseY + Math.sin(time * item.floatSpeed + item.phase) * item.floatRange;

    // Gentle orbital draft (sways left-right-forward-back slightly)
    const currentAngle = item.angle + Math.cos(time * 0.15 + item.phase) * 0.1;
    item.mesh.position.x = Math.cos(currentAngle) * item.distance;
    item.mesh.position.z = Math.sin(currentAngle) * item.distance;
  });

  // 4. Animate particle swarms (spiraling around the juice cup)
  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position.array;
    const speeds = particleSystem.userData.speeds;
    const angles = particleSystem.userData.angles;
    const phases = particleSystem.userData.phases;
    const count = particleSystem.userData.particleCount;

    for (let i = 0; i < count; i++) {
      const index = i * 3;

      // Particles spin around the Y-axis
      angles[i] += speeds[i] * 0.4;
      
      // Floating up-down wave
      positions[index + 1] += Math.sin(time * 1.5 + phases[i]) * 0.005;

      // Keep them orbiting the center
      const currentDist = Math.sqrt(positions[index] * positions[index] + positions[index + 2] * positions[index + 2]);
      positions[index] = Math.cos(angles[i]) * currentDist;
      positions[index + 2] = Math.sin(angles[i]) * currentDist;

      // If particle drifts too high or low, reset it
      if (positions[index + 1] > 3.0) {
        positions[index + 1] = -3.0;
      } else if (positions[index + 1] < -3.0) {
        positions[index + 1] = 3.0;
      }
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  // 5. Render Scene
  renderer.render(scene, camera);
}

/**
 * Update 3D scene properties dynamically as user scrolls down the page
 */
export function updateSceneOnScroll(fraction) {
  if (!mainGroup) return;

  // Linear interpolation/Target values for smooth scrolling
  // As user scrolls down, slide the cup to the right side of the screen,
  // tilt it slightly, and slide it downwards.
  gsap.to(mainGroup.position, {
    x: fraction * 2.8,    // Moves to the right
    y: -fraction * 1.8,   // Moves down
    z: -fraction * 1.0,   // Moves slightly back
    duration: 0.5,
    ease: 'power1.out'
  });

  gsap.to(mainGroup.rotation, {
    z: -fraction * 0.4,   // Tilts slightly
    x: fraction * 0.1,    // Rotates on X
    duration: 0.5,
    ease: 'power1.out'
  });

  // Soften light reflection and particle swarm as they scroll down
  if (particleMaterial) {
    gsap.to(particleMaterial, {
      opacity: Math.max(0.15, 0.7 - fraction * 0.55),
      duration: 0.3
    });
  }
}

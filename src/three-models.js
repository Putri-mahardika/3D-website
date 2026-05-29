import * as THREE from 'three';

// Helper to create a procedural canvas texture for the Kiwi Slice
function createKiwiTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Fill background with kiwi skin brown
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, 0, size, size);

  // Draw kiwi flesh (outer green ring)
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
  ctx.fillStyle = '#5c9e31';
  ctx.fill();

  // Draw inner flesh (brighter green)
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 25, 0, Math.PI * 2);
  ctx.fillStyle = '#8dc63f';
  ctx.fill();

  // Draw core (creamy light yellow/green)
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 85, 0, Math.PI * 2);
  ctx.fillStyle = '#f7ffd4';
  ctx.fill();

  // Draw seeds (radial dots around the core)
  const numSeeds = 28;
  const radius = 55;
  ctx.fillStyle = '#1e1a17';
  for (let i = 0; i < numSeeds; i++) {
    const angle = (i / numSeeds) * Math.PI * 2 + (Math.random() * 0.1);
    const x = size / 2 + Math.cos(angle) * radius;
    const y = size / 2 + Math.sin(angle) * radius;
    
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw soft radiating fibers from the core
  ctx.strokeStyle = '#eefda1';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    const startX = size / 2 + Math.cos(angle) * 45;
    const startY = size / 2 + Math.sin(angle) * 45;
    const endX = size / 2 + Math.cos(angle) * 90;
    const endY = size / 2 + Math.sin(angle) * 90;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Procedural strawberry shader material for high realism
function createStrawberryMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color('#e61a4d') },
      seedColor: { value: new THREE.Color('#ffdf4d') }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform vec3 color;
      uniform vec3 seedColor;
      void main() {
        // Create grid pattern for seeds
        vec2 seedUv = vUv * vec2(20.0, 12.0);
        vec2 grid = fract(seedUv) - 0.5;
        
        // Offset alternate rows for diamond-like layout
        float rowOffset = step(0.5, fract(seedUv.y * 0.5));
        if (rowOffset > 0.5) {
          grid.x = fract(seedUv.x + 0.5) - 0.5;
        }

        // Draw seed dots
        float dist = length(grid);
        float isSeed = smoothstep(0.18, 0.08, dist);

        // Highlight around the seeds (white border)
        float isSeedBorder = smoothstep(0.24, 0.16, dist) * (1.0 - isSeed);

        // Diffuse lighting
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float diffuse = max(dot(normal, vec3(0.5, 0.7, 1.0)), 0.0);
        
        // Combine base color and seeds
        vec3 base = mix(color, vec3(1.0, 0.3, 0.4), isSeedBorder * 0.5);
        vec3 finalColor = mix(base, seedColor, isSeed);

        // Apply simple lighting
        finalColor *= (diffuse * 0.7 + 0.4);

        // Add specular highlight
        vec3 halfDir = normalize(vec3(0.5, 0.7, 1.0) + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
        finalColor += vec3(0.4) * spec * (1.0 - isSeed);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `
  });
}

// Procedural Striped Straw Shader Material
function createStripedStrawMaterial(baseColorHex, stripeColorHex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: new THREE.Color(baseColorHex) },
      stripeColor: { value: new THREE.Color(stripeColorHex) }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      uniform vec3 baseColor;
      uniform vec3 stripeColor;
      void main() {
        // Diagonal stripes using vUv.y (along cylinder) and vUv.x (around cylinder)
        float diagonal = vUv.y * 12.0 + vUv.x * 2.0;
        float stripePattern = step(0.5, fract(diagonal));
        
        vec3 color = mix(baseColor, stripeColor, stripePattern);
        
        // Add basic lighting
        vec3 normal = normalize(vNormal);
        float diffuse = max(dot(normal, vec3(0.5, 0.5, 1.0)), 0.0);
        color *= (diffuse * 0.6 + 0.4);

        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
}

/**
 * Creates the transparent main cup mesh
 */
export function createCupMesh() {
  const cupGroup = new THREE.Group();

  // 1. Cup Body (Tapered Cylinder)
  // CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded)
  const bodyGeom = new THREE.CylinderGeometry(1.2, 0.85, 3.2, 32, 1, true);
  
  // High physical transparency glass material
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.05,
    metalness: 0.05,
    transmission: 0.95, // High refraction
    ior: 1.48,           // Glass IOR
    thickness: 0.1,      // Visual thickness
    side: THREE.DoubleSide,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    specularIntensity: 1.0,
    depthWrite: false
  });

  const cupBody = new THREE.Mesh(bodyGeom, glassMat);
  cupBody.name = 'cupBody';
  cupGroup.add(cupBody);

  // 2. Cup Bottom (Thick glass base)
  const bottomGeom = new THREE.CylinderGeometry(0.85, 0.82, 0.15, 32);
  const cupBottom = new THREE.Mesh(bottomGeom, glassMat);
  cupBottom.position.y = -1.6;
  cupGroup.add(cupBottom);

  // 3. Cup Rim (Ring around the top)
  const rimGeom = new THREE.TorusGeometry(1.2, 0.05, 12, 48);
  const cupRim = new THREE.Mesh(rimGeom, glassMat);
  cupRim.rotation.x = Math.PI / 2;
  cupRim.position.y = 1.6;
  cupGroup.add(cupRim);

  return cupGroup;
}

/**
 * Creates the interior liquid mesh
 */
export function createLiquidMesh(liquidColor) {
  // Tapered cylinder slightly smaller than the cup body
  const liquidGeom = new THREE.CylinderGeometry(1.15, 0.82, 2.7, 32, 8);
  
  // Custom shader-like properties or high transmission physical material
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(liquidColor),
    transparent: true,
    opacity: 0.92,
    roughness: 0.1,
    transmission: 0.55,  // Juicy, light-transmitting effect
    ior: 1.34,           // Water/Juice IOR
    thickness: 0.3,      // Depth color absorption
    clearcoat: 0.5,
    depthWrite: true
  });

  const liquid = new THREE.Mesh(liquidGeom, liquidMat);
  liquid.name = 'liquid';
  liquid.position.y = -0.15; // Centered inside the cup

  return liquid;
}

/**
 * Creates a striped dynamic straw
 */
export function createStrawMesh(baseColor, stripeColor) {
  const strawGroup = new THREE.Group();
  strawGroup.name = 'strawGroup';

  // Straw geometry
  const strawGeom = new THREE.CylinderGeometry(0.07, 0.07, 4.4, 16);
  const strawMat = createStripedStrawMaterial(baseColor, stripeColor);

  const straw = new THREE.Mesh(strawGeom, strawMat);
  
  // Tilt the straw nicely and slide it into the cup
  straw.rotation.z = -0.16; // Tilted slightly to the right
  straw.rotation.x = 0.08;
  straw.position.set(-0.3, 0.8, -0.1);

  strawGroup.add(straw);
  return strawGroup;
}

/**
 * Fruit Factory: Generates high-quality procedural 3D fruits
 */
export function createFruitMesh(type) {
  const fruitGroup = new THREE.Group();
  fruitGroup.name = `fruit_${type}`;

  const greenLeafMat = new THREE.MeshStandardMaterial({
    color: 0x39b54a,
    roughness: 0.6,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  if (type === 'strawberry') {
    // 1. Strawberry Body
    const bodyGeom = new THREE.ConeGeometry(0.3, 0.55, 16, 16);
    bodyGeom.rotateX(Math.PI); // Point down
    const strawberryMat = createStrawberryMaterial();
    const body = new THREE.Mesh(bodyGeom, strawberryMat);
    body.position.y = -0.05;
    fruitGroup.add(body);

    // 2. Leaf Crown
    const leafGeo = new THREE.ConeGeometry(0.08, 0.22, 4);
    leafGeo.rotateX(Math.PI / 2);
    
    const numLeaves = 5;
    for (let i = 0; i < numLeaves; i++) {
      const leaf = new THREE.Mesh(leafGeo, greenLeafMat);
      const angle = (i / numLeaves) * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * 0.08, 0.24, Math.sin(angle) * 0.08);
      leaf.rotation.y = angle;
      leaf.rotation.z = 0.6; // Flare outward
      fruitGroup.add(leaf);
    }
  } 
  else if (type === 'blueberry') {
    // 1. Blueberry main sphere
    const sphereGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const berryMat = new THREE.MeshStandardMaterial({
      color: 0x222d5a, // Deep blue
      roughness: 0.4,
      metalness: 0.1
    });
    const body = new THREE.Mesh(sphereGeom, berryMat);
    fruitGroup.add(body);

    // 2. Small crown at the top
    const crownGeom = new THREE.TorusGeometry(0.05, 0.02, 6, 12);
    const crown = new THREE.Mesh(crownGeom, berryMat);
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 0.17;
    fruitGroup.add(crown);
  } 
  else if (type === 'mango') {
    // Mango slice (golden thick curved box)
    const geom = new THREE.BoxGeometry(0.45, 0.22, 0.16);
    
    // Smooth out edges manually by scaling a sphere or rounding vertexes isn't easily done procedurally,
    // so we use a sphere highly scaled to represent a juicy mango chunk!
    const mangoGeom = new THREE.SphereGeometry(0.24, 16, 16);
    mangoGeom.scale(1.6, 0.9, 0.6); // Oval chunky slice
    
    const mangoMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00, // Golden yellow-orange
      roughness: 0.35,
      metalness: 0.05
    });
    const slice = new THREE.Mesh(mangoGeom, mangoMat);
    fruitGroup.add(slice);
  } 
  else if (type === 'kiwi') {
    // Thin cylinder slice
    const geom = new THREE.CylinderGeometry(0.28, 0.28, 0.07, 32);
    geom.rotateX(Math.PI / 2); // Face forward

    const kiwiTex = createKiwiTexture();

    // Map materials: side is brown skin, top and bottom are procedural texture
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x6e4627,
      roughness: 0.95
    });
    const fleshMat = new THREE.MeshStandardMaterial({
      map: kiwiTex,
      roughness: 0.3
    });

    const materials = [
      skinMat,   // Cylinder sides
      fleshMat,  // Cylinder top face
      fleshMat   // Cylinder bottom face
    ];

    const slice = new THREE.Mesh(geom, materials);
    fruitGroup.add(slice);
  } 
  else if (type === 'mint' || type === 'spinach') {
    // A beautiful organic leaf
    const leafGeo = new THREE.DodecahedronGeometry(0.24, 1);
    leafGeo.scale(1.4, 0.8, 0.1); // Squashed to flat leaf shape
    
    const leafColor = type === 'mint' ? 0x22a844 : 0x1b5e20;
    const leafMat = new THREE.MeshStandardMaterial({
      color: leafColor,
      roughness: 0.5,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
    
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    fruitGroup.add(leaf);

    // Tiny leaf stem
    const stemGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.16);
    const stem = new THREE.Mesh(stemGeom, leafMat);
    stem.position.y = -0.22;
    stem.rotation.z = 0.2;
    fruitGroup.add(stem);
  }

  // Scale the fruit slightly random to look natural
  const scale = 0.95 + Math.random() * 0.15;
  fruitGroup.scale.set(scale, scale, scale);

  // Cast and receive shadows
  fruitGroup.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return fruitGroup;
}

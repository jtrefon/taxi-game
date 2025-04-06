import * as THREE from '../../libs/three.module.js';
import * as CANNON from '../../libs/cannon-es.js';

/**
 * Manages the overall game world, including ground, sky, and environmental elements
 */
export class GameWorld {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    
    this.init();
  }
  
  init() {
    this.createEnvironmentMap();
    this.createGround();
    this.createSky();
  }
  
  /**
   * Create an environment map for reflective materials
   */
  createEnvironmentMap() {
    // Create a simple procedural environment map
    const resolution = 256;
    const size = 6; // 6 sides of the cube
    
    // Create data for a procedural cubemap
    const data = new Uint8Array(resolution * resolution * 4 * size);
    
    // Define colors for each face (+X, -X, +Y, -Y, +Z, -Z)
    const faceColors = [
      [60, 120, 160], // Right - light blue
      [50, 80, 120],  // Left - darker blue
      [100, 150, 200], // Top - sky blue
      [60, 80, 30],   // Bottom - ground
      [120, 160, 180], // Front - light blue-grey
      [80, 100, 140]  // Back - mid blue
    ];
    
    // Fill each face with gradient and some noise for a more natural look
    for (let face = 0; face < 6; face++) {
      const faceColor = faceColors[face];
      const baseIndex = resolution * resolution * 4 * face;
      
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          const index = baseIndex + (y * resolution + x) * 4;
          
          // Create gradient based on y position
          const gradient = y / resolution;
          
          // Add some random noise
          const noise = Math.random() * 0.1 - 0.05;
          
          // Calculate color with gradient and noise
          data[index] = Math.min(255, Math.max(0, faceColor[0] * (gradient + 0.5 + noise)));
          data[index + 1] = Math.min(255, Math.max(0, faceColor[1] * (gradient + 0.5 + noise)));
          data[index + 2] = Math.min(255, Math.max(0, faceColor[2] * (gradient + 0.5 + noise)));
          data[index + 3] = 255; // Alpha
        }
      }
    }
    
    // Create the cubemap texture
    const envMap = new THREE.DataTexture(
      data, resolution, resolution,
      THREE.RGBAFormat, THREE.UnsignedByteType,
      THREE.CubeTexture.DEFAULT_MAPPING,
      THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping,
      THREE.LinearFilter, THREE.LinearMipmapLinearFilter
    );
    
    // Convert to cubemap texture
    const cubeSize = resolution;
    const textureCube = new THREE.CubeTexture();
    
    for (let i = 0; i < 6; i++) {
      const faceData = new Uint8Array(cubeSize * cubeSize * 4);
      const offset = i * cubeSize * cubeSize * 4;
      
      for (let j = 0; j < cubeSize * cubeSize * 4; j++) {
        faceData[j] = data[offset + j];
      }
      
      const faceTexture = new THREE.DataTexture(
        faceData, cubeSize, cubeSize,
        THREE.RGBAFormat, THREE.UnsignedByteType
      );
      
      faceTexture.needsUpdate = true;
      textureCube.images[i] = faceTexture;
    }
    
    textureCube.needsUpdate = true;
    textureCube.mapping = THREE.CubeReflectionMapping;
    
    // Store for use with materials
    this.environmentMap = textureCube;
    this.scene.environment = textureCube;
  }
  
  createGround() {
    // Visual ground (Three.js)
    const groundGeometry = new THREE.PlaneGeometry(1500, 1500, 20, 20);
    
    // Create a procedural grass-like texture
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2d7d32, // Grass green
      roughness: 1.0,
      metalness: 0.0
    });
    
    // Add noise to the grass color for more natural look
    const noiseSize = 1000;
    const data = new Uint8Array(noiseSize * noiseSize * 3);
    
    for (let i = 0; i < noiseSize * noiseSize; i++) {
      // Random variations in the green color
      const c = Math.floor(Math.random() * 17);
      data[i * 3] = 45 + c; // R
      data[i * 3 + 1] = 125 + c; // G
      data[i * 3 + 2] = 50 + c; // B
    }
    
    const grassTexture = new THREE.DataTexture(data, noiseSize, noiseSize, THREE.RGBAFormat);
    grassTexture.needsUpdate = true;
    groundMaterial.map = grassTexture;
    
    this.groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);
    
    // Add some terrain variations
    this.addTerrainVariations();
    
    // Physics ground (Cannon.js)
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
      mass: 0,
      material: new CANNON.Material('groundMaterial')
    });
    
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.physicsWorld.addBody(groundBody);
    
    // Create a friction material for vehicle-ground interactions
    const groundMat = new CANNON.Material('groundMaterial');
    const wheelMat = new CANNON.Material('wheelMaterial');
    const wheelGroundContact = new CANNON.ContactMaterial(wheelMat, groundMat, {
      friction: 0.6,     // Reduced from 0.7, back towards original 0.5
      restitution: 0.2   // Keep reduced bounce
    });
    
    this.physicsWorld.addContactMaterial(wheelGroundContact);
  }
  
  // Add more terrain variation outside the city
  addTerrainVariations() {
    // Add random patches of different grass/terrain
    const patchCount = 50;
    const minSize = 10;
    const maxSize = 30;
    const maxDistance = 600; // How far from center patches can appear
    
    for (let i = 0; i < patchCount; i++) {
      // Random position away from the city center
      const angle = Math.random() * Math.PI * 2;
      const distance = 200 + Math.random() * (maxDistance - 200);
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      // Random size
      const width = minSize + Math.random() * (maxSize - minSize);
      const height = minSize + Math.random() * (maxSize - minSize);
      
      // Create patch
      const patchGeometry = new THREE.PlaneGeometry(width, height);
      const patchMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(
          0.1 + Math.random() * 0.2,
          0.3 + Math.random() * 0.5,
          0.1 + Math.random() * 0.2
        ),
        roughness: 1.0
      });
      
      const patch = new THREE.Mesh(patchGeometry, patchMaterial);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(x, 0.01, z); // Slightly above ground to avoid z-fighting
      patch.receiveShadow = true;
      this.scene.add(patch);
    }
    
    // Add some hills in the distance
    this.addDistantHills();
  }
  
  addDistantHills() {
    const hillCount = 15;
    const minDistance = 400;
    const maxDistance = 800;
    
    for (let i = 0; i < hillCount; i++) {
      // Random position in the far distance
      const angle = Math.random() * Math.PI * 2;
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      // Create a hill as a hemisphere
      const radius = 50 + Math.random() * 150;
      const height = 30 + Math.random() * 70;
      
      const hillGeometry = new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const hillMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(
          0.1 + Math.random() * 0.2,
          0.3 + Math.random() * 0.4,
          0.1 + Math.random() * 0.2
        ),
        roughness: 1.0,
        flatShading: true
      });
      
      const hill = new THREE.Mesh(hillGeometry, hillMaterial);
      hill.position.set(x, -radius + height, z);
      hill.receiveShadow = true;
      hill.castShadow = true;
      this.scene.add(hill);
    }
  }
  
  createSky() {
    // Simple sky with gradient color
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(500, 16, 16),
      new THREE.ShaderMaterial({
        uniforms: {
          topColor: { value: new THREE.Color(0x0077ff) },
          bottomColor: { value: new THREE.Color(0xffffff) },
          offset: { value: 33 },
          exponent: { value: 0.6 }
        },
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          uniform float offset;
          uniform float exponent;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition + offset).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(h, exponent), 0.0)), 1.0);
          }
        `,
        side: THREE.BackSide
      })
    );
    
    this.scene.add(sky);
  }
  
  update(deltaTime) {
    // Update any world elements that need time-based updates
  }
  
  /**
   * Get the environment map for use with materials
   * @returns {THREE.CubeTexture} Environment map texture
   */
  getEnvironmentMap() {
    return this.environmentMap;
  }
} 
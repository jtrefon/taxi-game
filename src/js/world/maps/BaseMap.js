import * as THREE from '../../../libs/three.module.js';
import * as CANNON from '../../../libs/cannon-es.js';

/**
 * Base class for all game maps.
 * Uses the Template Method pattern to define the structure for all maps.
 */
export class BaseMap {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    
    // Common map properties
    this.blockSize = 50;
    this.roadWidth = 10;
    this.sidewalkWidth = 3;
    
    // Optimize materials with less complexity
    this.buildingMaterials = [
      new THREE.MeshLambertMaterial({ color: 0x8c8c8c }),  // Grey concrete
      new THREE.MeshLambertMaterial({ color: 0x4d6a96 }),  // Blue glass
      new THREE.MeshLambertMaterial({ color: 0xb87333 }),  // Copper/brown
      new THREE.MeshLambertMaterial({ color: 0xd9d9d9 })   // Light grey
    ];
    
    this.roadMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x333333
    });
    
    this.sidewalkMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x999999
    });
    
    this.parkMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x2e8b57
    });
  }
  
  // Template method - defines the algorithm for map generation
  generate() {
    this.createRoadNetwork();
    this.createBlocks();
    this.createLandmarks();
    this.createDecorations();
  }
  
  // Abstract methods to be implemented by subclasses
  createRoadNetwork() {
    throw new Error('createRoadNetwork must be implemented by subclass');
  }
  
  createBlocks() {
    throw new Error('createBlocks must be implemented by subclass');
  }
  
  createLandmarks() {
    // Optional hook - not all maps need landmarks
  }
  
  createDecorations() {
    // Optional hook - not all maps need extra decorations
  }
  
  // Common utility methods shared by all maps
  createBuilding(x, z, width, depth, height, materialIndex = null) {
    // Visual mesh
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    // Use specified material or random
    const material = materialIndex !== null 
      ? this.buildingMaterials[materialIndex]
      : this.buildingMaterials[Math.floor(Math.random() * this.buildingMaterials.length)];
    
    const building = new THREE.Mesh(geometry, material);
    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    this.scene.add(building);
    
    // Add windows for visual interest - only for small buildings
    if (height < 60) {
      this.addWindowsToBuilding(building, width, height, depth);
    }
    
    // Physics body
    const body = new CANNON.Body({
      mass: 0, // Static body
      position: new CANNON.Vec3(x, height / 2, z)
    });
    
    body.addShape(new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)));
    this.physicsWorld.addBody(body);
    
    return building;
  }
  
  addWindowsToBuilding(building, width, height, depth) {
    // Skip window creation for very large or distant buildings to improve performance
    if (height > 50) return;
    
    // Simple window pattern with much more aggressive optimization
    const windowSize = 1.5;
    const windowSpacing = 8.0; // Much larger spacing between windows
    const windowDepth = 0.1;
    
    const windowGeometry = new THREE.PlaneGeometry(windowSize, windowSize);
    const windowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xadd8e6,
      emissive: 0x333333
    });
    
    // Calculate windows per side with greatly reduced density
    const widthWindows = Math.min(Math.floor(width / windowSpacing) - 1, 3); // Max 3 windows in width
    const heightWindows = Math.min(Math.floor(height / windowSpacing) - 1, 5); // Max 5 windows in height
    
    // Only add windows if the building is big enough
    if (widthWindows <= 1 || heightWindows <= 1) return;
    
    // Add windows to front only, with extreme culling
    for (let y = 1; y < heightWindows; y += 2) { // Skip every other row
      for (let x = 1; x < widthWindows; x += 2) { // Skip every other column
        // Skip more windows randomly for variety and performance
        if (Math.random() < 0.7) continue; // 70% chance to skip
        
        const windowX = (x * windowSpacing) - (width / 2) + (windowSpacing / 2);
        const windowY = (y * windowSpacing) - (height / 2) + (windowSpacing / 2);
        
        // Front windows only
        const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow.position.set(windowX, windowY, depth / 2 + 0.1);
        building.add(frontWindow);
      }
    }
  }
  
  createRoad(x, z, length, width, isHorizontal) {
    // Road - Keep a single plane but apply texture instead of multiple geometries
    const roadGeometry = new THREE.PlaneGeometry(
      isHorizontal ? length : width,
      isHorizontal ? width : length
    );
    
    // Get road texture from texture factory
    const textureFactory = this.getTextureFactory();
    
    // Create material with texture
    const roadTexture = textureFactory.getEnvironmentTexture('road');
    const texturedRoadMaterial = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Set texture rotation and repeat based on orientation
    if (roadTexture) {
      roadTexture.rotation = isHorizontal ? 0 : Math.PI / 2;
      roadTexture.repeat.set(
        isHorizontal ? length / 30 : width / 30, 
        isHorizontal ? width / 30 : length / 30
      );
      roadTexture.needsUpdate = true;
    }
    
    const road = new THREE.Mesh(roadGeometry, texturedRoadMaterial);
    road.rotation.x = -Math.PI / 2; // Rotate to horizontal
    road.position.set(x, 0.05, z);
    road.receiveShadow = true;
    this.scene.add(road);
    
    // Add sidewalks with textures
    this.addSidewalks(x, z, length, width, isHorizontal);
  }
  
  addSidewalks(x, z, length, width, isHorizontal) {
    const sidewalkWidth = this.sidewalkWidth;
    const halfWidth = width / 2;
    const halfLength = length / 2;
    
    // Get texture factory and sidewalk texture
    const textureFactory = this.getTextureFactory();
    const sidewalkTexture = textureFactory.getEnvironmentTexture('sidewalk');
    
    const texturedSidewalkMaterial = new THREE.MeshStandardMaterial({
      map: sidewalkTexture,
      roughness: 0.8,
      metalness: 0.0
    });
    
    // Create sidewalk geometries as planes
    const sideGeometry = new THREE.PlaneGeometry(
      isHorizontal ? length : sidewalkWidth,
      isHorizontal ? sidewalkWidth : length
    );
    
    // Set texture repeat based on size
    if (sidewalkTexture) {
      const repeatX = isHorizontal ? length / 10 : sidewalkWidth / 10;
      const repeatY = isHorizontal ? sidewalkWidth / 10 : length / 10;
      sidewalkTexture.repeat.set(repeatX, repeatY);
      sidewalkTexture.needsUpdate = true;
    }
    
    // Position offsets
    const sideOffset = halfWidth + (sidewalkWidth / 2);
    
    // Upper sidewalk
    const upperSidewalk = new THREE.Mesh(sideGeometry, texturedSidewalkMaterial);
    upperSidewalk.rotation.x = -Math.PI / 2; // Rotate to horizontal
    upperSidewalk.position.set(
      isHorizontal ? x : x - sideOffset + sidewalkWidth / 2,
      0.1,
      isHorizontal ? z - sideOffset + sidewalkWidth / 2 : z
    );
    upperSidewalk.receiveShadow = true;
    this.scene.add(upperSidewalk);
    
    // Lower sidewalk
    const lowerSidewalk = new THREE.Mesh(sideGeometry, texturedSidewalkMaterial);
    lowerSidewalk.rotation.x = -Math.PI / 2; // Rotate to horizontal
    lowerSidewalk.position.set(
      isHorizontal ? x : x + sideOffset - sidewalkWidth / 2,
      0.1,
      isHorizontal ? z + sideOffset - sidewalkWidth / 2 : z
    );
    lowerSidewalk.receiveShadow = true;
    this.scene.add(lowerSidewalk);
  }
  
  createPark(x, z, width, height) {
    // Create park ground with textured grass
    const parkGeometry = new THREE.PlaneGeometry(width, height);
    
    // Get grass texture from texture factory
    const textureFactory = this.getTextureFactory();
    const grassTexture = textureFactory.getEnvironmentTexture('grass');
    
    const texturedParkMaterial = new THREE.MeshStandardMaterial({
      map: grassTexture,
      roughness: 1.0,
      metalness: 0.0
    });
    
    // Set texture repeat based on park size
    if (grassTexture) {
      grassTexture.repeat.set(width / 20, height / 20);
      grassTexture.needsUpdate = true;
    }
    
    const park = new THREE.Mesh(parkGeometry, texturedParkMaterial);
    park.rotation.x = -Math.PI / 2; // Rotate to horizontal
    park.position.set(x, 0.15, z);
    park.receiveShadow = true;
    this.scene.add(park);
    
    // Add trees with billboard/sprite approach
    this.addTexturedTrees(x, z, width, height);
  }
  
  /**
   * Add trees using textured billboards instead of geometries
   */
  addTexturedTrees(x, z, width, height) {
    const treeSpacing = 15;
    const parkInnerMargin = 5;
    
    // Calculate available area
    const availableWidth = width - 2 * parkInnerMargin;
    const availableHeight = height - 2 * parkInnerMargin;
    
    // Calculate grid size
    const gridX = Math.floor(availableWidth / treeSpacing);
    const gridZ = Math.floor(availableHeight / treeSpacing);
    
    // Get tree textures
    const textureFactory = this.getTextureFactory();
    
    // Place trees on a grid with some randomness
    for (let i = 0; i < gridX; i++) {
      for (let j = 0; j < gridZ; j++) {
        // 60% chance to skip a tree for variety and performance
        if (Math.random() < 0.6) continue;
        
        const baseX = x - width/2 + parkInnerMargin + i * treeSpacing + treeSpacing/2;
        const baseZ = z - height/2 + parkInnerMargin + j * treeSpacing + treeSpacing/2;
        
        // Add slight random offset
        const offsetX = (Math.random() - 0.5) * (treeSpacing * 0.5);
        const offsetZ = (Math.random() - 0.5) * (treeSpacing * 0.5);
        
        this.createTreeBillboard(baseX + offsetX, baseZ + offsetZ);
      }
    }
    
    // Add benches using traditional geometry to maintain collisions
    this.addParkBenches(x, z, width, height);
  }
  
  /**
   * Create a tree using a billboard/sprite approach
   */
  createTreeBillboard(x, z) {
    const textureFactory = this.getTextureFactory();
    
    // Randomly select tree type (pine, oak, birch, tropical)
    const treeTypes = ['pine', 'oak', 'birch', 'tropical'];
    const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
    
    const treeTexture = textureFactory.getEnvironmentTexture('tree', treeType);
    
    if (!treeTexture) {
      console.warn('No tree texture found for type:', treeType);
      return;
    }
    
    // Billboard size based on tree type
    let treeHeight, treeWidth;
    
    switch (treeType) {
      case 'pine':
        treeHeight = 10 + Math.random() * 5;
        treeWidth = 6 + Math.random() * 2;
        break;
      case 'oak':
        treeHeight = 8 + Math.random() * 4;
        treeWidth = 7 + Math.random() * 3;
        break;
      case 'birch':
        treeHeight = 9 + Math.random() * 4;
        treeWidth = 5 + Math.random() * 2;
        break;
      case 'tropical':
        treeHeight = 7 + Math.random() * 3;
        treeWidth = 8 + Math.random() * 2;
        break;
      default:
        treeHeight = 8;
        treeWidth = 6;
    }
    
    // Create a plane for the billboard
    const billboardGeometry = new THREE.PlaneGeometry(treeWidth, treeHeight);
    const billboardMaterial = new THREE.MeshBasicMaterial({
      map: treeTexture,
      transparent: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide
    });
    
    const billboard = new THREE.Mesh(billboardGeometry, billboardMaterial);
    billboard.position.set(x, treeHeight / 2, z);
    
    // Add to scene
    this.scene.add(billboard);
    
    // Physics body (just a simple cylinder for collision)
    const radius = 0.5;
    const physicsHeight = 2;
    
    const body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(x, physicsHeight / 2, z)
    });
    
    const shape = new CANNON.Cylinder(radius, radius, physicsHeight, 8);
    body.addShape(shape);
    this.physicsWorld.addBody(body);
    
    return billboard;
  }
  
  /**
   * Add benches around the park
   */
  addParkBenches(x, z, width, height) {
    const benchCount = Math.floor(Math.min(width, height) / 15);
    
    for (let i = 0; i < benchCount; i++) {
      // Randomly choose one of the four sides
      const side = Math.floor(Math.random() * 4);
      let benchX, benchZ;
      let orientation = 0;
      
      switch (side) {
        case 0: // Top edge
          benchX = x + (Math.random() - 0.5) * (width - 4);
          benchZ = z - height/2 + 2;
          orientation = 0;
          break;
        case 1: // Right edge
          benchX = x + width/2 - 2;
          benchZ = z + (Math.random() - 0.5) * (height - 4);
          orientation = Math.PI / 2;
          break;
        case 2: // Bottom edge
          benchX = x + (Math.random() - 0.5) * (width - 4);
          benchZ = z + height/2 - 2;
          orientation = Math.PI;
          break;
        case 3: // Left edge
          benchX = x - width/2 + 2;
          benchZ = z + (Math.random() - 0.5) * (height - 4);
          orientation = Math.PI * 3 / 2;
          break;
      }
      
      this.createBench(benchX, benchZ, orientation);
    }
  }
  
  /**
   * Get the texture factory instance
   * If not available, create a minimal local one
   */
  getTextureFactory() {
    // First check if there's a cityGenerator available with a texture service
    if (this.cityGenerator && this.cityGenerator.textureService) {
      return this.cityGenerator.textureService.textureFactory;
    }
    
    // Otherwise, check if we already created our own instance
    if (!this._textureFactory) {
      try {
        // Dynamically import it
        const TextureFactory = THREE.Loader.TextureFactory || (window.TextureFactory);
        
        if (TextureFactory) {
          this._textureFactory = new TextureFactory();
          this._textureFactory.initTextures();
        } else {
          // Fallback if TextureFactory is not available
          console.warn('TextureFactory not available, using fallback textures');
          this._textureFactory = this.createFallbackTextureFactory();
        }
      } catch (e) {
        console.error('Error creating texture factory', e);
        this._textureFactory = this.createFallbackTextureFactory();
      }
    }
    
    return this._textureFactory;
  }
  
  /**
   * Create a minimal fallback texture factory if the real one is not available
   */
  createFallbackTextureFactory() {
    return {
      textureCache: new Map(),
      
      getEnvironmentTexture(type) {
        // Return a cached texture if we have one
        if (this.textureCache.has(type)) {
          return this.textureCache.get(type);
        }
        
        // Otherwise create a simple procedural texture
        const texture = this.createSimpleTexture(type);
        if (texture) {
          this.textureCache.set(type, texture);
        }
        return texture;
      },
      
      createSimpleTexture(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        switch (type) {
          case 'road':
            ctx.fillStyle = '#333333';
            ctx.fillRect(0, 0, 256, 256);
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(128, 0, 4, 256); // Center line
            break;
            
          case 'sidewalk':
            ctx.fillStyle = '#999999';
            ctx.fillRect(0, 0, 256, 256);
            // Add simple grid
            ctx.strokeStyle = '#777777';
            for (let i = 0; i < 256; i += 32) {
              ctx.beginPath();
              ctx.moveTo(0, i);
              ctx.lineTo(256, i);
              ctx.stroke();
              ctx.beginPath();
              ctx.moveTo(i, 0);
              ctx.lineTo(i, 256);
              ctx.stroke();
            }
            break;
            
          case 'grass':
            ctx.fillStyle = '#2E7D32';
            ctx.fillRect(0, 0, 256, 256);
            // Add noise
            for (let i = 0; i < 1000; i++) {
              const x = Math.random() * 256;
              const y = Math.random() * 256;
              const size = 1 + Math.random() * 2;
              ctx.fillStyle = Math.random() < 0.5 ? '#388E3C' : '#1B5E20';
              ctx.fillRect(x, y, size, size);
            }
            break;
            
          case 'tree':
            // Simple tree silhouette
            ctx.clearRect(0, 0, 256, 256);
            // Trunk
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(118, 128, 20, 128);
            // Foliage
            ctx.fillStyle = '#2E7D32';
            ctx.beginPath();
            ctx.arc(128, 96, 64, 0, Math.PI * 2);
            ctx.fill();
            break;
            
          default:
            return null;
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
      }
    };
  }
  
  createTree(x, z) {
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, 2, z);
    trunk.castShadow = true;
    this.scene.add(trunk);
    
    // Tree foliage
    const foliageGeometry = new THREE.ConeGeometry(3, 6, 6);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2E8B57 });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.set(x, 6, z);
    foliage.castShadow = true;
    this.scene.add(foliage);
    
    // Add simple physics for the tree
    const trunkShape = new CANNON.Cylinder(0.5, 0.7, 4, 6);
    const trunkBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(x, 2, z)
    });
    trunkBody.addShape(trunkShape);
    this.physicsWorld.addBody(trunkBody);
  }
  
  createBench(x, z, orientation = 0) {
    // Bench base
    const baseGeometry = new THREE.BoxGeometry(2, 0.4, 0.8);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(x, 0.5, z);
    base.castShadow = true;
    
    // Bench back
    const backGeometry = new THREE.BoxGeometry(2, 0.8, 0.2);
    const back = new THREE.Mesh(backGeometry, baseMaterial);
    back.position.set(0, 0.6, -0.3);
    back.castShadow = true;
    
    // Create a group for the bench to easily orient it
    const benchGroup = new THREE.Group();
    benchGroup.add(base);
    benchGroup.add(back);
    
    // Rotate based on orientation (0-3 for the four sides)
    benchGroup.rotation.y = orientation * (Math.PI / 2);
    benchGroup.position.set(x, 0.5, z);
    
    this.scene.add(benchGroup);
    
    // Add simple physics for the bench
    const benchShape = new CANNON.Box(new CANNON.Vec3(1, 0.4, 0.4));
    const benchBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(x, 0.5, z)
    });
    benchBody.addShape(benchShape);
    this.physicsWorld.addBody(benchBody);
  }
} 
import * as THREE from './node_modules/three/build/three.module.js';
import * as CANNON from './node_modules/cannon-es/dist/cannon-es.js';

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
    // Road
    const roadGeometry = new THREE.BoxGeometry(
      isHorizontal ? length : width,
      0.1,
      isHorizontal ? width : length
    );
    
    const road = new THREE.Mesh(roadGeometry, this.roadMaterial);
    road.position.set(x, 0.05, z);
    road.receiveShadow = true;
    this.scene.add(road);
    
    // Add road markings
    this.addRoadMarkings(x, z, length, width, isHorizontal);
    
    // Add sidewalks
    this.addSidewalks(x, z, length, width, isHorizontal);
  }
  
  addRoadMarkings(x, z, length, width, isHorizontal) {
    // Center line only - skip other markings
    const lineWidth = 0.3;
    const lineGeometry = new THREE.BoxGeometry(
      isHorizontal ? length : lineWidth,
      0.11,
      isHorizontal ? lineWidth : length
    );
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(x, 0.11, z);
    this.scene.add(line);
    
    // Skip side lane markings to reduce draw calls
  }
  
  addSidewalks(x, z, length, width, isHorizontal) {
    const sidewalkWidth = this.sidewalkWidth;
    const halfWidth = width / 2;
    const halfLength = length / 2;
    
    // Create sidewalk geometries
    const sideGeometry = new THREE.BoxGeometry(
      isHorizontal ? length : sidewalkWidth,
      0.2,
      isHorizontal ? sidewalkWidth : length
    );
    
    // Position offsets
    const sideOffset = halfWidth + (sidewalkWidth / 2);
    
    // Upper sidewalk
    const upperSidewalk = new THREE.Mesh(sideGeometry, this.sidewalkMaterial);
    upperSidewalk.position.set(
      isHorizontal ? x : x - sideOffset + sidewalkWidth / 2,
      0.1,
      isHorizontal ? z - sideOffset + sidewalkWidth / 2 : z
    );
    upperSidewalk.receiveShadow = true;
    this.scene.add(upperSidewalk);
    
    // Lower sidewalk
    const lowerSidewalk = new THREE.Mesh(sideGeometry, this.sidewalkMaterial);
    lowerSidewalk.position.set(
      isHorizontal ? x : x + sideOffset - sidewalkWidth / 2,
      0.1,
      isHorizontal ? z + sideOffset - sidewalkWidth / 2 : z
    );
    lowerSidewalk.receiveShadow = true;
    this.scene.add(lowerSidewalk);
  }
  
  createPark(x, z, width, height) {
    // Create park ground
    const parkGeometry = new THREE.BoxGeometry(width, 0.3, height);
    const park = new THREE.Mesh(parkGeometry, this.parkMaterial);
    park.position.set(x, 0.15, z);
    park.receiveShadow = true;
    this.scene.add(park);
    
    // Add trees with more reasonable spacing
    const treeSpacing = 10; // Minimum distance between trees
    const parkInnerMargin = 5; // Keep trees away from park edges
    
    // Calculate available area for trees
    const availableWidth = width - 2 * parkInnerMargin;
    const availableHeight = height - 2 * parkInnerMargin;
    
    // Calculate grid size
    const gridX = Math.floor(availableWidth / treeSpacing);
    const gridZ = Math.floor(availableHeight / treeSpacing);
    
    // Place trees on a grid with some randomness
    for (let i = 0; i < gridX; i++) {
      for (let j = 0; j < gridZ; j++) {
        // 40% chance to skip a tree for variety
        if (Math.random() < 0.4) continue;
        
        const baseX = x - width/2 + parkInnerMargin + i * treeSpacing + treeSpacing/2;
        const baseZ = z - height/2 + parkInnerMargin + j * treeSpacing + treeSpacing/2;
        
        // Add slight random offset
        const offsetX = (Math.random() - 0.5) * (treeSpacing * 0.5);
        const offsetZ = (Math.random() - 0.5) * (treeSpacing * 0.5);
        
        this.createTree(baseX + offsetX, baseZ + offsetZ);
      }
    }
    
    // Add park benches along the edges
    const benchCount = Math.floor(Math.min(width, height) / 15); // Scale bench count with park size
    
    // Place benches along the perimeter
    for (let i = 0; i < benchCount; i++) {
      // Randomly choose one of the four sides
      const side = Math.floor(Math.random() * 4);
      
      let benchX, benchZ;
      const edgeOffset = 3; // Distance from the edge
      
      switch (side) {
        case 0: // Top
          benchX = x - width/2 + parkInnerMargin + Math.random() * (width - 2 * parkInnerMargin);
          benchZ = z - height/2 + edgeOffset;
          break;
        case 1: // Right
          benchX = x + width/2 - edgeOffset;
          benchZ = z - height/2 + parkInnerMargin + Math.random() * (height - 2 * parkInnerMargin);
          break;
        case 2: // Bottom
          benchX = x - width/2 + parkInnerMargin + Math.random() * (width - 2 * parkInnerMargin);
          benchZ = z + height/2 - edgeOffset;
          break;
        case 3: // Left
          benchX = x - width/2 + edgeOffset;
          benchZ = z - height/2 + parkInnerMargin + Math.random() * (height - 2 * parkInnerMargin);
          break;
      }
      
      this.createBench(benchX, benchZ, side);
    }
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
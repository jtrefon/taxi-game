import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Factory pattern implementation for generating city elements
 */
export class CityGenerator {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    
    this.blockSize = 50;
    this.roadWidth = 10;
    this.sidewalkWidth = 3;
    
    // Materials
    this.buildingMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x8c8c8c, roughness: 0.5 }),  // Grey concrete
      new THREE.MeshStandardMaterial({ color: 0x4d6a96, roughness: 0.2 }),  // Blue glass
      new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.6 }),  // Copper/brown
      new THREE.MeshStandardMaterial({ color: 0xd9d9d9, roughness: 0.4 })   // Light grey
    ];
    
    this.roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333, 
      roughness: 0.9,
      metalness: 0.1
    });
    
    this.sidewalkMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x999999, 
      roughness: 0.8 
    });
    
    this.parkMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2e8b57, 
      roughness: 1.0 
    });
  }
  
  generateCity(width, height) {
    // Generate a grid of blocks
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        const blockX = (x - width / 2) * (this.blockSize + this.roadWidth);
        const blockZ = (z - height / 2) * (this.blockSize + this.roadWidth);
        
        // Increase park chance from 20% to 40%
        if (Math.random() < 0.4) {
          this.createPark(blockX, blockZ);
        } else {
          this.createCityBlock(blockX, blockZ);
        }
      }
    }
    
    // Create the road network
    this.createRoadNetwork(width, height);
  }
  
  createCityBlock(x, z) {
    const blockSize = this.blockSize;
    // Determine building layout strategy (e.g., perimeter, grid)
    const layoutStrategy = Math.random() < 0.6 ? 'perimeter' : 'dense'; // 60% perimeter
    
    if (layoutStrategy === 'perimeter') {
        const buildingsPerSide = Math.floor(Math.random() * 2) + 2; // 2-3 buildings per side
        const buildingSpacing = (blockSize / buildingsPerSide) * 0.8; // Space between buildings
        const buildingDepth = Math.random() * (blockSize / 3) + (blockSize / 4); // Depth: 1/4 to 7/12 of block size
        const buildingOffsetFromEdge = buildingDepth / 2 + this.sidewalkWidth + 2; // Position away from road

        // Place buildings along the 4 sides
        for (let side = 0; side < 4; side++) {
            for (let i = 0; i < buildingsPerSide; i++) {
                const buildingWidth = buildingSpacing * (0.6 + Math.random() * 0.3); // Width variation
                let buildingX = x, buildingZ = z;
                const sidePos = (i - (buildingsPerSide - 1) / 2) * buildingSpacing;

                if (side === 0) { // North edge
                    buildingX = x + sidePos;
                    buildingZ = z - (blockSize / 2) + buildingOffsetFromEdge;
                } else if (side === 1) { // East edge
                    buildingX = x + (blockSize / 2) - buildingOffsetFromEdge;
                    buildingZ = z + sidePos;
                } else if (side === 2) { // South edge
                    buildingX = x + sidePos;
                    buildingZ = z + (blockSize / 2) - buildingOffsetFromEdge;
                } else { // West edge
                    buildingX = x - (blockSize / 2) + buildingOffsetFromEdge;
                    buildingZ = z + sidePos;
                }
                
                // Ensure width/depth are appropriate for orientation
                let actualWidth = (side === 0 || side === 2) ? buildingWidth : buildingDepth;
                let actualDepth = (side === 0 || side === 2) ? buildingDepth : buildingWidth;

                const isTallBuilding = Math.random() < 0.3;
                const height = isTallBuilding ? 
                    Math.random() * 80 + 40 : 
                    Math.random() * 20 + 10;
                
                this.createBuilding(buildingX, buildingZ, actualWidth, actualDepth, height);
            }
        }
    } else { // 'dense' layout (original random placement)
        const buildingsPerBlock = Math.floor(Math.random() * 4) + 3; // 3-6 buildings
        for (let i = 0; i < buildingsPerBlock; i++) {
            const buildingWidth = Math.random() * 15 + 10; // 10-25
            const buildingDepth = Math.random() * 15 + 10; // 10-25
            
            const maxOffsetX = (blockSize - buildingWidth) / 2 - this.sidewalkWidth; // Keep away from sidewalk
            const maxOffsetZ = (blockSize - buildingDepth) / 2 - this.sidewalkWidth;
            
            const offsetX = (Math.random() * 2 - 1) * maxOffsetX;
            const offsetZ = (Math.random() * 2 - 1) * maxOffsetZ;
            
            const buildingX = x + offsetX;
            const buildingZ = z + offsetZ;
            
            const isTallBuilding = Math.random() < 0.3;
            const height = isTallBuilding ? 
                Math.random() * 80 + 40 : 
                Math.random() * 20 + 10;
                
            this.createBuilding(buildingX, buildingZ, buildingWidth, buildingDepth, height);
        }
    }
  }
  
  createBuilding(x, z, width, depth, height) {
    // Visual mesh
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const materialIndex = Math.floor(Math.random() * this.buildingMaterials.length);
    const material = this.buildingMaterials[materialIndex];
    
    const building = new THREE.Mesh(geometry, material);
    building.position.set(x, height / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    this.scene.add(building);
    
    // Add windows for visual interest
    this.addWindowsToBuilding(building, width, height, depth);
    
    // Physics body
    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
    const body = new CANNON.Body({
      mass: 0, // Static body
      position: new CANNON.Vec3(x, height / 2, z)
    });
    
    body.addShape(shape);
    this.physicsWorld.addBody(body);
  }
  
  addWindowsToBuilding(building, width, height, depth) {
    // Simple window pattern - can be enhanced for more detailed buildings
    const windowSize = 1.2;
    const windowSpacing = 2.5;
    const windowDepth = 0.1;
    
    const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, windowDepth);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xadd8e6, 
      roughness: 0.2, 
      metalness: 0.8,
      emissive: 0x333333
    });
    
    // Calculate windows per side
    const widthWindows = Math.floor(width / windowSpacing) - 1;
    const heightWindows = Math.floor(height / windowSpacing) - 1;
    
    // Only add windows if the building is big enough
    if (widthWindows <= 1 || heightWindows <= 1) return;
    
    // Add windows to front and back
    for (let y = 1; y < heightWindows; y++) {
      for (let x = 1; x < widthWindows; x++) {
        // Skip some windows randomly for variety
        if (Math.random() < 0.3) continue;
        
        const windowX = (x * windowSpacing) - (width / 2) + (windowSpacing / 2);
        const windowY = (y * windowSpacing) - (height / 2) + (windowSpacing / 2);
        
        // Front windows
        const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow.position.set(windowX, windowY, depth / 2 + 0.1);
        building.add(frontWindow);
        
        // Back windows
        const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        backWindow.position.set(windowX, windowY, -depth / 2 - 0.1);
        building.add(backWindow);
      }
    }
    
    // Calculate windows for sides
    const depthWindows = Math.floor(depth / windowSpacing) - 1;
    
    // Add windows to sides
    for (let y = 1; y < heightWindows; y++) {
      for (let z = 1; z < depthWindows; z++) {
        // Skip some windows randomly
        if (Math.random() < 0.3) continue;
        
        const windowZ = (z * windowSpacing) - (depth / 2) + (windowSpacing / 2);
        const windowY = (y * windowSpacing) - (height / 2) + (windowSpacing / 2);
        
        // Left windows
        const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        leftWindow.position.set(-width / 2 - 0.1, windowY, windowZ);
        leftWindow.rotation.y = Math.PI / 2;
        building.add(leftWindow);
        
        // Right windows
        const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        rightWindow.position.set(width / 2 + 0.1, windowY, windowZ);
        rightWindow.rotation.y = Math.PI / 2;
        building.add(rightWindow);
      }
    }
  }
  
  createPark(x, z) {
    // Create park ground
    const parkSize = this.blockSize;
    const parkGeometry = new THREE.BoxGeometry(parkSize, 0.3, parkSize);
    const park = new THREE.Mesh(parkGeometry, this.parkMaterial);
    park.position.set(x, 0.15, z);
    park.receiveShadow = true;
    this.scene.add(park);
    
    // Add trees and other park elements
    const treeCount = Math.floor(Math.random() * 8) + 8; // 8-16 trees
    const parkInnerMargin = 5; // Keep trees away from park edges
    const maxTreeOffset = (parkSize / 2) - parkInnerMargin; // Max distance from center
    
    for (let i = 0; i < treeCount; i++) {
      // Ensure trees are placed well within the park boundaries
      const treeX = x + (Math.random() * 2 - 1) * maxTreeOffset;
      const treeZ = z + (Math.random() * 2 - 1) * maxTreeOffset;
      this.createTree(treeX, treeZ);
    }
    
    // Add park benches
    const benchCount = Math.floor(Math.random() * 3) + 2; // 2-4 benches
    const maxBenchOffset = (parkSize / 2) - 3; // Keep benches away from edges too
    for (let i = 0; i < benchCount; i++) {
      const benchX = x + (Math.random() * 2 - 1) * maxBenchOffset;
      const benchZ = z + (Math.random() * 2 - 1) * maxBenchOffset;
      this.createBench(benchX, benchZ);
    }
  }
  
  createTree(x, z) {
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, 2, z);
    trunk.castShadow = true;
    this.scene.add(trunk);
    
    // Tree foliage
    const foliageGeometry = new THREE.ConeGeometry(3, 6, 8);
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2E8B57 });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.set(x, 6, z);
    foliage.castShadow = true;
    this.scene.add(foliage);
    
    // Add simple physics for the tree
    const trunkShape = new CANNON.Cylinder(0.5, 0.7, 4, 8);
    const trunkBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(x, 2, z)
    });
    trunkBody.addShape(trunkShape);
    this.physicsWorld.addBody(trunkBody);
  }
  
  createRoadNetwork(width, height) {
    const blockSize = this.blockSize;
    const roadWidth = this.roadWidth;
    const totalWidth = width * (blockSize + roadWidth) + roadWidth;
    const totalHeight = height * (blockSize + roadWidth) + roadWidth;
    
    // Create horizontal roads
    for (let i = 0; i <= height; i++) {
      const z = (i - height / 2) * (blockSize + roadWidth) - roadWidth / 2;
      this.createRoad(0, z, totalWidth, roadWidth, true);
    }
    
    // Create vertical roads
    for (let i = 0; i <= width; i++) {
      const x = (i - width / 2) * (blockSize + roadWidth) - roadWidth / 2;
      this.createRoad(x, 0, totalHeight, roadWidth, false);
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
    // Center line
    const lineWidth = 0.3;
    const lineGeometry = new THREE.BoxGeometry(
      isHorizontal ? length : lineWidth,
      0.11,
      isHorizontal ? lineWidth : length
    );
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(x, 0.11, z);
    this.scene.add(line);
    
    // Add dashed lines on sides for lane separation if road is wide enough
    if (width > 8) {
      const dashLength = 3;
      const dashGap = 2;
      const dashesCount = Math.floor(length / (dashLength + dashGap));
      const laneOffset = width / 4;
      
      for (let i = 0; i < dashesCount; i++) {
        const dashOffset = (i * (dashLength + dashGap)) - (length / 2) + (dashLength / 2);
        
        const dashGeometry = new THREE.BoxGeometry(
          isHorizontal ? dashLength : lineWidth,
          0.11,
          isHorizontal ? lineWidth : dashLength
        );
        
        // Left lane dash
        const leftDash = new THREE.Mesh(dashGeometry, lineMaterial);
        leftDash.position.set(
          isHorizontal ? x + dashOffset : x - laneOffset,
          0.11,
          isHorizontal ? z - laneOffset : z + dashOffset
        );
        this.scene.add(leftDash);
        
        // Right lane dash
        const rightDash = new THREE.Mesh(dashGeometry, lineMaterial);
        rightDash.position.set(
          isHorizontal ? x + dashOffset : x + laneOffset,
          0.11,
          isHorizontal ? z + laneOffset : z + dashOffset
        );
        this.scene.add(rightDash);
      }
    }
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
  
  // New method to create park benches
  createBench(x, z) {
    // Bench base
    const baseGeometry = new THREE.BoxGeometry(2, 0.4, 0.8);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(x, 0.5, z);
    base.castShadow = true;
    this.scene.add(base);
    
    // Bench back
    const backGeometry = new THREE.BoxGeometry(2, 0.8, 0.2);
    const back = new THREE.Mesh(backGeometry, baseMaterial);
    back.position.set(x, 1.1, z - 0.3);
    back.castShadow = true;
    this.scene.add(back);
    
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
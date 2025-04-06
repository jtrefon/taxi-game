import * as THREE from '../../libs/three.module.js';
import * as CANNON from '../../libs/cannon-es.js';
import { BuildingTextureService } from '../utils/BuildingTextureService.js';

/**
 * Factory pattern implementation for generating city elements
 */
export class CityGenerator {
  /**
   * Create a new city generator
   * @param {THREE.Scene} scene - The Three.js scene
   * @param {CANNON.World} physicsWorld - The Cannon.js physics world
   * @param {Object} [options] - Options for city generation
   * @param {THREE.CubeTexture} [options.environmentMap] - Environment map for reflective building materials
   */
  constructor(scene, physicsWorld, options = {}) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    
    this.blockSize = 50;
    this.roadWidth = 10;
    this.sidewalkWidth = 3;
    
    // Initialize texture service
    this.textureService = new BuildingTextureService();
    
    // Initialize with environment map if provided
    const envMap = options.environmentMap || null;
    this.textureService.init(10, 512, envMap); // 10 textures at 512x512 resolution
    
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

    // Carpark material (added)
    this.carparkMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666, // Darker grey than sidewalk
      roughness: 0.9
    });
  }
  
  generateCity(width, height) {
    // Generate a grid of blocks
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < height; z++) {
        const blockX = (x - width / 2) * (this.blockSize + this.roadWidth);
        const blockZ = (z - height / 2) * (this.blockSize + this.roadWidth);
        
        // Determine block type: 10% hospital, 30% park, 60% regular block
        const rand = Math.random();
        if (rand < 0.1) { 
          this.createHospitalBlock(blockX, blockZ);
        } else if (rand < 0.4) { 
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
    
    // Apply texture based on building characteristics
    let buildingType = 'office'; // Default type
    
    // Determine building type based on height and randomness
    if (height > 40) {
      // Tall buildings are more likely to be glass or office buildings
      buildingType = Math.random() < 0.7 ? 'glass' : 'office';
    } else if (height > 25) {
      // Medium buildings could be any type
      const rand = Math.random();
      buildingType = rand < 0.4 ? 'office' : (rand < 0.7 ? 'glass' : 'residential');
    } else {
      // Shorter buildings are most likely residential
      buildingType = Math.random() < 0.8 ? 'residential' : 'office';
    }
    
    // Apply facade texture using the texture service
    this.textureService.applyTexture(building, {
      type: buildingType,
      height: height,
      positionKey: `${x.toFixed(1)}_${z.toFixed(1)}`
    });
    
    this.scene.add(building);
    
    // We no longer need to add windows as they're now part of the texture
    
    // Physics body
    const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
    const body = new CANNON.Body({
      mass: 0, // Static body
      position: new CANNON.Vec3(x, height / 2, z)
    });
    
    body.addShape(shape);
    this.physicsWorld.addBody(body);
    
    return building;
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

  // New method to create hospital blocks
  createHospitalBlock(blockX, blockZ) {
    const baseWidth = this.blockSize;
    const baseDepth = this.blockSize;
    const baseHeight = 0.5; // Slightly raised base

    // 1. Create the base for the hospital complex
    const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    const base = new THREE.Mesh(baseGeometry, this.carparkMaterial); // Use carpark material for the base
    base.position.set(blockX, baseHeight / 2, blockZ);
    base.receiveShadow = true;
    this.scene.add(base);

    // Add physics for the base
    const baseShape = new CANNON.Box(new CANNON.Vec3(baseWidth / 2, baseHeight / 2, baseDepth / 2));
    const baseBody = new CANNON.Body({
      mass: 0, // Static
      position: new CANNON.Vec3(blockX, baseHeight / 2, blockZ)
    });
    baseBody.addShape(baseShape);
    this.physicsWorld.addBody(baseBody);

    // 2. Define hospital dimensions (taller and wider)
    const hospWidth = baseWidth * 0.5; // 50% of block width (reduced from 60%)
    const hospDepth = baseDepth * 0.5; // 50% of block depth (reduced from 60%)
    const hospHeight = 150; // Significantly taller

    // 3. Create the main hospital building on the base
    // Create the building using the standard method but don't position it yet
    const hospitalBuilding = this.createBuilding(
        blockX, // Centered X
        blockZ, // Centered Z
        hospWidth,
        hospDepth,
        hospHeight
    );

    // 4. Apply hospital-specific texture
    this.textureService.applyTexture(hospitalBuilding, {
      type: 'hospital',
      height: hospHeight,
      positionKey: `hospital_${blockX.toFixed(1)}_${blockZ.toFixed(1)}`
    });

    // 5. Adjust hospital building position to sit on the base
    hospitalBuilding.position.y = baseHeight + hospHeight / 2;

    // Ensure the physics body is also correctly positioned
    // Find the physics body associated with the hospital building (assuming last added non-static body)
    const hospitalBody = this.physicsWorld.bodies.find(body => 
      body.mass === 0 && 
      body.position.x === blockX && 
      body.position.z === blockZ && 
      body !== baseBody
    );
    
    if (hospitalBody) {
        hospitalBody.position.y = baseHeight + hospHeight / 2;
    } else {
        console.warn("Could not find physics body for hospital building to adjust height.");
        // Re-create physics body if needed
        const shape = new CANNON.Box(new CANNON.Vec3(hospWidth / 2, hospHeight / 2, hospDepth / 2));
        const body = new CANNON.Body({
          mass: 0, // Static body
          position: new CANNON.Vec3(blockX, baseHeight + hospHeight / 2, blockZ)
        });
        body.addShape(shape);
        this.physicsWorld.addBody(body);
    }

    // 6. Add parking lines to the base, avoiding the hospital footprint
    this.addParkingLines(blockX, blockZ, baseWidth, baseDepth, baseHeight, hospWidth, hospDepth);
  }

  // New method to add parking lines
  addParkingLines(blockX, blockZ, baseWidth, baseDepth, baseHeight, avoidWidth, avoidDepth) {
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const lineWidth = 0.15;
    const lineThickness = 0.05; // How much the line sits above the base
    const lineY = baseHeight + lineThickness / 2; // Position slightly above base

    const spaceWidth = 5;
    const spaceLength = 7;
    const halfAvoidW = avoidWidth / 2;
    const halfAvoidD = avoidDepth / 2;
    const halfBaseW = baseWidth / 2;
    const halfBaseD = baseDepth / 2;
    
    // Add safety margin to ensure lines stay within block and away from edges
    const safetyMargin = 3; // 3 units margin from the edge of the block
    const effectiveHalfBaseW = halfBaseW - safetyMargin;
    const effectiveHalfBaseD = halfBaseD - safetyMargin;

    // Function to check if a point is within the hospital footprint
    const isInsideAvoidance = (px, pz) => {
      return px > blockX - halfAvoidW && px < blockX + halfAvoidW &&
             pz > blockZ - halfAvoidD && pz < blockZ + halfAvoidD;
    };

    // Draw lines parallel to Z-axis (Vertical lines)
    for (let x = -effectiveHalfBaseW + spaceWidth; x < effectiveHalfBaseW; x += spaceWidth) {
        const lineX = blockX + x;
        const startZ = blockZ - effectiveHalfBaseD;
        const endZ = blockZ + effectiveHalfBaseD;

        // Check segments against avoidance zone
        let currentStartZ = startZ;
        while(currentStartZ < endZ) {
            if (isInsideAvoidance(lineX, currentStartZ + spaceLength/2)) {
                 // Skip forward if the middle of the next potential line is inside
                 currentStartZ += spaceLength;
                 continue;
            }
             if (isInsideAvoidance(lineX, currentStartZ + (spaceLength/2) * 1.5)) { // Check slightly further
                 currentStartZ += spaceLength;
                 continue;
             }

             // Draw the line segment if it's reasonably outside
            const linePosZ = currentStartZ + spaceLength/2;
             if (linePosZ + spaceLength/2 <= endZ) { // Ensure line doesn't exceed boundary
                const lineGeometry = new THREE.BoxGeometry(lineWidth, lineThickness, spaceLength);
                const line = new THREE.Mesh(lineGeometry, lineMaterial);
                line.position.set(lineX, lineY, linePosZ);
                this.scene.add(line);
             }
             currentStartZ += spaceLength * 1.5; // Move to next potential spot with gap
        }
    }

    // Draw lines parallel to X-axis (Horizontal lines) - in a grid pattern for parking spots
    for (let z = -effectiveHalfBaseD + spaceWidth; z < effectiveHalfBaseD; z += spaceWidth * 1.5) {
        const lineZ = blockZ + z;
        
        // Only draw X lines in areas away from the hospital
        if (lineZ > blockZ - halfAvoidD && lineZ < blockZ + halfAvoidD) {
            continue; // Skip this Z-row if it intersects with the hospital
        }
        
        // Draw a line along the X axis for this row
        for (let x = -effectiveHalfBaseW + spaceWidth; x < effectiveHalfBaseW; x += spaceWidth * 3) {
            const lineX = blockX + x;
            
            // Create a perpendicular line to mark a parking spot
            const lineGeometry = new THREE.BoxGeometry(spaceWidth * 2, lineThickness, lineWidth);
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.position.set(lineX + spaceWidth, lineY, lineZ);
            this.scene.add(line);
        }
    }
  }
} 
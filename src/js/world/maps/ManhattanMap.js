import * as THREE from '../../../libs/three.module.js';
import * as CANNON from '../../../libs/cannon-es.js';
import { BaseMap } from './BaseMap.js';

/**
 * ManhattanMap class that implements a structured grid-based city layout
 * inspired by Manhattan's urban planning.
 * 
 * Uses the Strategy Pattern for building placement strategies.
 */
export class ManhattanMap extends BaseMap {
  constructor(scene, physicsWorld) {
    super(scene, physicsWorld);
    
    // Manhattan specific settings
    this.gridWidth = 7;  // Number of blocks in width direction
    this.gridHeight = 7; // Number of blocks in height direction
    
    // Central Park position (block coordinates)
    this.centralParkX = 0;
    this.centralParkY = 0;
    this.centralParkWidth = 2;
    this.centralParkHeight = 2;
    
    // Tall buildings district (financial district / midtown equivalent)
    this.tallBuildingsStartX = -3;
    this.tallBuildingsEndX = -1;
    this.tallBuildingsStartZ = -3;
    this.tallBuildingsEndZ = -1;
  }
  
  /**
   * Create the Manhattan-style grid road network
   */
  createRoadNetwork() {
    const blockSize = this.blockSize;
    const roadWidth = this.roadWidth;
    const totalWidth = this.gridWidth * (blockSize + roadWidth) + roadWidth;
    const totalHeight = this.gridHeight * (blockSize + roadWidth) + roadWidth;
    
    // Main avenues (north-south)
    for (let i = 0; i <= this.gridWidth; i++) {
      const x = (i - this.gridWidth / 2) * (blockSize + roadWidth) - roadWidth / 2;
      this.createRoad(x, 0, totalHeight, roadWidth, false);
    }
    
    // Main streets (east-west)
    for (let i = 0; i <= this.gridHeight; i++) {
      const z = (i - this.gridHeight / 2) * (blockSize + roadWidth) - roadWidth / 2;
      this.createRoad(0, z, totalWidth, roadWidth, true);
    }
    
    // Create special boulevard (like Broadway)
    this.createBroadway();
  }
  
  /**
   * Create a diagonal avenue similar to Broadway
   */
  createBroadway() {
    // Broadway-like diagonal avenue
    const totalLength = Math.sqrt(
      Math.pow(this.gridWidth * (this.blockSize + this.roadWidth), 2) +
      Math.pow(this.gridHeight * (this.blockSize + this.roadWidth), 2)
    );
    
    const startX = -this.gridWidth * (this.blockSize + this.roadWidth) / 2;
    const startZ = this.gridHeight * (this.blockSize + this.roadWidth) / 2;
    const endX = this.gridWidth * (this.blockSize + this.roadWidth) / 2;
    const endZ = -this.gridHeight * (this.blockSize + this.roadWidth) / 2;
    
    const roadGeometry = new THREE.PlaneGeometry(totalLength, this.roadWidth);
    const road = new THREE.Mesh(roadGeometry, this.roadMaterial);
    
    // Position at center and rotate
    road.position.set((startX + endX) / 2, 0.06, (startZ + endZ) / 2);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = -Math.atan2(endZ - startZ, endX - startX);
    
    road.receiveShadow = true;
    this.scene.add(road);
  }
  
  /**
   * Create the city blocks including buildings
   */
  createBlocks() {
    const blockSize = this.blockSize;
    const roadWidth = this.roadWidth;
    
    // Loop through grid cells
    for (let x = 0; x < this.gridWidth; x++) {
      for (let z = 0; z < this.gridHeight; z++) {
        const blockX = (x - this.gridWidth / 2 + 0.5) * (blockSize + roadWidth);
        const blockZ = (z - this.gridHeight / 2 + 0.5) * (blockSize + roadWidth);
        
        // Check if this block should be Central Park
        const isCentralPark = (
          x >= this.centralParkX && 
          x < this.centralParkX + this.centralParkWidth &&
          z >= this.centralParkY && 
          z < this.centralParkY + this.centralParkHeight
        );
        
        if (isCentralPark) {
          // Calculate the actual size of the combined park blocks
          const parkWidth = this.centralParkWidth * blockSize + (this.centralParkWidth - 1) * roadWidth;
          const parkHeight = this.centralParkHeight * blockSize + (this.centralParkHeight - 1) * roadWidth;
          
          // Calculate the center of the park
          const parkCenterX = blockX;
          const parkCenterZ = blockZ;
          
          if (x === this.centralParkX && z === this.centralParkY) {
            // Only create the park once, when we're at its top-left corner
            this.createPark(parkCenterX, parkCenterZ, parkWidth, parkHeight);
          }
        } else {
          // Check if this is in the tall buildings district
          const isTallDistrict = (
            x >= this.tallBuildingsStartX && 
            x <= this.tallBuildingsEndX &&
            z >= this.tallBuildingsStartZ && 
            z <= this.tallBuildingsEndZ
          );
          
          // Use different building generation strategies based on the district
          if (isTallDistrict) {
            this.createFinancialDistrictBlock(blockX, blockZ);
          } else {
            // Regular blocks with medium density
            this.createResidentialBlock(blockX, blockZ);
          }
        }
      }
    }
  }
  
  /**
   * Create a block in the financial district with tall skyscrapers
   */
  createFinancialDistrictBlock(x, z) {
    // Financial district has fewer, taller buildings
    // Limit to only one building per block for better performance
    const buildingCount = 1;
    const blockSize = this.blockSize;
    
    // Calculate maximum building size to prevent street overlap
    const maxBuildingWidth = blockSize * 0.8; // 80% of block size
    const maxBuildingDepth = blockSize * 0.8; // 80% of block size
    
    for (let i = 0; i < buildingCount; i++) {
      // Tall skyscrapers, but with reduced maximum height
      const height = 80 + Math.random() * 80; // 80-160 height (reduced from 200)
      
      // Size takes up more space but still keeps some margin from the street
      const width = Math.min(20 + Math.random() * 15, maxBuildingWidth);
      const depth = Math.min(20 + Math.random() * 15, maxBuildingDepth);
      
      // No offsets with single building
      const offsetX = 0;
      const offsetZ = 0;
      
      // Material index for glass buildings
      const materialIndex = 1; // Blue glass material
      
      // Create a building with simpler windows
      this.createBuilding(x + offsetX, z + offsetZ, width, depth, height, materialIndex);
    }
  }
  
  /**
   * Create a residential block with smaller, more densely packed buildings
   */
  createResidentialBlock(x, z) {
    // Residential areas have fewer buildings
    const blockSize = this.blockSize;
    
    // Use perimeter layout for residential blocks
    // This will position buildings around the edges of the block with space in the middle
    
    const buildingDepth = 10; // Standard depth for buildings facing the street (reduced for safety)
    const safeDistFromEdge = blockSize / 2 - buildingDepth / 2 - 5; // Add more margin to stay away from streets
    
    // Randomly select 1-2 sides to place buildings on (reduced from 2-4)
    const sides = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
    
    // Place buildings on the selected sides
    for (const side of sides) {
      // Only 1 building per side for simplicity
      const buildingsOnSide = 1;
      
      for (let i = 0; i < buildingsOnSide; i++) {
        // Medium sized buildings with reduced height
        const height = 15 + Math.random() * 15; // 15-30 height (reduced from 15-40)
        
        // Width varies based on how many buildings on this side, but with a safety margin
        const maxWidth = (blockSize * 0.7) / buildingsOnSide; // 70% of available block side
        const buildingWidth = Math.min(blockSize / (buildingsOnSide + 0.5) * 0.8, maxWidth);
        
        // Position along the side
        let posX = x;
        let posZ = z;
        let finalWidth = buildingWidth;
        let finalDepth = buildingDepth;
        
        // Calculate position based on side
        const offset = (i - (buildingsOnSide - 1) / 2) * (blockSize / buildingsOnSide);
        
        switch (side) {
          case 0: // North
            posX = x + offset;
            posZ = z - safeDistFromEdge;
            break;
          case 1: // East
            posX = x + safeDistFromEdge;
            posZ = z + offset;
            finalWidth = buildingDepth;
            finalDepth = buildingWidth;
            break;
          case 2: // South
            posX = x + offset;
            posZ = z + safeDistFromEdge;
            break;
          case 3: // West
            posX = x - safeDistFromEdge;
            posZ = z + offset;
            finalWidth = buildingDepth;
            finalDepth = buildingWidth;
            break;
        }
        
        // Randomly select a material for variety
        const materialIndex = Math.floor(Math.random() * this.buildingMaterials.length);
        
        // Create a building with safety checks
        if (Math.abs(posX) < (this.gridWidth * (this.blockSize + this.roadWidth) / 2) - this.roadWidth &&
            Math.abs(posZ) < (this.gridHeight * (this.blockSize + this.roadWidth) / 2) - this.roadWidth) {
          this.createBuilding(posX, posZ, finalWidth, finalDepth, height, materialIndex);
        }
      }
    }
  }
  
  /**
   * Create landmark buildings and features unique to Manhattan
   */
  createLandmarks() {
    // Create Empire State Building equivalent
    const empireStateX = (this.tallBuildingsStartX - this.gridWidth / 2 + 0.5) * (this.blockSize + this.roadWidth);
    const empireStateZ = (this.tallBuildingsStartZ - this.gridHeight / 2 + 0.5) * (this.blockSize + this.roadWidth);
    
    this.createEmpireStateBuilding(empireStateX, empireStateZ);
    
    // Create Flatiron Building equivalent at a suitable intersection
    const flatironX = (this.tallBuildingsEndX - this.gridWidth / 2 + 0.5) * (this.blockSize + this.roadWidth);
    const flatironZ = (this.tallBuildingsEndZ - this.gridHeight / 2 + 0.5) * (this.blockSize + this.roadWidth);
    
    this.createFlatironBuilding(flatironX + this.blockSize/2, flatironZ + this.blockSize/2);
  }
  
  /**
   * Create a simplified Empire State Building
   */
  createEmpireStateBuilding(x, z) {
    // Base section
    const baseWidth = 30;
    const baseDepth = 30;
    const baseHeight = 120;
    
    const baseBuilding = this.createBuilding(x, z, baseWidth, baseDepth, baseHeight, 0);
    
    // Mid section
    const midWidth = 20;
    const midDepth = 20;
    const midHeight = 40;
    const midY = baseHeight + midHeight / 2;
    
    const midGeometry = new THREE.BoxGeometry(midWidth, midHeight, midDepth);
    const midMaterial = this.buildingMaterials[0]; // Grey concrete
    const midSection = new THREE.Mesh(midGeometry, midMaterial);
    midSection.position.set(x, midY, z);
    midSection.castShadow = true;
    this.scene.add(midSection);
    
    // Add windows to mid section
    this.addWindowsToBuilding(midSection, midWidth, midHeight, midDepth);
    
    // Spire
    const spireRadius = 5;
    const spireHeight = 30;
    const spireY = baseHeight + midHeight + spireHeight / 2;
    
    const spireGeometry = new THREE.CylinderGeometry(0, spireRadius, spireHeight, 8);
    const spireMaterial = this.buildingMaterials[0]; // Grey concrete
    const spire = new THREE.Mesh(spireGeometry, spireMaterial);
    spire.position.set(x, spireY, z);
    spire.castShadow = true;
    this.scene.add(spire);
  }
  
  /**
   * Create a simplified Flatiron Building
   */
  createFlatironBuilding(x, z) {
    // Create a triangular prism for the Flatiron
    const flatironHeight = 50;
    const flatironLength = 35;
    
    // Create a custom geometry for triangular flatiron shape
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(flatironLength, 0);
    shape.lineTo(0, flatironLength);
    shape.lineTo(0, 0);
    
    const extrudeSettings = {
      depth: flatironHeight,
      bevelEnabled: false
    };
    
    const flatironGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const flatironMaterial = this.buildingMaterials[0]; // Grey concrete
    
    const flatiron = new THREE.Mesh(flatironGeometry, flatironMaterial);
    flatiron.position.set(x - flatironLength/2, 0, z - flatironLength/2);
    flatiron.rotation.x = -Math.PI / 2;
    flatiron.castShadow = true;
    this.scene.add(flatiron);
    
    // Add physics body (simplified as a box)
    const physicsSize = flatironLength * 0.7; // Approximate size for physics
    const body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(x, flatironHeight / 2, z)
    });
    
    body.addShape(new CANNON.Box(new CANNON.Vec3(physicsSize/2, flatironHeight/2, physicsSize/2)));
    this.physicsWorld.addBody(body);
  }
  
  /**
   * Add decorative elements to the map
   */
  createDecorations() {
    // Add street lamps along roads with fewer lights
    this.addStreetLamps();
    
    // Add traffic lights at major intersections with fewer lights
    this.addTrafficLights();
  }
  
  /**
   * Add street lamps along roads
   */
  addStreetLamps() {
    const blockSize = this.blockSize;
    const roadWidth = this.roadWidth;
    const sidewalkWidth = this.sidewalkWidth;
    // Increase lamp spacing to reduce total number
    const lampSpacing = 160; // Even larger spacing between lamps
    
    // Place lamps along horizontal streets - on the sidewalks
    for (let z = 0; z <= this.gridHeight; z += 2) { // Only every other street
      const streetZ = (z - this.gridHeight / 2) * (blockSize + roadWidth);
      for (let x = -this.gridWidth * (blockSize + roadWidth) / 2; x <= this.gridWidth * (blockSize + roadWidth) / 2; x += lampSpacing) {
        // Skip placing lamps in Central Park area
        const gridX = Math.floor((x + this.gridWidth * (blockSize + roadWidth) / 2) / (blockSize + roadWidth));
        const gridZ = z;
        
        const isInParkX = (
          gridX >= this.centralParkX && 
          gridX < this.centralParkX + this.centralParkWidth
        );
        const isInParkZ = (
          gridZ >= this.centralParkY && 
          gridZ < this.centralParkY + this.centralParkHeight
        );
        
        if (!(isInParkX && isInParkZ)) {
          // Place lamp on the north sidewalk
          this.createStreetLamp(x, streetZ - (roadWidth/2 + sidewalkWidth/2));
        }
      }
    }
    
    // Place lamps along vertical streets - on the sidewalks
    for (let x = 0; x <= this.gridWidth; x += 2) { // Only every other street
      const streetX = (x - this.gridWidth / 2) * (blockSize + roadWidth);
      for (let z = -this.gridHeight * (blockSize + roadWidth) / 2; z <= this.gridHeight * (blockSize + roadWidth) / 2; z += lampSpacing) {
        // Skip placing lamps in Central Park area
        const gridX = x;
        const gridZ = Math.floor((z + this.gridHeight * (blockSize + roadWidth) / 2) / (blockSize + roadWidth));
        
        const isInParkX = (
          gridX >= this.centralParkX && 
          gridX < this.centralParkX + this.centralParkWidth
        );
        const isInParkZ = (
          gridZ >= this.centralParkY && 
          gridZ < this.centralParkY + this.centralParkHeight
        );
        
        if (!(isInParkX && isInParkZ)) {
          // Place lamp on the west sidewalk
          this.createStreetLamp(streetX - (roadWidth/2 + sidewalkWidth/2), z);
        }
      }
    }
  }
  
  /**
   * Create a street lamp at the specified position
   */
  createStreetLamp(x, z) {
    // Simplified lamp with fewer geometries
    // Combined post and fixture
    const postGeometry = new THREE.BoxGeometry(0.8, 7, 0.8);
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.set(x, 3.5, z);
    post.castShadow = true;
    this.scene.add(post);
    
    // Light fixture - just a simple box with emissive property
    const fixtureGeometry = new THREE.BoxGeometry(1.2, 0.5, 1.2);
    const fixtureMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.3 // Reduced intensity
    });
    const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
    fixture.position.set(x, 7.25, z);
    this.scene.add(fixture);
    
    // Physics body
    const body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(x, 3.5, z)
    });
    
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.4, 3.5, 0.4)));
    this.physicsWorld.addBody(body);
  }
  
  /**
   * Add traffic lights at major intersections
   */
  addTrafficLights() {
    const blockSize = this.blockSize;
    const roadWidth = this.roadWidth;
    const sidewalkWidth = this.sidewalkWidth;
    
    // Place even fewer traffic lights (increase spacing)
    for (let x = 0; x <= this.gridWidth; x += 4) { // Every 4th intersection
      for (let z = 0; z <= this.gridHeight; z += 4) { // Every 4th intersection
        const intersectionX = (x - this.gridWidth / 2) * (blockSize + roadWidth);
        const intersectionZ = (z - this.gridHeight / 2) * (blockSize + roadWidth);
        
        // Skip placing traffic lights in Central Park area
        const isInParkX = (
          x >= this.centralParkX && 
          x < this.centralParkX + this.centralParkWidth
        );
        const isInParkZ = (
          z >= this.centralParkY && 
          z < this.centralParkY + this.centralParkHeight
        );
        
        if (!(isInParkX && isInParkZ)) {
          // Place traffic light at the corner of the intersection (northwest corner)
          const lightX = intersectionX - (roadWidth/2) - (sidewalkWidth/2);
          const lightZ = intersectionZ - (roadWidth/2) - (sidewalkWidth/2);
          this.createTrafficLight(lightX, lightZ);
        }
      }
    }
  }
  
  /**
   * Create a traffic light at the specified position
   */
  createTrafficLight(x, z) {
    // Simplified traffic light - single box with material
    // Traffic light pole
    const poleGeometry = new THREE.BoxGeometry(0.5, 5, 0.5);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(x, 2.5, z);
    pole.castShadow = true;
    this.scene.add(pole);
    
    // Traffic light housing - simpler geometry
    const housingGeometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
    const housingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      emissive: 0x555555,
      emissiveIntensity: 0.2
    });
    const housing = new THREE.Mesh(housingGeometry, housingMaterial);
    housing.position.set(x, 5, z);
    housing.castShadow = true;
    this.scene.add(housing);
    
    // Physics body only for the pole to reduce complexity
    const body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(x, 2.5, z)
    });
    
    body.addShape(new CANNON.Box(new CANNON.Vec3(0.25, 2.5, 0.25)));
    this.physicsWorld.addBody(body);
  }
} 
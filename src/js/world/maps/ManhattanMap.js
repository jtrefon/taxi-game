import * as THREE from '../../../libs/three.module.js';
import * as CANNON from '../../../libs/cannon-es.js';
import { BaseMap } from './BaseMap.js';
import { CityGenerator } from '../CityGenerator.js';

/**
 * ManhattanMap class that implements a structured grid-based city layout
 * inspired by Manhattan's urban planning.
 * 
 * Uses the Strategy Pattern for building placement strategies.
 */
export class ManhattanMap extends BaseMap {
  /**
   * Create a new ManhattanMap
   * @param {THREE.Scene} scene - The Three.js scene
   * @param {CANNON.World} physicsWorld - The Cannon.js physics world
   * @param {Object} [options] - Options for map creation
   * @param {THREE.CubeTexture} [options.environmentMap] - Environment map for reflective materials
   */
  constructor(scene, physicsWorld, options = {}) {
    super(scene, physicsWorld);
    
    // Initialize city generator with environment map if available
    this.cityGenerator = new CityGenerator(scene, physicsWorld, {
      environmentMap: options.environmentMap
    });
    
    // Get TextureFactory from CityGenerator for consistent textures
    if (this.cityGenerator && this.cityGenerator.textureService) {
      this.textureFactory = this.cityGenerator.textureService.textureFactory;
    } else {
      // Use base map's texture factory
      this.textureFactory = this.getTextureFactory();
    }
    
    // Manhattan layout configuration
    this.gridWidth = 8;
    this.gridHeight = 8;
    
    // Central Park configuration (grid coordinates)
    this.centralParkX = 2;
    this.centralParkY = 2;
    this.centralParkWidth = 4;
    this.centralParkHeight = 4;
    
    // Store the map of blocks we've created
    this.blocks = {};
    
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
    const halfRoadWidth = roadWidth / 2;
    const step = blockSize + roadWidth; // Distance between centers of parallel roads

    // Calculate grid boundaries
    const minX = (-this.gridWidth / 2) * step - halfRoadWidth;
    const maxX = (this.gridWidth / 2) * step - halfRoadWidth;
    const minZ = (-this.gridHeight / 2) * step - halfRoadWidth;
    const maxZ = (this.gridHeight / 2) * step - halfRoadWidth;

    // Create avenues (north-south roads)
    for (let i = 0; i <= this.gridWidth; i++) {
      const x = minX + i * step;
      // Create road segments between intersections
      for (let j = 0; j < this.gridHeight; j++) {
        const zStart = minZ + j * step + halfRoadWidth;
        const zEnd = zStart + blockSize;
        const segmentZ = (zStart + zEnd) / 2;
        this.createRoad(x, segmentZ, blockSize, roadWidth, false);
      }
    }

    // Create streets (east-west roads)
    for (let j = 0; j <= this.gridHeight; j++) {
      const z = minZ + j * step;
      // Create road segments between intersections
      for (let i = 0; i < this.gridWidth; i++) {
        const xStart = minX + i * step + halfRoadWidth;
        const xEnd = xStart + blockSize;
        const segmentX = (xStart + xEnd) / 2;
        this.createRoad(segmentX, z, blockSize, roadWidth, true);
      }
    }

    // Create intersection surfaces
    for (let i = 0; i <= this.gridWidth; i++) {
      for (let j = 0; j <= this.gridHeight; j++) {
        const x = minX + i * step;
        const z = minZ + j * step;
        this.createIntersectionSurface(x, z, roadWidth);
        // Optionally add intersection details like crosswalks or traffic lights here
        // Example: this.addPedestrianCrossing(x, z, roadWidth, roadWidth, true);
        // Example: this.addTrafficLight(x, z, roadWidth, roadWidth, true);
      }
    }

    // Re-enable Broadway creation if desired, might need adjustments
    // this.createBroadway();
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
    
    // Apply texture to base building
    if (this.textureFactory) {
      this.textureFactory.getFacadeTexture('glass', `empire_${x}_${z}`);
    }
    
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
    
    // Apply texture to mid section
    if (this.textureFactory) {
      const midTexture = this.textureFactory.getFacadeTexture('office', `empire_mid_${x}_${z}`);
      if (midTexture) {
        midMaterial.map = midTexture;
        midMaterial.needsUpdate = true;
      }
    }
    
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
    const step = blockSize + roadWidth;
    const halfRoadWidth = roadWidth / 2;
    const halfSidewalkWidth = sidewalkWidth / 2;
    const sidewalkOffset = halfRoadWidth + halfSidewalkWidth; // Distance from road center to sidewalk center

    const lampSpacing = 40; // Adjust spacing as needed

    // Calculate grid boundaries for iteration
    const minGridX = -this.gridWidth / 2;
    const minGridZ = -this.gridHeight / 2;

    // Place lamps along horizontal street segments (East-West)
    for (let j = 0; j <= this.gridHeight; j++) { // Iterate through horizontal grid lines
      const streetZ = (minGridZ + j) * step - halfRoadWidth; // Center Z of the horizontal road
      const lampZ_North = streetZ - sidewalkOffset;
      const lampZ_South = streetZ + sidewalkOffset;

      for (let i = 0; i < this.gridWidth; i++) { // Iterate through blocks horizontally
        // Calculate segment boundaries for this block
        const segmentStartX = (minGridX + i) * step + halfRoadWidth;
        const segmentEndX = segmentStartX + blockSize;

        // Check if segment is inside Central Park (simplified check)
        const gridX = i;
        const gridZ = j;
        const isInPark = (
          gridX >= this.centralParkX && gridX < this.centralParkX + this.centralParkWidth &&
          gridZ >= this.centralParkY && gridZ < this.centralParkY + this.centralParkHeight
        );
        if (isInPark) continue; // Skip placing lamps in park segments

        // Place lamps along this segment
        for (let lampX = segmentStartX + lampSpacing / 2; lampX < segmentEndX; lampX += lampSpacing) {
          this.createStreetLamp(lampX, lampZ_North);
          this.createStreetLamp(lampX, lampZ_South);
        }
      }
    }

    // Place lamps along vertical avenue segments (North-South)
    for (let i = 0; i <= this.gridWidth; i++) { // Iterate through vertical grid lines
      const avenueX = (minGridX + i) * step - halfRoadWidth; // Center X of the vertical road
      const lampX_West = avenueX - sidewalkOffset;
      const lampX_East = avenueX + sidewalkOffset;

      for (let j = 0; j < this.gridHeight; j++) { // Iterate through blocks vertically
        // Calculate segment boundaries for this block
        const segmentStartZ = (minGridZ + j) * step + halfRoadWidth;
        const segmentEndZ = segmentStartZ + blockSize;

        // Check if segment is inside Central Park (simplified check)
        const gridX = i;
        const gridZ = j;
        const isInPark = (
          gridX >= this.centralParkX && gridX < this.centralParkX + this.centralParkWidth &&
          gridZ >= this.centralParkY && gridZ < this.centralParkY + this.centralParkHeight
        );
        if (isInPark) continue; // Skip placing lamps in park segments

        // Place lamps along this segment
        for (let lampZ = segmentStartZ + lampSpacing / 2; lampZ < segmentEndZ; lampZ += lampSpacing) {
          this.createStreetLamp(lampX_West, lampZ);
          this.createStreetLamp(lampX_East, lampZ);
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
    const step = blockSize + roadWidth;
    const minX = (-this.gridWidth / 2) * step - roadWidth / 2;
    const minZ = (-this.gridHeight / 2) * step - roadWidth / 2;

    // Place traffic lights at intersections using the BaseMap method
    // Reduced frequency for performance: every 2nd intersection
    for (let i = 0; i <= this.gridWidth; i += 2) {
      for (let j = 0; j <= this.gridHeight; j += 2) {
        const x = minX + i * step;
        const z = minZ + j * step;

        // Skip placing traffic lights in Central Park area
        const gridX = i;
        const gridZ = j;
        const isInParkX = (
          gridX >= this.centralParkX &&
          gridX < this.centralParkX + this.centralParkWidth
        );
        const isInParkZ = (
          gridZ >= this.centralParkY &&
          gridZ < this.centralParkY + this.centralParkHeight
        );

        if (!(isInParkX && isInParkZ)) {
          // Call the BaseMap's addTrafficLight method
          // Pass intersection center (x, z) and road dimensions
          // The BaseMap method handles placing 4 lights at corners
          this.addTrafficLight(x, z, roadWidth, roadWidth, false); // isHorizontal doesn't matter much here as BaseMap calculates corners
        }
      }
    }
  }
  
  /**
   * Override the createBuilding method to use the CityGenerator
   * @param {number} x - X coordinate for building
   * @param {number} z - Z coordinate for building
   * @param {number} width - Width of building
   * @param {number} depth - Depth of building
   * @param {number} height - Height of building
   * @param {number} materialIndex - Material index to use
   * @returns {THREE.Mesh} The created building
   */
  createBuilding(x, z, width, depth, height, materialIndex = null) {
    // Use the CityGenerator to create the building with textures
    return this.cityGenerator.createBuilding(x, z, width, depth, height);
  }
} 
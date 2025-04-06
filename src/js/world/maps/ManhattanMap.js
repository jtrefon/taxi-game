import * as THREE from 'three';
import * as CANNON from 'cannon-es';
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
    const buildingCount = 1 + Math.floor(Math.random() * 2); // 1-2 buildings per block
    const blockSize = this.blockSize;
    
    for (let i = 0; i < buildingCount; i++) {
      // Tall skyscrapers
      const height = 80 + Math.random() * 120; // 80-200 height
      
      // Size takes up more space but still keeps some margin
      const width = 20 + Math.random() * 15;
      const depth = 20 + Math.random() * 15;
      
      // Position with some slight variation if multiple buildings
      const offsetX = buildingCount > 1 ? (Math.random() * 2 - 1) * 10 : 0;
      const offsetZ = buildingCount > 1 ? (Math.random() * 2 - 1) * 10 : 0;
      
      // Material index for glass buildings
      const materialIndex = 1; // Blue glass material
      
      // Create a building
      this.createBuilding(x + offsetX, z + offsetZ, width, depth, height, materialIndex);
    }
  }
  
  /**
   * Create a residential block with smaller, more densely packed buildings
   */
  createResidentialBlock(x, z) {
    // Residential areas have more, smaller buildings
    const buildingCount = 3 + Math.floor(Math.random() * 3); // 3-5 buildings per block
    const blockSize = this.blockSize;
    
    // Use perimeter layout for residential blocks
    // This will position buildings around the edges of the block with space in the middle
    
    const buildingDepth = 12; // Standard depth for buildings facing the street
    const distFromEdge = blockSize / 2 - buildingDepth / 2 - 2; // Position near the edge
    
    // Randomly select 2-4 sides to place buildings on
    const sides = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3));
    
    // Place buildings on the selected sides
    for (const side of sides) {
      const buildingsOnSide = 1 + Math.floor(Math.random() * 2); // 1-2 buildings per side
      
      for (let i = 0; i < buildingsOnSide; i++) {
        // Medium sized buildings
        const height = 15 + Math.random() * 25; // 15-40 height
        
        // Width varies based on how many buildings on this side
        const buildingWidth = blockSize / (buildingsOnSide + 0.5) * 0.8;
        
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
            posZ = z - distFromEdge;
            break;
          case 1: // East
            posX = x + distFromEdge;
            posZ = z + offset;
            finalWidth = buildingDepth;
            finalDepth = buildingWidth;
            break;
          case 2: // South
            posX = x + offset;
            posZ = z + distFromEdge;
            break;
          case 3: // West
            posX = x - distFromEdge;
            posZ = z + offset;
            finalWidth = buildingDepth;
            finalDepth = buildingWidth;
            break;
        }
        
        // Randomly select a material for variety
        const materialIndex = Math.floor(Math.random() * this.buildingMaterials.length);
        
        // Create a building
        this.createBuilding(posX, posZ, finalWidth, finalDepth, height, materialIndex);
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
    // Add street lamps along roads
    this.addStreetLamps();
    
    // Add traffic lights at major intersections
    this.addTrafficLights();
  }
  
  /**
   * Add street lamps along roads
   */
  addStreetLamps() {
    const blockSize = this.blockSize;
    const roadWidth = this.roadWidth;
    const lampSpacing = 40; // Distance between lamps
    
    // Place lamps along horizontal streets
    for (let z = 0; z <= this.gridHeight; z++) {
      const streetZ = (z - this.gridHeight / 2) * (blockSize + roadWidth);
      for (let x = 0; x < this.gridWidth * (blockSize + roadWidth) * 2; x += lampSpacing) {
        const lampX = x - this.gridWidth * (blockSize + roadWidth);
        
        // Skip placing lamps in Central Park area
        const isInParkX = (
          lampX / (blockSize + roadWidth) + this.gridWidth / 2 >= this.centralParkX &&
          lampX / (blockSize + roadWidth) + this.gridWidth / 2 <= this.centralParkX + this.centralParkWidth
        );
        const isInParkZ = (
          streetZ / (blockSize + roadWidth) + this.gridHeight / 2 >= this.centralParkY &&
          streetZ / (blockSize + roadWidth) + this.gridHeight / 2 <= this.centralParkY + this.centralParkHeight
        );
        
        if (!(isInParkX && isInParkZ)) {
          this.createStreetLamp(lampX, streetZ - roadWidth/2 + 1);
        }
      }
    }
    
    // Place lamps along vertical streets
    for (let x = 0; x <= this.gridWidth; x++) {
      const streetX = (x - this.gridWidth / 2) * (blockSize + roadWidth);
      for (let z = 0; z < this.gridHeight * (blockSize + roadWidth) * 2; z += lampSpacing) {
        const lampZ = z - this.gridHeight * (blockSize + roadWidth);
        
        // Skip placing lamps in Central Park area (similar check as above)
        const isInParkX = (
          streetX / (blockSize + roadWidth) + this.gridWidth / 2 >= this.centralParkX &&
          streetX / (blockSize + roadWidth) + this.gridWidth / 2 <= this.centralParkX + this.centralParkWidth
        );
        const isInParkZ = (
          lampZ / (blockSize + roadWidth) + this.gridHeight / 2 >= this.centralParkY &&
          lampZ / (blockSize + roadWidth) + this.gridHeight / 2 <= this.centralParkY + this.centralParkHeight
        );
        
        if (!(isInParkX && isInParkZ)) {
          this.createStreetLamp(streetX - roadWidth/2 + 1, lampZ);
        }
      }
    }
  }
  
  /**
   * Create a street lamp at the specified position
   */
  createStreetLamp(x, z) {
    // Lamp post
    const postGeometry = new THREE.CylinderGeometry(0.3, 0.3, 7, 6);
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.set(x, 3.5, z);
    post.castShadow = true;
    this.scene.add(post);
    
    // Lamp fixture
    const fixtureGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 8);
    const fixtureMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
    fixture.position.set(x, 7.5, z);
    fixture.castShadow = true;
    this.scene.add(fixture);
    
    // Light source
    const light = new THREE.PointLight(0xffffcc, 0.5, 20);
    light.position.set(x, 7.5, z);
    this.scene.add(light);
    
    // Physics body for the lamp post
    const body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(x, 3.5, z)
    });
    
    body.addShape(new CANNON.Cylinder(0.3, 0.3, 7, 6));
    this.physicsWorld.addBody(body);
  }
  
  /**
   * Add traffic lights at major intersections
   */
  addTrafficLights() {
    const blockSize = this.blockSize;
    const roadWidth = this.roadWidth;
    
    // Place traffic lights at major intersections
    for (let x = 0; x <= this.gridWidth; x += 2) {
      for (let z = 0; z <= this.gridHeight; z += 2) {
        const intersectionX = (x - this.gridWidth / 2) * (blockSize + roadWidth);
        const intersectionZ = (z - this.gridHeight / 2) * (blockSize + roadWidth);
        
        // Skip placing traffic lights in Central Park area
        const isInParkX = (
          x / (blockSize + roadWidth) + this.gridWidth / 2 >= this.centralParkX &&
          x / (blockSize + roadWidth) + this.gridWidth / 2 <= this.centralParkX + this.centralParkWidth
        );
        const isInParkZ = (
          z / (blockSize + roadWidth) + this.gridHeight / 2 >= this.centralParkY &&
          z / (blockSize + roadWidth) + this.gridHeight / 2 <= this.centralParkY + this.centralParkHeight
        );
        
        if (!(isInParkX && isInParkZ)) {
          this.createTrafficLight(intersectionX + roadWidth/2, intersectionZ + roadWidth/2);
        }
      }
    }
  }
  
  /**
   * Create a traffic light at the specified position
   */
  createTrafficLight(x, z) {
    // Traffic light pole
    const poleGeometry = new THREE.CylinderGeometry(0.2, 0.2, 5, 6);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(x, 2.5, z);
    pole.castShadow = true;
    this.scene.add(pole);
    
    // Traffic light housing
    const housingGeometry = new THREE.BoxGeometry(0.6, 1.5, 0.6);
    const housingMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const housing = new THREE.Mesh(housingGeometry, housingMaterial);
    housing.position.set(x, 5, z);
    housing.castShadow = true;
    this.scene.add(housing);
    
    // Lights - red, yellow, green
    const lightGeometry = new THREE.CircleGeometry(0.15, 8);
    
    const redMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    });
    
    const yellowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.5  
    });
    
    const greenMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.5
    });
    
    // Create and position the light circles
    const redLight = new THREE.Mesh(lightGeometry, redMaterial);
    redLight.position.set(x, 5.5, z + 0.31);
    redLight.rotation.x = -Math.PI / 2;
    redLight.rotation.y = Math.PI;
    this.scene.add(redLight);
    
    const yellowLight = new THREE.Mesh(lightGeometry, yellowMaterial);
    yellowLight.position.set(x, 5, z + 0.31);
    yellowLight.rotation.x = -Math.PI / 2;
    yellowLight.rotation.y = Math.PI;
    this.scene.add(yellowLight);
    
    const greenLight = new THREE.Mesh(lightGeometry, greenMaterial);
    greenLight.position.set(x, 4.5, z + 0.31);
    greenLight.rotation.x = -Math.PI / 2;
    greenLight.rotation.y = Math.PI;
    this.scene.add(greenLight);
    
    // Physics body for the traffic light
    const body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(x, 2.5, z)
    });
    
    body.addShape(new CANNON.Cylinder(0.2, 0.2, 5, 6));
    this.physicsWorld.addBody(body);
  }
} 
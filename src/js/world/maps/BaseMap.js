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
    // Enhanced road with multiple lanes, textures and elevation
    const roadWidth = width;
    const sidewalkWidth = this.sidewalkWidth;
    const sidewalkHeight = 0.25; // Slight elevation for sidewalks
    const laneWidth = 3.5; // Standard lane width
    
    // Calculate number of lanes in each direction (minimum 2, maximum based on width)
    const lanesPerDirection = Math.max(2, Math.floor((roadWidth - 2) / (2 * laneWidth))); 
    const totalLanes = lanesPerDirection * 2;
    const actualLaneWidth = (roadWidth - 2) / totalLanes; // Adjust lane width to fit the road
    const centerLineWidth = 2; // Width of center divider
    
    // Get texture factory
    const textureFactory = this.getTextureFactory();
    
    // 1. Create base road surface
    const roadGeometry = new THREE.PlaneGeometry(
      isHorizontal ? length : roadWidth,
      isHorizontal ? roadWidth : length
    );
    
    // Get asphalt texture
    const asphaltTexture = textureFactory.getEnvironmentTexture('asphalt');
    
    const roadMaterial = new THREE.MeshStandardMaterial({
      map: asphaltTexture,
      roughness: 0.9,
      metalness: 0.1,
      color: 0x333333 // Dark gray asphalt
    });
    
    // Set texture repeat based on road size
    if (asphaltTexture) {
      asphaltTexture.rotation = isHorizontal ? 0 : Math.PI / 2;
      asphaltTexture.repeat.set(
        isHorizontal ? length / 20 : roadWidth / 20,
        isHorizontal ? roadWidth / 20 : length / 20
      );
      asphaltTexture.needsUpdate = true;
    }
    
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2; // Rotate to horizontal
    road.position.set(x, 0.05, z); // Slightly above ground to prevent z-fighting
    road.receiveShadow = true;
    this.scene.add(road);
    
    // 2. Create lane markings
    this.addLaneMarkings(x, z, length, roadWidth, lanesPerDirection, actualLaneWidth, centerLineWidth, isHorizontal);
    
    // 3. Add elevated sidewalks with textures
    this.addElevatedSidewalks(x, z, length, roadWidth, sidewalkWidth, sidewalkHeight, isHorizontal);
  }
  
  /**
   * Add lane markings to the road
   */
  addLaneMarkings(x, z, length, roadWidth, lanesPerDirection, laneWidth, centerLineWidth, isHorizontal) {
    const dashLength = 2; // Length of dashed line segments
    const dashGap = 2; // Gap between dashed line segments
    const halfRoadWidth = roadWidth / 2;
    
    // Create center divider (solid double yellow line)
    const centerDividerGeometry = new THREE.PlaneGeometry(
      isHorizontal ? length : centerLineWidth,
      isHorizontal ? centerLineWidth : length
    );
    
    const centerDividerMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Yellow center line
    
    const centerDivider = new THREE.Mesh(centerDividerGeometry, centerDividerMaterial);
    centerDivider.rotation.x = -Math.PI / 2;
    centerDivider.position.set(x, 0.06, z); // Slightly above road surface
    this.scene.add(centerDivider);
    
    // Add lane markings for each direction
    for (let direction = 0; direction < 2; direction++) { // 0 = left side, 1 = right side
      const directionFactor = direction === 0 ? -1 : 1;
      
      // Add dashed lane separators (except for outermost lane)
      for (let lane = 1; lane < lanesPerDirection; lane++) {
        const laneOffset = directionFactor * (centerLineWidth/2 + lane * laneWidth);
        
        // Create dashed line markings
        const dashCount = Math.floor(length / (dashLength + dashGap));
        
        for (let i = 0; i < dashCount; i++) {
          const dashPosition = -length/2 + i * (dashLength + dashGap) + dashLength/2;
          
          const dashGeometry = new THREE.PlaneGeometry(
            isHorizontal ? dashLength : 0.1,
            isHorizontal ? 0.1 : dashLength
          );
          
          const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // White dashed lines
          
          const dash = new THREE.Mesh(dashGeometry, dashMaterial);
          dash.rotation.x = -Math.PI / 2;
          
          // Position the dash based on orientation
          if (isHorizontal) {
            dash.position.set(x + dashPosition, 0.06, z + laneOffset);
          } else {
            dash.position.set(x + laneOffset, 0.06, z + dashPosition);
          }
          
          this.scene.add(dash);
        }
      }
      
      // Add solid outer line (white)
      const outerLineOffset = directionFactor * (halfRoadWidth - 0.1);
      
      const outerLineGeometry = new THREE.PlaneGeometry(
        isHorizontal ? length : 0.2,
        isHorizontal ? 0.2 : length
      );
      
      const outerLineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
      
      const outerLine = new THREE.Mesh(outerLineGeometry, outerLineMaterial);
      outerLine.rotation.x = -Math.PI / 2;
      
      // Position the outer line
      if (isHorizontal) {
        outerLine.position.set(x, 0.06, z + outerLineOffset);
      } else {
        outerLine.position.set(x + outerLineOffset, 0.06, z);
      }
      
      this.scene.add(outerLine);
    }
  }
  
  /**
   * Add elevated sidewalks to both sides of the road
   */
  addElevatedSidewalks(x, z, length, roadWidth, sidewalkWidth, sidewalkHeight, isHorizontal) {
    const halfRoadWidth = roadWidth / 2;
    const halfSidewalkWidth = sidewalkWidth / 2;
    const sidewalkY = sidewalkHeight / 2; // Position at half height for the geometry
    
    // Get texture factory and sidewalk texture
    const textureFactory = this.getTextureFactory();
    const sidewalkTexture = textureFactory.getEnvironmentTexture('sidewalk');
    
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      map: sidewalkTexture,
      roughness: 0.8,
      metalness: 0.0,
      color: 0xCCCCCC // Light gray concrete
    });
    
    // Create sidewalk geometries with height
    for (let side = 0; side < 2; side++) {
      const sideFactor = side === 0 ? -1 : 1;
      const sideOffset = sideFactor * (halfRoadWidth + halfSidewalkWidth);
      
      // Main sidewalk surface
      const sidewalkGeometry = new THREE.BoxGeometry(
        isHorizontal ? length : sidewalkWidth,
        sidewalkHeight,
        isHorizontal ? sidewalkWidth : length
      );
      
      // Set texture repeat based on size
      if (sidewalkTexture) {
        const repeatX = isHorizontal ? length / 10 : sidewalkWidth / 10;
        const repeatY = isHorizontal ? sidewalkWidth / 10 : length / 10;
        sidewalkTexture.repeat.set(repeatX, repeatY);
        sidewalkTexture.needsUpdate = true;
      }
      
      const sidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
      
      // Position the sidewalk with correct elevation
      if (isHorizontal) {
        sidewalk.position.set(x, sidewalkY, z + sideOffset);
      } else {
        sidewalk.position.set(x + sideOffset, sidewalkY, z);
      }
      
      sidewalk.receiveShadow = true;
      this.scene.add(sidewalk);
      
      // Create curb geometry
      const curbHeight = 0.15;
      const curbWidth = 0.25;
      const curbGeometry = new THREE.BoxGeometry(
        isHorizontal ? length : curbWidth,
        curbHeight,
        isHorizontal ? curbWidth : length
      );
      
      const curbMaterial = new THREE.MeshStandardMaterial({
        color: 0x999999, // Medium gray concrete
        roughness: 0.9
      });
      
      const curb = new THREE.Mesh(curbGeometry, curbMaterial);
      
      // Position the curb at the edge between sidewalk and road
      const curbOffset = sideFactor * (halfRoadWidth + curbWidth/2);
      
      if (isHorizontal) {
        curb.position.set(x, curbHeight/2, z + curbOffset);
      } else {
        curb.position.set(x + curbOffset, curbHeight/2, z);
      }
      
      curb.receiveShadow = true;
      curb.castShadow = true;
      this.scene.add(curb);
      
      // Add physics body for the sidewalk and curb to prevent vehicles driving on them
      const sidewalkShape = new CANNON.Box(new CANNON.Vec3(
        isHorizontal ? length/2 : sidewalkWidth/2,
        sidewalkHeight/2,
        isHorizontal ? sidewalkWidth/2 : length/2
      ));
      
      const sidewalkBody = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.STATIC
      });
      
      if (isHorizontal) {
        sidewalkBody.position.set(x, sidewalkY, z + sideOffset);
      } else {
        sidewalkBody.position.set(x + sideOffset, sidewalkY, z);
      }
      
      sidewalkBody.addShape(sidewalkShape);
      this.physicsWorld.addBody(sidewalkBody);
    }
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
    
    // Add trees using textured 3D models instead of billboards
    this.addTexturedTrees(x, z, width, height);
  }
  
  /**
   * Add trees using textured 3D models instead of billboards
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
    
    // Get tree textures from texture factory
    const textureFactory = this.getTextureFactory();
    
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
    
    // Add benches using traditional geometry to maintain collisions
    this.addParkBenches(x, z, width, height);
  }
  
  /**
   * Creates a tree at the given position
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {string} type - Type of tree
   */
  createTree(x, z, type = 'oak') {
    // Random height variation
    let baseScale = Math.random() * 0.3 + 0.85;
    const heightScale = baseScale * 2;
    let trunkRadius, trunkHeight, crownShape, crownRadius, crownHeight;
    
    // Get texture factory
    const textureFactory = this.getTextureFactory();
    
    // Materials setup with texture
    const barkMaterial = new THREE.MeshStandardMaterial({
      map: textureFactory.getBarkTexture ? textureFactory.getBarkTexture(type) : null,
      roughness: 0.9,
      metalness: 0.1,
      color: type === 'birch' ? 0xDDDDDD : 0x8D6E63
    });
    
    const foliageMaterial = new THREE.MeshStandardMaterial({
      map: textureFactory.getEnvironmentTexture('tree', type),
      color: this.getTreeFoliageColor(type),
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.DoubleSide,
      alphaTest: 0.5
    });
    
    // Create a group for the full tree
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);
    
    // Type-specific geometry and proportions
    switch (type) {
      case 'pine':
        trunkRadius = 0.2 * baseScale;
        trunkHeight = 3 * heightScale;
        
        // Create trunk
        const pineSegments = 8;
        const pinetrunkGeometry = new THREE.CylinderGeometry(
          trunkRadius * 0.7, trunkRadius, trunkHeight, pineSegments
        );
        const pineTrunk = new THREE.Mesh(pinetrunkGeometry, barkMaterial);
        pineTrunk.position.y = trunkHeight / 2;
        treeGroup.add(pineTrunk);
        
        // Create pine foliage as stacked cones
        const coneLayers = 4 + Math.floor(Math.random() * 3);
        const coneOverlap = 0.3;
        let coneSize = 2 * baseScale;
        const coneHeight = 1.2 * heightScale;
        
        for (let i = 0; i < coneLayers; i++) {
          const y = trunkHeight - (coneHeight * 0.6 * i * (1-coneOverlap));
          const coneGeometry = new THREE.ConeGeometry(
            coneSize, coneHeight, 8
          );
          coneSize *= 0.8; // Each higher layer is smaller
          
          const cone = new THREE.Mesh(coneGeometry, foliageMaterial);
          
          // Position the cone with slight random offset for naturalness
          const offsetX = (Math.random() - 0.5) * 0.3;
          const offsetZ = (Math.random() - 0.5) * 0.3;
          cone.position.set(offsetX, y, offsetZ);
          
          treeGroup.add(cone);
          
          // Each higher layer gets smaller
          coneSize *= 0.75;
          coneHeight *= 0.9;
        }
        
        // Create collision cylinder
        const pineCollisionGeo = new THREE.CylinderGeometry(1.5, 1.5, trunkHeight + coneHeight, 8);
        break;
        
      case 'birch':
        trunkRadius = 0.15 * baseScale;
        trunkHeight = 4 * heightScale;
        
        // Create trunk with slight curve
        const birchCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.1, trunkHeight * 0.3, 0.1),
          new THREE.Vector3(-0.05, trunkHeight * 0.6, -0.05),
          new THREE.Vector3(0, trunkHeight, 0)
        ]);
        
        const birchTrunkGeo = new THREE.TubeGeometry(
          birchCurve, 8, trunkRadius, 8, false
        );
        const birchTrunk = new THREE.Mesh(birchTrunkGeo, barkMaterial);
        treeGroup.add(birchTrunk);
        
        // Create birch foliage as an elongated ellipsoid
        crownRadius = 1.5 * baseScale;
        crownHeight = 3 * heightScale;
        const birchCrownGeo = new THREE.SphereGeometry(crownRadius, 8, 8);
        birchCrownGeo.scale(1, crownHeight/crownRadius, 1);
        
        const birchCrown = new THREE.Mesh(birchCrownGeo, foliageMaterial);
        birchCrown.position.y = trunkHeight * 0.7;
        treeGroup.add(birchCrown);
        
        // Add smaller foliage clumps for more natural look
        const smallClusterCount = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < smallClusterCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = crownRadius * 0.5;
          const clusterSize = crownRadius * (0.4 + Math.random() * 0.3);
          
          const clusterGeo = new THREE.SphereGeometry(clusterSize, 6, 6);
          const cluster = new THREE.Mesh(clusterGeo, foliageMaterial);
          
          cluster.position.set(
            Math.cos(angle) * distance,
            trunkHeight * (0.6 + Math.random() * 0.3),
            Math.sin(angle) * distance
          );
          
          treeGroup.add(cluster);
        }
        
        // Create collision cylinder
        const birchCollisionGeo = new THREE.CylinderGeometry(crownRadius, crownRadius, trunkHeight + crownHeight, 8);
        break;
        
      case 'tropical':
        trunkRadius = 0.2 * baseScale;
        trunkHeight = 4 * heightScale;
        
        // Create curved palm trunk
        const palmCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.5, trunkHeight * 0.3, 0),
          new THREE.Vector3(1, trunkHeight * 0.7, 0),
          new THREE.Vector3(1.2, trunkHeight, 0)
        ]);
        
        const palmTrunkGeo = new THREE.TubeGeometry(
          palmCurve, 10, trunkRadius, 8, false
        );
        const palmTrunk = new THREE.Mesh(palmTrunkGeo, barkMaterial);
        treeGroup.add(palmTrunk);
        
        // Create palm fronds
        const frondCount = 8 + Math.floor(Math.random() * 5);
        const frondLength = 2.5 * baseScale;
        const crownCenter = new THREE.Vector3(1.2, trunkHeight, 0);
        
        // Small crown at top of palm
        const palmCrownGeo = new THREE.SphereGeometry(trunkRadius * 1.5, 8, 8);
        const palmCrown = new THREE.Mesh(palmCrownGeo, foliageMaterial);
        palmCrown.position.copy(crownCenter);
        treeGroup.add(palmCrown);
        
        for (let i = 0; i < frondCount; i++) {
          const angle = (i / frondCount) * Math.PI * 2;
          
          // Create curved palm frond shape using modified plane
          const segments = 12; // More segments for smoother curve
          const frondGeometry = new THREE.PlaneGeometry(
            frondLength, 
            frondLength, 
            4, // Width segments
            segments // Length segments for better curve
          );
          
          // Custom curve the frond by adjusting vertices
          const frondVertices = frondGeometry.attributes.position;
          for (let j = 0; j < frondVertices.count; j++) {
            const x = frondVertices.getX(j);
            const y = frondVertices.getY(j);
            
            if (y > 0) { // Only adjust the length of the frond, not the base
              // Calculate normalized position along frond (0 at base, 1 at tip)
              const t = y / frondLength;
              
              // Curvature function - more pronounced at the end
              const bendFactor = t * t * 0.8; // Quadratic curve
              
              // Apply curve - drop the tip down
              frondVertices.setY(j, y * (1 - bendFactor * 0.7));
              
              // Add slight sideways curve
              const sidewaysCurve = Math.sin(t * Math.PI) * 0.2;
              frondVertices.setX(j, x + sidewaysCurve * frondLength);
              
              // Add center rib bulge
              const ribBulge = 0.1 * Math.exp(-Math.pow(x / (frondLength/2), 2) * 2) * (1 - t);
              frondVertices.setZ(j, ribBulge);
            }
          }
          frondGeometry.attributes.position.needsUpdate = true;
          
          const frond = new THREE.Mesh(frondGeometry, foliageMaterial);
          
          // Position and rotate frond
          frond.rotation.x = -Math.PI / 3; // Angle upward
          frond.rotation.z = angle;
          
          // Add slight random variation to each frond angle 
          frond.rotation.x += (Math.random() - 0.5) * 0.3;
          frond.rotation.z += (Math.random() - 0.5) * 0.2;
          
          frond.position.y = trunkHeight;
          
          treeGroup.add(frond);
          
          // Create second side of the frond by duplicating and flipping
          const backFrond = frond.clone();
          backFrond.rotation.y = Math.PI; // Flip to other side
          treeGroup.add(backFrond);
        }
        
        // Create collision cylinder
        const tropicalCollisionGeo = new THREE.CylinderGeometry(frondLength, 0.5, trunkHeight, 8);
        break;
        
      case 'oak':
      default:
        trunkRadius = 0.25 * baseScale;
        trunkHeight = 2.2 * heightScale;
        
        // Create trunk
        const oakTrunkGeometry = new THREE.CylinderGeometry(
          trunkRadius * 0.7, trunkRadius, trunkHeight, 8
        );
        const oakTrunk = new THREE.Mesh(oakTrunkGeometry, barkMaterial);
        oakTrunk.position.y = trunkHeight / 2;
        treeGroup.add(oakTrunk);
        
        // Create main branches
        const branchCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < branchCount; i++) {
          const angle = (i / branchCount) * Math.PI * 2;
          const branchLength = 0.8 + Math.random() * 0.5;
          const branchHeight = trunkHeight * (0.6 + Math.random() * 0.3);
          const branchThickness = trunkRadius * (0.3 + Math.random() * 0.2);
          
          // Create branch curve
          const branchCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, branchHeight, 0),
            new THREE.Vector3(
              Math.cos(angle) * branchLength * 0.5,
              branchHeight + 0.2 + Math.random() * 0.3,
              Math.sin(angle) * branchLength * 0.5
            ),
            new THREE.Vector3(
              Math.cos(angle) * branchLength,
              branchHeight + 0.1 + Math.random() * 0.2,
              Math.sin(angle) * branchLength
            )
          ]);
          
          const branchGeo = new THREE.TubeGeometry(
            branchCurve, 5, branchThickness, 4, false
          );
          const branch = new THREE.Mesh(branchGeo, barkMaterial);
          treeGroup.add(branch);
        }
        
        // Create oak foliage as an irregular sphere
        crownRadius = 1.8 * baseScale;
        const oakCrownGeo = new THREE.SphereGeometry(crownRadius, 8, 6);
        
        // Deform the crown geometry for a more natural look
        const crownVertices = oakCrownGeo.getAttribute('position');
        for (let i = 0; i < crownVertices.count; i++) {
          const vertex = new THREE.Vector3();
          vertex.fromBufferAttribute(crownVertices, i);
          
          const distortion = 0.2 * Math.sin(vertex.x * 2) * Math.cos(vertex.z * 3);
          vertex.x += distortion;
          vertex.y += distortion * 0.5;
          vertex.z += distortion;
          
          crownVertices.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        oakCrownGeo.computeVertexNormals();
        
        const oakCrown = new THREE.Mesh(oakCrownGeo, foliageMaterial);
        oakCrown.position.y = trunkHeight * 1.1;
        treeGroup.add(oakCrown);
        
        // Add additional foliage clusters for more natural look
        const clusterCount = Math.floor(Math.random() * 4) + 2;
        for (let i = 0; i < clusterCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = crownRadius * 0.7;
          const height = Math.random() * crownRadius * 0.6;
          const clusterSize = crownRadius * (0.4 + Math.random() * 0.3);
          
          const clusterGeo = new THREE.SphereGeometry(clusterSize, 6, 6);
          const cluster = new THREE.Mesh(clusterGeo, foliageMaterial);
          
          cluster.position.set(
            Math.cos(angle) * distance,
            trunkHeight + height,
            Math.sin(angle) * distance
          );
          
          treeGroup.add(cluster);
        }
        
        // Create collision cylinder
        const oakCollisionGeo = new THREE.CylinderGeometry(crownRadius, crownRadius, trunkHeight + crownRadius * 2, 8);
    }
    
    // Add tree to scene
    this.scene.add(treeGroup);
    
    // Create invisible collision cylinder
    const collisionHeight = type === 'pine' ? 6 * heightScale : 
                           type === 'tropical' ? 4 * heightScale :
                           trunkHeight + (crownHeight || crownRadius * 2);
    
    const collisionRadius = type === 'pine' ? 1.5 * baseScale :
                           type === 'tropical' ? 2 * baseScale :
                           (crownRadius || 1.5) * 0.8;
                           
    const collisionGeo = new THREE.CylinderGeometry(
      collisionRadius, collisionRadius, collisionHeight, 8
    );
    const collisionMaterial = new THREE.MeshBasicMaterial({
      visible: false
    });
    const collisionMesh = new THREE.Mesh(collisionGeo, collisionMaterial);
    collisionMesh.position.set(x, collisionHeight / 2, z);
    
    // Add physics for the tree
    this.physicsWorld.addBody(
      new CANNON.Body({
        mass: 0,
        shape: new CANNON.Cylinder(
          collisionRadius, collisionRadius, collisionHeight, 8
        ),
        position: new CANNON.Vec3(x, collisionHeight / 2, z)
      })
    );
    
    this.scene.add(collisionMesh);
    
    return treeGroup;
  }
  
  /**
   * Get a foliage color based on tree type
   * @param {string} type - Tree type
   * @returns {number} THREE.js color
   */
  getTreeFoliageColor(type) {
    switch (type) {
      case 'pine':
        return 0x2E7D32;
      case 'birch':
        return 0x81C784;
      case 'tropical':
        return 0x66BB6A;
      case 'oak':
      default:
        return 0x388E3C;
    }
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
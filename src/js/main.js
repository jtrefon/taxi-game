import * as THREE from '../libs/three.module.js';
import { OrbitControls } from '../libs/OrbitControls.js';
import { GLTFLoader } from '../libs/GLTFLoader.js';
import * as CANNON from '../libs/cannon-es.js';

import { GameWorld } from './world/GameWorld.js';
import { Vehicle } from './entities/Vehicle.js';
import { InputHandler } from './core/InputHandler.js';
import { MobileControls } from './ui/MobileControls.js';
import { FullscreenButton } from './ui/FullscreenButton.js';
import { MapManager } from './world/maps/MapManager.js';
import { NPCFactory } from './world/NPCFactory.js';

class Game {
  constructor() {
    // DOM Elements
    this.loadingScreen = document.getElementById('loading-screen');
    this.speedElement = document.getElementById('speed');
    this.moneyElement = document.getElementById('money');
    this.fpsElement = document.getElementById('fps-counter'); // Get FPS element
    this.resetTimerElement = document.getElementById('reset-timer'); // Get Reset Timer element
    
    // Game state
    this.money = 0;
    this.isPlaying = false;
    this.showFps = true; // Flag to control FPS counter visibility
    this.npcs = []; // Array to hold active NPCs
    this.maxNPCs = 15; // Limit the number of NPCs for performance
    this.npcSpawnTimer = 0;
    this.npcSpawnInterval = 3000; // Try spawning an NPC every 3 seconds
    
    // FPS Calculation state
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fps = 0;
    this.fpsTime = 0;
    
    // Camera panning state - Using angles now
    this.isPanning = false;
    this.panAngleX = 0;         // Current horizontal pan angle
    this.panAngleY = 0;         // Current vertical pan angle
    this.panTargetAngleX = 0;   // Target horizontal pan angle
    this.panTargetAngleY = 0;   // Target vertical pan angle
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.panSmoothFactor = 0.25; // How quickly manual pan returns to center
    this.minVerticalAngle = -Math.PI / 3; 
    this.maxVerticalAngle = Math.PI / 2.5; 
    this.panSensitivity = 0.005; 

    // New state for smooth camera turning follow
    this.currentCameraYaw = 0;      // Camera's current horizontal world angle
    this.targetCameraYaw = 0;       // Target camera yaw (matches vehicle)
    this.turnSmoothFactor = 0.15;   // How quickly camera base follows turns (higher = faster)
    
    // Vehicle Reset State
    this.isVehicleOverturned = false;
    this.overturnTimer = 0;
    this.resetDelay = 3000; // 3 seconds in milliseconds
    
    // Traffic Light State
    this.trafficLights = []; // Will hold references from BaseMap
    this.trafficLightTimer = 0;
    this.trafficLightInterval = 5000; // 5 seconds in milliseconds
    this.trafficLightStateNS = 'green'; // Initial state for North-South direction
    this.trafficLightStateEW = 'red';   // Initial state for East-West direction
    
    // Initialize systems
    this.initThree();
    this.initPhysics();
    this.initWorld();
    this.initInput();
    
    // Start the game loop
    this.animate();
    
    // Hide loading screen after initialization
    setTimeout(() => {
      this.loadingScreen.style.display = 'none';
      this.isPlaying = true;
    }, 1000);
  }
  
  initThree() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, -10);
    this.camera.lookAt(0, 0, 0);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    const container = document.getElementById('game-container');
    container.appendChild(this.renderer.domElement);
    
    // Ensure canvas gets focus for keyboard events
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.addEventListener('click', () => {
      this.renderer.domElement.focus();
    });
    // Auto-focus on load
    setTimeout(() => {
      this.renderer.domElement.focus();
    }, 100);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  
  initPhysics() {
    // Create physics world
    this.physicsWorld = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0)
    });
    
    // Set solver iterations
    this.physicsWorld.solver.iterations = 10;
    this.physicsWorld.solver.tolerance = 0.01;
  }
  
  initWorld() {
    // Create game world
    this.gameWorld = new GameWorld(this.scene, this.physicsWorld);
    
    // Initialize map manager and create Manhattan map
    this.mapManager = new MapManager(this.scene, this.physicsWorld, {
      environmentMap: this.gameWorld.getEnvironmentMap()
    });
    this.currentMap = this.mapManager.createMap('manhattan'); // Store reference to the map

    // Initialize NPC Factory
    this.npcFactory = new NPCFactory(this.scene, this.physicsWorld);

    // Get traffic light systems from the created map
    if (this.currentMap && typeof this.currentMap.getTrafficLightSystems === 'function') {
      this.trafficLights = this.currentMap.getTrafficLightSystems();
    }
    
    // Determine initial vehicle spawn position
    let initialSpawnPos = new THREE.Vector3(0, 1, 0); // Default spawn
    if (this.currentMap && this.currentMap.hospitalLocation) {
        const hospLoc = this.currentMap.hospitalLocation;
        const blockSize = this.currentMap.blockSize || 50; // Get block size or default
        const offsetX = blockSize * 0.4; // Offset to place in carpark (outside building footprint)
        const offsetZ = blockSize * 0.4;
        initialSpawnPos.set(hospLoc.x + offsetX, 1, hospLoc.z + offsetZ); 
        console.log("Spawning vehicle near hospital at:", initialSpawnPos);
    } else {
        console.log("Hospital location not found, using default vehicle spawn.");
    }
    
    // Create player vehicle
    this.playerVehicle = new Vehicle(this.scene, this.physicsWorld, {
      position: initialSpawnPos
    });
    
    // Set up camera to follow player
    this.thirdPersonCamera = {
      distance: 7,
      height: 3,
      rotationSpeed: 0.1
    };
  }
  
  initInput() {
    this.input = new InputHandler();
    
    // Initialize mobile controls
    this.mobileControls = new MobileControls(this.input);
    
    // Initialize fullscreen button
    this.fullscreenButton = new FullscreenButton();
    
    // Add mouse event listeners for panning
    window.addEventListener('mousedown', this.handleMouseDown.bind(this));
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('mouseup', this.handleMouseUp.bind(this));
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  handleMouseDown(event) {
    // Use left mouse button for panning
    if (event.button === 0) {
      this.isPanning = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      document.body.style.cursor = 'grabbing';
    }
  }
  
  handleMouseMove(event) {
    if (this.isPanning) {
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      
      // Adjust target angles based on mouse movement
      this.panTargetAngleX -= deltaX * this.panSensitivity;
      this.panTargetAngleY -= deltaY * this.panSensitivity;
      
      // Clamp the vertical pan angle
      this.panTargetAngleY = Math.max(this.minVerticalAngle, Math.min(this.maxVerticalAngle, this.panTargetAngleY));
      
      // Keep horizontal angle accumulating (wrap later if needed for display)
    }
  }
  
  handleMouseUp(event) {
    if (event.button === 0 && this.isPanning) {
      this.isPanning = false;
      document.body.style.cursor = 'default';
      
      // Immediately set the target angles back to 0
      this.panTargetAngleX = 0;
      this.panTargetAngleY = 0;
    }
  }
  
  updateCamera() {
    if (!this.playerVehicle) return;
    
    const vehiclePosition = this.playerVehicle.getPosition();
    const vehicleRotation = this.playerVehicle.getRotation(); // This is an Euler
    
    // --- Mouse Pan Smoothing (for manual pan return) ---
    // This part handles the return-to-center after MOUSE release
    this.panAngleX += (this.panTargetAngleX - this.panAngleX) * this.panSmoothFactor;
    this.panAngleY += (this.panTargetAngleY - this.panAngleY) * this.panSmoothFactor;
    this.panAngleY = Math.max(this.minVerticalAngle, Math.min(this.maxVerticalAngle, this.panAngleY));

    // --- Turn Following Smoothing (for base camera orientation) ---
    // Set the target yaw directly to the vehicle's current yaw
    this.targetCameraYaw = vehicleRotation.y;
    
    // Calculate the shortest angle difference for smoothing
    let deltaYaw = this.targetCameraYaw - this.currentCameraYaw;
    while (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
    while (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
    
    // Smoothly update the camera's actual base yaw
    // A higher turnSmoothFactor makes it catch up faster after a turn completes
    this.currentCameraYaw += deltaYaw * this.turnSmoothFactor;
    // Keep the angle normalized (optional but good practice)
    this.currentCameraYaw = (this.currentCameraYaw + Math.PI * 3) % (Math.PI * 2) - Math.PI;

    // 1. Calculate base offset (distance behind the car)
    const baseOffset = new THREE.Vector3(0, 0, this.thirdPersonCamera.distance);

    // 2. Apply vertical rotation (manual pan)
    baseOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.panAngleY);
    
    // 3. Apply horizontal rotation: Use the SMOOTHED camera yaw first, then add the manual pan offset
    baseOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.currentCameraYaw + this.panAngleX);

    // 4. Calculate final camera position
    const cameraPosition = vehiclePosition.clone().add(baseOffset);
    
    // 5. Add height adjustment
    cameraPosition.y += this.thirdPersonCamera.height; 

    this.camera.position.copy(cameraPosition);

    // 6. Adjust LookAt Target: Look slightly ahead of the car in its smoothed direction
    const lookAheadDistance = 3.0; // How far ahead to look
    const lookTarget = vehiclePosition.clone();
    // Calculate forward vector based on the smoothed camera yaw
    const forwardVector = new THREE.Vector3(0, 0, -1);
    forwardVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.currentCameraYaw); 
    lookTarget.add(forwardVector.multiplyScalar(lookAheadDistance));
    // Also add a bit of height to the look target, roughly matching vehicle center
    lookTarget.y += 0.5; 

    this.camera.lookAt(lookTarget);
  }
  
  updateHUD() {
    // Update speed display
    if (this.playerVehicle) {
      const speed = this.playerVehicle.getSpeed();
      this.speedElement.textContent = `${Math.round(speed)} mph`;
    }
    
    // Update money display
    this.moneyElement.textContent = `$${this.money}`;
    
    // Update FPS display if enabled
    if (this.showFps && this.fpsElement) {
        this.fpsElement.textContent = `FPS: ${Math.round(this.fps)}`;
        this.fpsElement.style.display = 'block'; // Ensure it's visible
    } else if (this.fpsElement) {
        this.fpsElement.style.display = 'none'; // Hide if disabled
    }
  }
  
  updateTrafficLights(deltaTime) {
    this.trafficLightTimer += deltaTime;
    
    if (this.trafficLightTimer >= this.trafficLightInterval) {
      this.trafficLightTimer = 0;
      
      // Swap states
      const tempState = this.trafficLightStateNS;
      this.trafficLightStateNS = this.trafficLightStateEW;
      this.trafficLightStateEW = tempState;
      
      // Update all traffic light systems
      this.trafficLights.forEach(system => {
        system.setState(this.trafficLightStateNS, this.trafficLightStateEW);
      });
    }
  }
  
  updateVehicleReset(deltaTime) {
    if (!this.playerVehicle) return;

    if (this.playerVehicle.isOverturned()) {
      if (!this.isVehicleOverturned) {
        // Just overturned, start timer
        this.isVehicleOverturned = true;
        this.overturnTimer = 0;
        if (this.resetTimerElement) {
          this.resetTimerElement.style.display = 'block';
          this.resetTimerElement.textContent = `Resetting in 3...`;
        }
        console.log("Vehicle overturned, starting reset timer.");
      } else {
        // Already overturned, increment timer
        this.overturnTimer += deltaTime * 1000;
        const timeLeft = Math.ceil((this.resetDelay - this.overturnTimer) / 1000);
        if (this.resetTimerElement) {
          this.resetTimerElement.textContent = `Resetting in ${timeLeft}...`;
        }

        if (this.overturnTimer >= this.resetDelay) {
          // Timer finished, reset vehicle
          this.playerVehicle.resetState();
          this.isVehicleOverturned = false;
          this.overturnTimer = 0;
          if (this.resetTimerElement) {
            this.resetTimerElement.style.display = 'none';
          }
        }
      }
    } else {
      // Not overturned, reset state if it was previously
      if (this.isVehicleOverturned) {
        this.isVehicleOverturned = false;
        this.overturnTimer = 0;
        if (this.resetTimerElement) {
          this.resetTimerElement.style.display = 'none';
        }
        console.log("Vehicle righted itself, cancelling reset.");
      }
    }
  }
  
  updateNPCs(deltaTime) {
    // 1. Try spawning new NPCs
    this.npcSpawnTimer += deltaTime * 1000;
    if (this.npcSpawnTimer >= this.npcSpawnInterval && this.npcs.length < this.maxNPCs) {
        // console.log(`Attempting to spawn NPC. Current count: ${this.npcs.length}`); // Reduced logging
        this.npcSpawnTimer = 0;
        this.spawnNPC();
    }

    // 2. Update existing NPCs (movement, despawning, etc.)
    const playerPosition = this.playerVehicle.getPosition();
    // Get rotation as Euler, then convert to Quaternion
    const playerRotationEuler = this.playerVehicle.getRotation(); 
    const playerQuaternion = new CANNON.Quaternion();
    playerQuaternion.setFromEuler(playerRotationEuler.x, playerRotationEuler.y, playerRotationEuler.z, 'XYZ'); // Assuming XYZ order
    
    // Calculate player's forward direction
    const playerForward = new CANNON.Vec3(0, 0, -1); // Base forward vector
    playerQuaternion.vmult(playerForward, playerForward); // Rotate the vector by the quaternion
    
    playerForward.y = 0; // Project onto XZ plane
    playerForward.normalize();
    
    const despawnDistanceSq = 150 * 150; // Increased despawn radius slightly
    const behindDespawnDelay = 4.0; // Despawn after 4 seconds behind player
    const headTurnRadiusSq = 25 * 25; // NPCs look at player within 25 units
    const headTurnSpeed = 0.05; // Speed of head turning

    for (let i = this.npcs.length - 1; i >= 0; i--) {
        const npcGroup = this.npcs[i];
        
        if (!npcGroup || !npcGroup.userData || !npcGroup.userData.npc) {
            console.warn(`Skipping invalid NPC at index ${i}`);
            this.despawnNPC(i);
            continue;
        }
        const npcData = npcGroup.userData.npc;
        if (!npcData.body) {
            console.warn(`NPC at index ${i} has no physics body`);
            this.despawnNPC(i);
            continue;
        }
        const npcBody = npcData.body;
        const headMesh = npcData.headMesh; // Get the head mesh reference
        const leftLegPivot = npcData.leftLegPivot;
        const rightLegPivot = npcData.rightLegPivot;
        const leftArmPivot = npcData.leftArmPivot;
        const rightArmPivot = npcData.rightArmPivot;

        // Update mesh position from physics body
        npcGroup.position.copy(npcBody.position);
        npcGroup.quaternion.copy(npcBody.quaternion);

        // Determine default forward orientation for the head based on body
        const defaultHeadQuaternion = new THREE.Quaternion(); // Represents no rotation relative to body
        let targetHeadQuaternion = defaultHeadQuaternion.clone();

        // --- Head Turning Logic --- 
        // Convert player's THREE.Vector3 position to CANNON.Vec3 for subtraction
        const playerPositionCANNON = new CANNON.Vec3(playerPosition.x, playerPosition.y, playerPosition.z);
        const vectorToPlayer = playerPositionCANNON.vsub(npcBody.position);
        const distanceToPlayerSq = vectorToPlayer.lengthSquared();
        let shouldLookAtPlayer = false;

        if (distanceToPlayerSq <= headTurnRadiusSq && headMesh) { // Check headMesh exists
            shouldLookAtPlayer = true;
            // Calculate direction from head to player (use world positions)
            const headWorldPos = new THREE.Vector3();
            headMesh.getWorldPosition(headWorldPos); // Use headMesh world position
            // Use the original THREE.Vector3 position for Three.js calculations
            const playerWorldPos = playerPosition.clone(); 
            const lookAtDir = playerWorldPos.sub(headWorldPos).normalize();

            // Calculate target quaternion relative to the NPC's body rotation
            const bodyQuaternionInv = npcBody.quaternion.clone().conjugate(); // Inverse of body rotation
            const lookAtTarget = new CANNON.Vec3(lookAtDir.x, lookAtDir.y, lookAtDir.z);
            const relativeLookAt = new CANNON.Vec3();
            bodyQuaternionInv.vmult(lookAtTarget, relativeLookAt); // Transform lookAt vector to body's local space
            
            // Calculate the rotation needed to align local +Z with the HORIZONTAL component of the relative look direction
            const relativeLookAtTHREE = new THREE.Vector3(relativeLookAt.x, relativeLookAt.y, relativeLookAt.z);
            const horizontalLookDir = new THREE.Vector3(relativeLookAtTHREE.x, 0, relativeLookAtTHREE.z); // Project onto local XZ plane

            // Only calculate rotation if the horizontal direction is valid
            if (horizontalLookDir.lengthSq() > 0.001) { 
                horizontalLookDir.normalize();
                const defaultLocalForward = new THREE.Vector3(0, 0, 1);
                targetHeadQuaternion.setFromUnitVectors(defaultLocalForward, horizontalLookDir);
            } 
            // If player is directly above/below, targetHeadQuaternion remains default (looking straight ahead relative to body)
        }

        // Smoothly rotate the head towards the target (or back to default)
        if (headMesh) { // Check headMesh exists
            headMesh.quaternion.slerp(targetHeadQuaternion, headTurnSpeed); // Apply rotation to headMesh
        }
        // --- End Head Turning Logic ---

        // --- Walking Animation Logic ---
        const walkSpeedFactor = 15; // Adjust to match visual speed
        const walkAmplitude = Math.PI / 6; // Swing angle (30 degrees)
        const armAmplitude = Math.PI / 8; // Smaller swing for arms
        let currentVelocity = npcBody.velocity.length();
        let targetLeftLegAngle = 0;
        let targetRightLegAngle = 0;
        let targetLeftArmAngle = 0;
        let targetRightArmAngle = 0;
        const animationSmoothFactor = 0.15; // How quickly limbs move to target angle

        if (npcData.state === 'walking' && currentVelocity > 0.1 && leftLegPivot && rightLegPivot) { // Check velocity & PIVOT refs
            // Update walk phase based on speed and time
            npcData.walkPhase = (npcData.walkPhase + currentVelocity * walkSpeedFactor * deltaTime) % (Math.PI * 2);

            // Calculate TARGET leg/arm rotations 
            targetLeftLegAngle = Math.sin(npcData.walkPhase) * walkAmplitude;
            targetRightLegAngle = Math.sin(npcData.walkPhase + Math.PI) * walkAmplitude; // Opposite phase
            if (leftArmPivot && rightArmPivot) {
                targetLeftArmAngle = Math.sin(npcData.walkPhase + Math.PI) * armAmplitude;
                targetRightArmAngle = Math.sin(npcData.walkPhase) * armAmplitude;
            }
        } 
        // Else block is removed: if not walking, target angles remain 0
        
        // Always smoothly interpolate towards the target angles
        if (leftLegPivot && rightLegPivot) {
             leftLegPivot.rotation.x += (targetLeftLegAngle - leftLegPivot.rotation.x) * animationSmoothFactor;
             rightLegPivot.rotation.x += (targetRightLegAngle - rightLegPivot.rotation.x) * animationSmoothFactor;
        }
        if (leftArmPivot && rightArmPivot) {
             leftArmPivot.rotation.x += (targetLeftArmAngle - leftArmPivot.rotation.x) * animationSmoothFactor;
             rightArmPivot.rotation.x += (targetRightArmAngle - rightArmPivot.rotation.x) * animationSmoothFactor;
        }
        // --- End Walking Animation Logic ---

        // Simple walking behavior (existing code)
        if (npcData.state === 'walking') {
            const needsNewTarget = (!npcData.targetPosition || npcBody.position.distanceTo(npcData.targetPosition) < 1.0);
            // console.log(`NPC ${i} needs new target: ${needsNewTarget}`); // Debug log

            if (needsNewTarget) {
                // Find a new random target point on a sidewalk somewhat ahead of the NPC
                const npcForward = new CANNON.Vec3(0, 0, 1); // Base forward in local space
                npcBody.quaternion.vmult(npcForward, npcForward); // Rotate to world space
                npcForward.y = 0; // Project onto horizontal plane
                npcForward.normalize();
                
                const targetSearchRadius = 50; // Look further for next target
                const targetFovAngle = Math.PI; // Wide forward arc (180 degrees)
                
                npcData.targetPosition = this.findRandomSidewalkPointNear(
                    npcBody.position, 
                    targetSearchRadius, 
                    npcForward, 
                    targetFovAngle
                ); 
                console.log(`NPC ${i} setting new target:`, npcData.targetPosition); // Log the newly set target
            }

            if (npcData.targetPosition) {
                // console.log(`NPC ${i} moving towards:`, npcData.targetPosition, `Current pos:`, npcBody.position); // Debug log
                const direction = npcData.targetPosition.vsub(npcBody.position);
                direction.y = 0; 
                const length = direction.length();
                if (length > 0.1) {
                    direction.normalize();
                    // Set velocity directly instead of applying force
                    const desiredVelocity = direction.scale(npcData.speed); // Use speed directly from factory
                    npcBody.velocity.x = desiredVelocity.x;
                    npcBody.velocity.z = desiredVelocity.z;
                    // Keep Y velocity affected by gravity (or set to 0 if they shouldn't fall)
                    // npcBody.velocity.y = 0; // Uncomment this to prevent falling/bouncing
                    
                    // console.log(`NPC ${i} applying force:`, force, `Current velocity:`, npcBody.velocity); // Debug log
                    // npcBody.applyForce(force, npcBody.position);
                    
                    // --- Face movement direction (Rotation) ---
                    const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
                        new THREE.Vector3(0, 0, 1),
                        new THREE.Vector3(direction.x, 0, direction.z) // Use CANNON vector directly if needed
                    );
                    // Directly slerp the physics body quaternion
                    npcBody.quaternion.slerp(targetQuaternion, 0.1, npcBody.quaternion); 
                    // --- End Rotation ---
                 }
            }
        }

        // 3. Despawn logic (Distance and Behind Player)
        const vectorToNPC = npcBody.position.vsub(playerPosition);
        const distanceSquared = vectorToNPC.lengthSquared();
        
        // Despawn if too far
        if (distanceSquared > despawnDistanceSq) {
            // console.log(`Despawning NPC ${i} due to distance.`);
            this.despawnNPC(i);
            continue; // Skip further checks for this NPC
        }

        // Check if NPC is behind player
        vectorToNPC.y = 0;
        if (vectorToNPC.lengthSquared() > 0.1) {
             vectorToNPC.normalize();
             const dot = vectorToNPC.dot(playerForward);
             
             if (dot < -0.1) { // Check if significantly behind (dot product < 0)
                 // NPC is behind
                 if (npcData.timeBehindPlayer === undefined) {
                     npcData.timeBehindPlayer = 0;
                 }
                 npcData.timeBehindPlayer += deltaTime;
                 
                 if (npcData.timeBehindPlayer >= behindDespawnDelay) {
                    // console.log(`Despawning NPC ${i} for being behind player for too long.`);
                    this.despawnNPC(i);
                    continue; // Skip further checks
                 }
             } else {
                 // NPC is not behind (or very close to side), reset timer
                 npcData.timeBehindPlayer = 0;
             }
        } else {
             // NPC is very close to player, reset timer
             npcData.timeBehindPlayer = 0;
        }
    }
  }

  spawnNPC() {
      try {
          let spawnPoint = null;
          const playerPosition = this.playerVehicle ? this.playerVehicle.getPosition() : new CANNON.Vec3(0, 0.5, 0);
          // Get rotation as Euler, then convert to Quaternion
          const playerRotationEuler = this.playerVehicle ? this.playerVehicle.getRotation() : {x: 0, y: 0, z: 0}; // Default Euler
          const playerQuaternion = new CANNON.Quaternion();
          playerQuaternion.setFromEuler(playerRotationEuler.x, playerRotationEuler.y, playerRotationEuler.z, 'XYZ'); // Assuming XYZ order
          
          const spawnRadius = 150; 
          const minSpawnRadius = 20; // Don't spawn NPCs too close
          const fovAngle = Math.PI / 1.5; // Field of view angle (120 degrees)
          
          // Calculate player's forward direction (normalized)
          const playerForward = new CANNON.Vec3(0, 0, -1); // Assuming -Z is forward initially
          playerQuaternion.vmult(playerForward, playerForward); // Rotate the vector by the quaternion
          
          playerForward.y = 0; // Project onto XZ plane
          playerForward.normalize();

          // 1. Try finding a sidewalk point NEAR and AHEAD of the player
          console.log("Attempting findRandomSidewalkPointNear player (FOV check).", playerForward);
          spawnPoint = this.findRandomSidewalkPointNear(playerPosition, spawnRadius, playerForward, fovAngle);

          // Validate spawn point distance and FOV again (findRandomSidewalkPointNear might return a fallback)
          if (spawnPoint) {
              const directionToPoint = spawnPoint.vsub(playerPosition);
              const distanceSq = directionToPoint.lengthSquared();
              directionToPoint.y = 0;
              directionToPoint.normalize();
              const dot = directionToPoint.dot(playerForward);
              const angleToPoint = Math.acos(Math.max(-1, Math.min(1, dot)));
              
              // If the found point is too close, behind, outside FOV, or too far, try the fallback.
              if (distanceSq < minSpawnRadius * minSpawnRadius || angleToPoint > fovAngle / 2 || distanceSq > spawnRadius * spawnRadius ) {
                 console.log("Sidewalk point found by findRandomSidewalkPointNear was unsuitable (too close/far/behind). Resetting.");
                 spawnPoint = null; // Invalidate the point, force fallback
              }
          }

          // 2. If STILL no suitable point is found (e.g., map has no sidewalks, or none near/ahead),
          //    generate a random point AHEAD of the player as a last resort.
          if (!spawnPoint) {
              console.warn('Could not find suitable sidewalk point ahead, generating random point ahead.');
              let attempts = 0;
              do {
                   const angleOffset = (Math.random() - 0.5) * fovAngle; // Random angle within FOV
                   const forwardAngle = Math.atan2(playerForward.z, playerForward.x); // Base forward angle
                   const spawnAngle = forwardAngle + angleOffset;
                   const distance = minSpawnRadius + Math.random() * (spawnRadius - minSpawnRadius); // Random distance
                   
                   spawnPoint = new CANNON.Vec3(
                       playerPosition.x + Math.cos(spawnAngle) * distance,
                       playerPosition.y, // Keep Y level
                       playerPosition.z + Math.sin(spawnAngle) * distance
                   );
                   attempts++;
              } while (attempts < 10 && !spawnPoint); // Should generate a point quickly
              
              if (!spawnPoint) { // Absolute fallback if generation fails
                   console.error("Failed to generate even a fallback spawn point ahead. Spawning at default.")
                   spawnPoint = new CANNON.Vec3(playerPosition.x, playerPosition.y, playerPosition.z - minSpawnRadius);
              }
          }

          // Create the NPC using the factory
          const npc = this.npcFactory.createNPC(spawnPoint.x, spawnPoint.z);
          if (npc) {
              this.npcs.push(npc);
              console.log(`NPC created ahead of player! Total NPCs: ${this.npcs.length}`);
          } else {
               console.error('NPCFactory failed to create NPC object.');
          }
      } catch (error) {
          console.error('Error in spawnNPC:', error);
      }
  }

  despawnNPC(index) {
      // Check if the index is valid
      if (index < 0 || index >= this.npcs.length) {
          console.warn(`Invalid NPC index: ${index}`);
          return;
      }
      
      const npcGroup = this.npcs[index];
      if (!npcGroup) {
          console.warn(`No NPC found at index: ${index}`);
          this.npcs.splice(index, 1);
          return;
      }
      
      try {
          // Remove physics body
          if (npcGroup.userData && npcGroup.userData.npc && npcGroup.userData.npc.body) {
              this.physicsWorld.removeBody(npcGroup.userData.npc.body);
          } else if (npcGroup.userData && npcGroup.userData.physicsBody) {
              this.physicsWorld.removeBody(npcGroup.userData.physicsBody);
          }
          
          // Remove mesh from scene
          this.scene.remove(npcGroup);
          
      } catch (error) {
          console.error(`Error despawning NPC at index ${index}:`, error);
      } finally {
          // Always remove from our tracking array
          this.npcs.splice(index, 1);
      }
  }
  
  findRandomSidewalkPointNear(position, radius, playerForward = null, fovAngle = Math.PI) {
     if (!this.currentMap || typeof this.currentMap.getRandomSidewalkPoint !== 'function') {
          // Generate a random point near position, optionally respecting FOV
          let spawnPoint = null;
          for (let attempt = 0; attempt < 10; attempt++) {
              const angle = Math.random() * Math.PI * 2;
              const distance = Math.random() * radius;
              const potentialPoint = new CANNON.Vec3(
                  position.x + Math.cos(angle) * distance,
                  position.y,
                  position.z + Math.sin(angle) * distance
              );
              
              // Check FOV if playerForward is provided
              if (playerForward) {
                  const directionToPoint = potentialPoint.vsub(position); // Vector from player to point
                  directionToPoint.y = 0; // Ignore vertical difference
                  if (directionToPoint.lengthSquared() > 0.1) { // Avoid zero vector
                      directionToPoint.normalize();
                      const dot = directionToPoint.dot(playerForward);
                      const angleToPoint = Math.acos(Math.max(-1, Math.min(1, dot))); // Clamp dot product for acos
                      if (angleToPoint <= fovAngle / 2) {
                          spawnPoint = potentialPoint;
                          break; // Found a point within FOV
                      }
                  } else {
                       spawnPoint = potentialPoint; // Point is very close, consider it in FOV
                       break;
                  }
              } else {
                   spawnPoint = potentialPoint; // No FOV check needed
                   break;
              }
          }
          if (!spawnPoint) { // If no point in FOV found after attempts, generate one last time without FOV
              const angle = Math.random() * Math.PI * 2;
              const distance = Math.random() * radius;
              spawnPoint = new CANNON.Vec3(position.x + Math.cos(angle) * distance, position.y, position.z + Math.sin(angle) * distance);
          }
          return spawnPoint;
     }
     
     // Increase attempts to find a sidewalk point within the radius AND FOV
     for (let i = 0; i < 25; i++) { // Increased attempts to 25
          const point = this.currentMap.getRandomSidewalkPoint();
          if (point) {
              const dx = point.x - position.x;
              const dz = point.z - position.z;
              const distanceSq = dx * dx + dz * dz;
              
              // Check if within radius
              if (distanceSq <= radius * radius) {
                   // Check FOV if playerForward is provided
                   if (playerForward) {
                       const directionToPoint = point.vsub(position); // Vector from player to point
                       directionToPoint.y = 0; // Ignore vertical difference
                       if (directionToPoint.lengthSquared() > 0.1) { 
                           directionToPoint.normalize();
                           const dot = directionToPoint.dot(playerForward);
                           const angleToPoint = Math.acos(Math.max(-1, Math.min(1, dot))); // Clamp dot product
                           if (angleToPoint <= fovAngle / 2) {
                               return point; // Found a point within radius and FOV
                           }
                       } else {
                            return point; // Point very close, consider it in FOV
                       }
                   } else {
                       return point; // Found a point within radius, no FOV check needed
                   }
              }
          }
     }
     
     // If failed after increased attempts, return any random point or fallback (without FOV check for simplicity)
     const fallbackPoint = this.currentMap.getRandomSidewalkPoint();
     if (fallbackPoint) {
         console.log("findRandomSidewalkPointNear couldn't find a point nearby/ahead, returning any sidewalk point.");
         return fallbackPoint;
     } else {
         // Use the initial fallback logic (generates random point near player)
         console.warn("findRandomSidewalkPointNear found no sidewalk points, generating random point near player.");
         const angle = Math.random() * Math.PI * 2;
         const distance = Math.random() * radius;
         return new CANNON.Vec3(
             position.x + Math.cos(angle) * distance,
             position.y,
             position.z + Math.sin(angle) * distance
         );
     }
  }
  
  update(deltaTime) {
    // console.log(`Game.update - deltaTime: ${deltaTime.toFixed(4)}, isPlaying: ${this.isPlaying}`); // REMOVED Log start of update
    if (!this.isPlaying) return;
    // console.log("Game.update - Running update logic..."); // REMOVED Log after isPlaying check
    
    // Calculate FPS
    const now = performance.now();
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    this.frameCount++;
    if (now >= this.fpsTime + 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = now;
      if (this.showFps && this.fpsElement) {
        this.fpsElement.textContent = `FPS: ${this.fps}`;
      }
    }

    // Update physics world
    this.physicsWorld.step(1 / 60, delta, 3);
    
    // Update player vehicle
    this.playerVehicle.update(deltaTime, this.input);
    
    // Update traffic lights
    this.updateTrafficLights(deltaTime);
    
    // Update NPCs (Spawning and Movement)
    this.updateNPCs(deltaTime);

    // Update game world (e.g., environment animations)
    this.gameWorld.update(deltaTime);
    
    // Update camera
    this.updateCamera();
    
    // Update UI
    this.updateHUD();
    
    // Check for vehicle reset
    this.updateVehicleReset(deltaTime);
  }
  
  animate() {
    const clock = new THREE.Clock();
    
    const gameLoop = () => {
      requestAnimationFrame(gameLoop);
      
      const deltaTime = Math.min(clock.getDelta(), 0.1);
      
      if (this.isPlaying) {
        this.update(deltaTime);
      }
      
      this.renderer.render(this.scene, this.camera);
    };
    
    gameLoop();
  }
}

// Initialize the game when the DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new Game();
}); 
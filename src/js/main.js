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
    
    // Create player vehicle
    this.playerVehicle = new Vehicle(this.scene, this.physicsWorld, {
      position: new THREE.Vector3(0, 1, 0)
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
        console.log(`Attempting to spawn NPC. Current count: ${this.npcs.length}`); // Log spawn attempt
        this.npcSpawnTimer = 0;
        this.spawnNPC();
    }

    // 2. Update existing NPCs (movement, despawning, etc.)
    const playerPosition = this.playerVehicle.getPosition();
    const despawnDistanceSq = 100 * 100; // Despawn if further than 100 units away

    for (let i = this.npcs.length - 1; i >= 0; i--) {
        const npcGroup = this.npcs[i];
        
        // Skip if NPC is not properly initialized
        if (!npcGroup || !npcGroup.userData || !npcGroup.userData.npc) {
            console.warn(`Skipping invalid NPC at index ${i}`);
            this.despawnNPC(i);
            continue;
        }
        
        const npcData = npcGroup.userData.npc;
        
        // Skip if physics body is missing
        if (!npcData.body) {
            console.warn(`NPC at index ${i} has no physics body`);
            this.despawnNPC(i);
            continue;
        }
        
        const npcBody = npcData.body;

        // Update mesh position from physics body
        npcGroup.position.copy(npcBody.position);
        npcGroup.quaternion.copy(npcBody.quaternion);

        // Simple walking behavior: move towards target, set new target if reached
        if (npcData.state === 'walking') {
            if (!npcData.targetPosition || npcBody.position.distanceTo(npcData.targetPosition) < 1.0) {
                // Find a new random target point on a sidewalk near the NPC
                npcData.targetPosition = this.findRandomSidewalkPointNear(npcBody.position, 10);
            }

            if (npcData.targetPosition) {
                // CANNON.Vec3 doesn't have .clone(), so manually create a direction vector
                const direction = new CANNON.Vec3(
                    npcData.targetPosition.x - npcBody.position.x,
                    0, // Keep Y movement at zero to stay level
                    npcData.targetPosition.z - npcBody.position.z
                );
                
                // Normalize vector (convert to unit vector)
                const length = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
                if (length > 0) {
                    direction.x /= length;
                    direction.z /= length;
                
                    // Scale by speed
                    const force = new CANNON.Vec3(
                        direction.x * npcData.speed * 50,
                        0,
                        direction.z * npcData.speed * 50
                    );
                
                    // Apply force in the direction of the target
                    npcBody.applyForce(force, npcBody.position);
                    
                    // Make NPC face the direction of movement
                    const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
                        new THREE.Vector3(0, 0, 1), // Default forward direction
                        new THREE.Vector3(direction.x, 0, direction.z).normalize() // Target direction (horizontal plane)
                    );
                    npcBody.quaternion.slerp(targetQuaternion, 0.1, npcBody.quaternion); // Smooth rotation
                }
            }
        }

        // 3. Despawn NPCs far from the player
        const dx = npcBody.position.x - playerPosition.x;
        const dz = npcBody.position.z - playerPosition.z;
        const distanceSquared = dx * dx + dz * dz;
        
        if (distanceSquared > despawnDistanceSq) {
            this.despawnNPC(i);
        }
    }
  }

  spawnNPC() {
      try {
          // Get a random spawn point on a sidewalk from the map
          let spawnPoint = null;
          
          if (this.currentMap && typeof this.currentMap.getRandomSidewalkPoint === 'function') {
              spawnPoint = this.currentMap.getRandomSidewalkPoint();
          }
          
          // If no valid sidewalk point is found, use a fixed position near the center
          if (!spawnPoint) {
              console.log("Using fixed spawn point as no sidewalk point was found");
              
              // Get the road network dimensions from map, or use default values
              const mapWidth = this.currentMap && typeof this.currentMap.gridWidth === 'function' 
                  ? this.currentMap.gridWidth() * (this.currentMap.blockSize || 50) 
                  : 200;
              
              const mapHeight = this.currentMap && typeof this.currentMap.gridHeight === 'function'
                  ? this.currentMap.gridHeight() * (this.currentMap.blockSize || 50)
                  : 200;
              
              // Create fixed points around the center of the map, near roads
              const fixedPositions = [
                  new CANNON.Vec3(-20, 0.5, -20),  // Southwest of center
                  new CANNON.Vec3(20, 0.5, -20),   // Southeast of center
                  new CANNON.Vec3(-20, 0.5, 20),   // Northwest of center
                  new CANNON.Vec3(20, 0.5, 20),    // Northeast of center
                  new CANNON.Vec3(0, 0.5, 30),     // North of center
                  new CANNON.Vec3(0, 0.5, -30),    // South of center
                  new CANNON.Vec3(30, 0.5, 0),     // East of center
                  new CANNON.Vec3(-30, 0.5, 0)     // West of center
              ];
              
              // Choose a random position from the fixed positions
              spawnPoint = fixedPositions[Math.floor(Math.random() * fixedPositions.length)];
          }

          // Create the NPC using the factory
          const npc = this.npcFactory.createNPC(spawnPoint.x, spawnPoint.z);
          if (npc) {
              this.npcs.push(npc);
              console.log(`NPC created successfully! Total NPCs: ${this.npcs.length}`);
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
  
  findRandomSidewalkPointNear(position, radius) {
     if (!this.currentMap || typeof this.currentMap.getRandomSidewalkPoint !== 'function') {
          // If no sidewalk points are available, create a new random point near current position
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * radius;
          return new CANNON.Vec3(
              position.x + Math.cos(angle) * distance,
              position.y,
              position.z + Math.sin(angle) * distance
          );
     }
     
     // Simple approach: try a few times to find a point within the radius
     for (let i = 0; i < 5; i++) {
          const point = this.currentMap.getRandomSidewalkPoint();
          if (point) {
              // Calculate distance manually since CANNON.Vec3 doesn't have a distanceTo method
              const dx = point.x - position.x;
              const dz = point.z - position.z;
              const distance = Math.sqrt(dx * dx + dz * dz);
              
              if (distance <= radius) {
                  return point;
              }
          }
     }
     
     // If failed, just return any random point, or create a new one if nothing available
     const fallbackPoint = this.currentMap.getRandomSidewalkPoint();
     if (fallbackPoint) {
         return fallbackPoint;
     } else {
         // Create a random point near the current position as last resort
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
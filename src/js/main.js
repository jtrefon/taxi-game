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
    
    // FPS Calculation state
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fps = 0;
    
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
    this.trafficLightTimer += deltaTime * 1000; // Convert deltaTime (seconds) to milliseconds

    if (this.trafficLightTimer >= this.trafficLightInterval) {
      this.trafficLightTimer = 0;

      // Swap states
      const tempState = this.trafficLightStateNS;
      this.trafficLightStateNS = this.trafficLightStateEW;
      this.trafficLightStateEW = tempState;

      // Update light visuals
      this.trafficLights.forEach(lightBox => {
        // Safety Check: Ensure lightBox exists and has userData
        if (!lightBox || !lightBox.userData || typeof lightBox.userData.direction === 'undefined') {
          console.warn('Skipping invalid traffic lightBox:', lightBox);
          return; // Skip this lightBox if invalid
        }

        const direction = lightBox.userData.direction;
        const targetState = (direction === 'NS') ? this.trafficLightStateNS : this.trafficLightStateEW;

        // Safety Check: Ensure lightBox has children array
        if (!Array.isArray(lightBox.children)) {
          console.warn('Skipping lightBox with no children:', lightBox);
          return;
        }

        lightBox.children.forEach(lightMesh => {
          // Safety Check: Ensure lightMesh is a Mesh and has userData and material
          if (!lightMesh || !(lightMesh instanceof THREE.Mesh) || !lightMesh.userData || typeof lightMesh.userData.color === 'undefined' || !lightMesh.material) {
            // console.log('Skipping non-light mesh or invalid mesh in lightBox:', lightMesh); // Optional: log skipped children
            return; // Skip this child if it's not a valid light mesh
          }

          const color = lightMesh.userData.color;
          let newIntensity = lightMesh.material.emissiveIntensity; // Default to current

          if (color === 'yellow') {
            newIntensity = 0; // Keep yellow off for now
          } else if (color === targetState) {
            newIntensity = 1.0; // Turn target light ON
          } else {
            newIntensity = 0.05; // Keep other light dimly ON (or fully OFF: 0)
          }

          // Only update if intensity changed
          if (lightMesh.material.emissiveIntensity !== newIntensity) {
            lightMesh.material.emissiveIntensity = newIntensity;
            lightMesh.material.needsUpdate = true; // Ensure material change takes effect
          }
        });
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
  
  update(deltaTime) {
    // Update physics world
    this.physicsWorld.step(1 / 60, deltaTime, 3);
    
    // Update game world
    this.gameWorld.update(deltaTime);
    
    // Update player vehicle
    if (this.playerVehicle) {
      this.playerVehicle.update(deltaTime, this.input);
    }
    
    // Check and handle vehicle reset
    this.updateVehicleReset(deltaTime);
    
    // Update camera
    this.updateCamera();
    
    // Update traffic lights
    this.updateTrafficLights(deltaTime);
    
    // Update HUD
    this.updateHUD();
    
    // Calculate FPS
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.frameCount++;

    if (delta >= 1000) { // Update FPS counter every second
        this.fps = (this.frameCount * 1000) / delta;
        this.frameCount = 0;
        this.lastFrameTime = now;
    }
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
import * as THREE from './node_modules/three/build/three.module.js';
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from './node_modules/cannon-es/dist/cannon-es.js';

import { GameWorld } from './world/GameWorld.js';
import { Vehicle } from './entities/Vehicle.js';
import { CityGenerator } from './world/CityGenerator.js';
import { InputHandler } from './core/InputHandler.js';
import { MobileControls } from './ui/MobileControls.js';

class Game {
  constructor() {
    // DOM Elements
    this.loadingScreen = document.getElementById('loading-screen');
    this.speedElement = document.getElementById('speed');
    this.moneyElement = document.getElementById('money');
    
    // Game state
    this.money = 0;
    this.isPlaying = false;
    
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
    
    // Generate city - increase from 5x5 to 7x7 city blocks for more space
    this.cityGenerator = new CityGenerator(this.scene, this.physicsWorld);
    this.cityGenerator.generateCity(7, 7);
    
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
    const speed = this.playerVehicle ? Math.round(this.playerVehicle.getSpeed() * 2.237) : 0; // Convert to mph
    this.speedElement.textContent = `${speed} mph`;
    
    // Update money display
    this.moneyElement.textContent = `$${this.money}`;
  }
  
  update(deltaTime) {
    // Update physics
    this.physicsWorld.step(1/60, deltaTime, 3);
    
    // Update game world
    this.gameWorld.update(deltaTime);
    
    // Update player vehicle
    if (this.playerVehicle) {
      this.playerVehicle.update(deltaTime, this.input);
    }
    
    // Update camera
    this.updateCamera();
    
    // Update HUD
    this.updateHUD();
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
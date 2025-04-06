import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Strategy Pattern implementation for vehicle movement and physics
 */
export class Vehicle {
  constructor(scene, physicsWorld, options = {}) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    
    // Default options
    this.options = Object.assign({
      position: new THREE.Vector3(0, 1, 0),
      color: 0xffff00, // Yellow for taxi
      wheelRadius: 0.4,
      suspensionStiffness: 30,
      suspensionRestLength: 0.3,
      dampingRelaxation: 2.3,
      dampingCompression: 4.4,
      frictionSlip: 2.0,
      maxSuspensionForce: 100000,
      rollInfluence: 0.01,
      maxSpeed: 50,
      acceleration: 1000,
      braking: 10,
      turning: 0.5,
      // Add new progressive acceleration parameters
      throttleRate: 0.7,      // How quickly throttle increases (0-1 per second)
      throttleReleaseRate: 1.5, // How quickly throttle decreases when key released
      brakeRate: 3.0,         // How quickly braking force increases
      emergencyBrakeForce: 100,
    }, options);
    
    this.wheels = [];
    this.wheelBodies = [];
    this.vehicle = null;
    this.speed = 0;
    
    // Add throttle and brake tracking
    this.currentThrottle = 0; // 0 to 1 (percentage of max force)
    this.currentBrake = 0;    // 0 to 1 (percentage of max brake force)
    this.brakeDirection = 0;  // -1 for reverse braking, 1 for forward braking
    
    this.init();
  }
  
  init() {
    this.createChassis();
    this.setupVehicle();
    this.createWheels();
  }
  
  createChassis() {
    // Vehicle body dimensions
    const width = 2.2;
    const height = 0.9;
    const length = 4.2;
    
    // Create the chassis body
    const chassisShape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, length * 0.5));
    this.chassisBody = new CANNON.Body({
      mass: 1500,
      position: new CANNON.Vec3(
        this.options.position.x,
        this.options.position.y,
        this.options.position.z
      ),
      material: new CANNON.Material('vehicle')
    });
    this.chassisBody.addShape(chassisShape);
    this.physicsWorld.addBody(this.chassisBody);
    
    // Visual representation
    const chassisGeometry = new THREE.BoxGeometry(width, height, length);
    const chassisMaterial = new THREE.MeshStandardMaterial({ 
      color: this.options.color,
      roughness: 0.5,
      metalness: 0.7
    });
    
    this.chassisMesh = new THREE.Mesh(chassisGeometry, chassisMaterial);
    this.chassisMesh.castShadow = true;
    this.chassisMesh.receiveShadow = true;
    this.scene.add(this.chassisMesh);
    
    // Add taxi top sign
    this.addTaxiSign();
    
    // Add windows and other details
    this.addVehicleDetails(width, height, length);
  }
  
  addTaxiSign() {
    const signGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.4);
    const signMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      emissive: 0x555555
    });
    
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 0.6, 0);
    this.chassisMesh.add(sign);
    
    // Add "TAXI" text
    const textGeometry = new THREE.BoxGeometry(0.6, 0.2, 0.05);
    const textMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    
    const textFront = new THREE.Mesh(textGeometry, textMaterial);
    textFront.position.set(0, 0, 0.23);
    sign.add(textFront);
    
    const textBack = new THREE.Mesh(textGeometry, textMaterial);
    textBack.position.set(0, 0, -0.23);
    sign.add(textBack);
  }
  
  addVehicleDetails(width, height, length) {
    // Add wheels visuals (separate from physics wheels)
    const wheelGeometry = new THREE.CylinderGeometry(
      this.options.wheelRadius, 
      this.options.wheelRadius, 
      0.3, 
      16
    );
    
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.7
    });
    
    // Add cabin (windows)
    const cabinGeometry = new THREE.BoxGeometry(width * 0.9, height * 0.8, length * 0.5);
    const cabinMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.7,
      roughness: 0.2,
      transparent: true,
      opacity: 0.7
    });
    
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, height * 0.8, -length * 0.05);
    this.chassisMesh.add(cabin);
    
    // Add headlights
    const headlightGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const headlightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5 
    });
    
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(-width * 0.4, -height * 0.2, -length * 0.5 + 0.1);
    this.chassisMesh.add(leftHeadlight);
    
    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(width * 0.4, -height * 0.2, -length * 0.5 + 0.1);
    this.chassisMesh.add(rightHeadlight);
    
    // Add taillights
    const taillightMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5 
    });
    
    const leftTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
    leftTaillight.position.set(-width * 0.4, -height * 0.2, length * 0.5 - 0.1);
    this.chassisMesh.add(leftTaillight);
    
    const rightTaillight = new THREE.Mesh(headlightGeometry, taillightMaterial);
    rightTaillight.position.set(width * 0.4, -height * 0.2, length * 0.5 - 0.1);
    this.chassisMesh.add(rightTaillight);
  }
  
  createWheels() {
    const wheelOptions = {
      radius: this.options.wheelRadius,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: this.options.suspensionStiffness,
      suspensionRestLength: this.options.suspensionRestLength,
      frictionSlip: this.options.frictionSlip,
      dampingRelaxation: this.options.dampingRelaxation,
      dampingCompression: this.options.dampingCompression,
      maxSuspensionForce: this.options.maxSuspensionForce,
      rollInfluence: this.options.rollInfluence,
      axleLocal: new CANNON.Vec3(1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true
    };

    // Wheel positions
    const width = 1.8;
    const height = -0.3;
    const front = -1.2;
    const back = 1.0;
    
    wheelOptions.chassisConnectionPointLocal.set(width / 2, height, front);
    this.vehicle.addWheel(wheelOptions);
    
    wheelOptions.chassisConnectionPointLocal.set(-width / 2, height, front);
    this.vehicle.addWheel(wheelOptions);
    
    wheelOptions.chassisConnectionPointLocal.set(width / 2, height, back);
    this.vehicle.addWheel(wheelOptions);
    
    wheelOptions.chassisConnectionPointLocal.set(-width / 2, height, back);
    this.vehicle.addWheel(wheelOptions);
    
    // Create wheel visuals
    // Remove the redundant physics wheel bodies array
    // this.wheelBodies = []; 
    
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.7
    });
    
    for (let i = 0; i < 4; i++) {
      const wheelInfo = this.vehicle.wheelInfos[i];
      
      // Create wheel geometry and mesh
      const wheelGeometry = new THREE.CylinderGeometry(
        wheelInfo.radius, 
        wheelInfo.radius, 
        0.3, 
        16
      );
      
      // Rotate the wheel geometry so its central axis aligns with the X-axis (right direction)
      // This ensures it spins correctly when the vehicle transform rotates around local X.
      wheelGeometry.rotateZ(Math.PI / 2);
      
      const wheelMesh = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheelMesh.castShadow = true;
      this.scene.add(wheelMesh);
      this.wheels.push(wheelMesh);
      
      // --- Remove the creation of separate, unused physics bodies ---
      /*
      // Create wheel physics body
      const wheelShape = new CANNON.Cylinder(
        wheelInfo.radius,
        wheelInfo.radius,
        0.3,
        20
      );
      
      const wheelBody = new CANNON.Body({
        mass: 1,
        material: new CANNON.Material('wheel')
      });
      
      const quaternion = new CANNON.Quaternion();
      quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
      wheelBody.addShape(wheelShape, new CANNON.Vec3(), quaternion);
      this.wheelBodies.push(wheelBody);
      */
      // --- End of removed code ---
    }
  }
  
  setupVehicle() {
    // Create the vehicle
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0, // x
      indexUpAxis: 1,    // y
      indexForwardAxis: 2 // z
    });
    
    // Improve chassis physics for better stability - Reduce damping
    this.chassisBody.angularDamping = 0.05; // Reduced from 0.1
    this.chassisBody.linearDamping = 0.01;  // Reduced from 0.05
    
    // Add vehicle to the world
    this.vehicle.addToWorld(this.physicsWorld);
  }
  
  update(deltaTime, input) {
    // Update wheel positions AND rotations
    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      this.vehicle.updateWheelTransform(i);
      const transform = this.vehicle.wheelInfos[i].worldTransform;
      const visualWheel = this.wheels[i];
      
      // Copy position
      visualWheel.position.copy(transform.position);
      
      // Copy rotation (Quaternion)
      visualWheel.quaternion.copy(transform.quaternion);
    }
    
    // Update chassis position and rotation
    this.chassisMesh.position.copy(
      new THREE.Vector3(
        this.chassisBody.position.x,
        this.chassisBody.position.y,
        this.chassisBody.position.z
      )
    );
    
    this.chassisMesh.quaternion.copy(
      new THREE.Quaternion(
        this.chassisBody.quaternion.x,
        this.chassisBody.quaternion.y,
        this.chassisBody.quaternion.z,
        this.chassisBody.quaternion.w
      )
    );
    
    // Handle inputs
    this.handleMovement(input, deltaTime);
    
    // Calculate speed
    const velocity = this.chassisBody.velocity;
    this.speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
  }
  
  handleMovement(input, deltaTime) {
    const maxSteerVal = 0.5;
    const testForce = 5000; // Use a large constant force for testing
    const emergencyBrakeForce = this.options.emergencyBrakeForce;
    
    const direction = input.getMovementDirection();
    
    // Apply turning left/right (Keep this)
    if (direction.x !== 0) {
      const steerVal = -direction.x * maxSteerVal;
      this.vehicle.setSteeringValue(steerVal, 0);
      this.vehicle.setSteeringValue(steerVal, 1);
    } else {
      this.vehicle.setSteeringValue(0, 0);
      this.vehicle.setSteeringValue(0, 1);
    }
    
    // --- Simplified Force/Brake Logic for Debugging ---
    let forwardForce = 0;
    let currentBrakeForce = 0;
    
    if (input.isBraking()) {
      // Apply emergency brake
      currentBrakeForce = emergencyBrakeForce;
      this.currentThrottle = 0; 
      this.currentBrake = 1; 
    } else if (direction.z < 0) { // W key pressed (Forward)
      forwardForce = testForce;
      this.currentThrottle = 1;
      this.currentBrake = 0; 
    } else if (direction.z > 0) { // S key pressed (Backward/Brake)
      // Apply backward force
      forwardForce = -testForce;
      this.currentThrottle = -1; 
      this.currentBrake = 0; 
    } else {
      // No input 
      this.currentThrottle = 0;
      this.currentBrake = 0;
    }
    
    // Apply calculated forces/brakes to all wheels
    for (let i = 0; i < 4; i++) {
        this.vehicle.applyEngineForce(forwardForce, i);
        this.vehicle.setBrake(currentBrakeForce, i);
    }
  }
  
  getPosition() {
    return new THREE.Vector3(
      this.chassisBody.position.x,
      this.chassisBody.position.y,
      this.chassisBody.position.z
    );
  }
  
  getRotation() {
    return new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(
        this.chassisBody.quaternion.x,
        this.chassisBody.quaternion.y,
        this.chassisBody.quaternion.z,
        this.chassisBody.quaternion.w
      )
    );
  }
  
  getSpeed() {
    return this.speed;
  }
} 
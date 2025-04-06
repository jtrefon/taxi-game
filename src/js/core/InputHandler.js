/**
 * Handles all user input for controlling the game
 */
export class InputHandler {
  constructor() {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      brake: false
    };
    
    this.mouse = {
      x: 0,
      y: 0,
      isDown: false
    };
    
    this.initKeyboardEvents();
    this.initMouseEvents();
  }
  
  initKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      // Prevent default behavior for game control keys to avoid scrolling
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      this.handleKeyDown(e.code);
    });
    
    window.addEventListener('keyup', (e) => {
      this.handleKeyUp(e.code);
    });
  }
  
  handleKeyDown(code) {
    switch(code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'Space':
        this.keys.brake = true;
        break;
    }
  }
  
  handleKeyUp(code) {
    switch(code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.brake = false;
        break;
    }
  }
  
  initMouseEvents() {
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    
    window.addEventListener('mousedown', () => {
      this.mouse.isDown = true;
    });
    
    window.addEventListener('mouseup', () => {
      this.mouse.isDown = false;
    });
  }
  
  getMovementDirection() {
    const direction = {
      x: 0,
      y: 0,
      z: 0
    };
    
    // In Three.js/Cannon.js:
    // Forward is typically -Z direction
    // However, our vehicle setup appears to expect +Z as forward
    
    // Adjust this mapping to match our vehicle's actual forward direction
    if (this.keys.forward) direction.z -= 1; // W key = negative Z
    if (this.keys.backward) direction.z += 1; // S key = positive Z
    
    // Map left/right (A/D) to the x-axis
    if (this.keys.left) direction.x -= 1;
    if (this.keys.right) direction.x += 1;
    
    return direction;
  }
  
  isBraking() {
    return this.keys.brake;
  }
} 
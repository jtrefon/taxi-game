import { DeviceDetector } from '../utils/DeviceDetector.js';

export class MobileControls {
  constructor(inputHandler) {
    this.inputHandler = inputHandler;
    this.isActive = false;
    this.buttons = {};
    this.init();
  }

  init() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'mobile-controls';
    
    // Create buttons with SVG icons
    this.createButton('up', this.getArrowSVG('up'), 'control-up');
    this.createButton('down', this.getArrowSVG('down'), 'control-down');
    this.createButton('left', this.getArrowSVG('left'), 'control-left');
    this.createButton('right', this.getArrowSVG('right'), 'control-right');
    this.createButton('brake', this.getBrakeSVG(), 'control-brake');
    
    // Add to document
    document.body.appendChild(this.container);
    
    // Check if we should show controls
    this.checkDevice();
    
    // Listen for resize events to update visibility
    window.addEventListener('resize', () => this.checkDevice());
  }

  createButton(id, svgContent, className) {
    const button = document.createElement('div');
    button.className = `control-button ${className}`;
    button.innerHTML = svgContent;
    
    // Touch events
    button.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleTouchStart(id);
    });
    
    button.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.handleTouchEnd(id);
    });
    
    // Mouse events for testing on desktop
    button.addEventListener('mousedown', () => this.handleTouchStart(id));
    button.addEventListener('mouseup', () => this.handleTouchEnd(id));
    button.addEventListener('mouseleave', () => this.handleTouchEnd(id));
    
    this.buttons[id] = button;
    this.container.appendChild(button);
  }

  handleTouchStart(id) {
    switch(id) {
      case 'up':
        this.inputHandler.keys.forward = true;
        break;
      case 'down':
        this.inputHandler.keys.backward = true;
        break;
      case 'left':
        this.inputHandler.keys.left = true;
        break;
      case 'right':
        this.inputHandler.keys.right = true;
        break;
      case 'brake':
        this.inputHandler.keys.brake = true;
        break;
    }
  }

  handleTouchEnd(id) {
    switch(id) {
      case 'up':
        this.inputHandler.keys.forward = false;
        break;
      case 'down':
        this.inputHandler.keys.backward = false;
        break;
      case 'left':
        this.inputHandler.keys.left = false;
        break;
      case 'right':
        this.inputHandler.keys.right = false;
        break;
      case 'brake':
        this.inputHandler.keys.brake = false;
        break;
    }
  }

  checkDevice() {
    const shouldShow = DeviceDetector.isMobileDevice() || DeviceDetector.hasTouchCapability();
    this.container.classList.toggle('active', shouldShow);
    this.isActive = shouldShow;
  }

  getArrowSVG(direction) {
    const arrows = {
      up: 'M10 20l10-10 10 10',
      down: 'M10 10l10 10 10-10',
      left: 'M20 10l-10 10 10 10',
      right: 'M10 10l10 10-10 10'
    };
    
    return `<svg viewBox="0 0 40 40">
      <path d="${arrows[direction]}" stroke="white" stroke-width="3" fill="none"/>
    </svg>`;
  }

  getBrakeSVG() {
    return `<svg viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="15" stroke="white" stroke-width="3" fill="none"/>
      <text x="20" y="25" text-anchor="middle" fill="white" font-size="16">B</text>
    </svg>`;
  }
} 
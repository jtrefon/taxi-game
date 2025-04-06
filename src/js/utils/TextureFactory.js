import * as THREE from '../../libs/three.module.js';

/**
 * Factory Pattern implementation for creating reusable building facade textures
 * Reduces memory usage by generating a set of procedural textures that can be reused
 * across buildings, providing visual variety without increasing polygon count.
 */
export class TextureFactory {
  constructor() {
    this.textureCache = new Map();
    this.lastUsedIndex = new Map();
  }

  /**
   * Initialize textures for common types
   * @param {number} count - Number of unique textures to generate per type
   * @param {number} resolution - Texture resolution 
   */
  initTextures(count = 8, resolution = 512) {
    this.textureCache = new Map();
    
    // Create building facade textures
    this.createGlassFacades(count, resolution);
    this.createOfficeFacades(count, resolution);
    this.createResidentialFacades(count, resolution);
    
    // Create environment textures
    this.createRoadTextures(count, resolution);
    this.createSidewalkTexture(resolution);
    this.createTreeTextures(count, resolution);
    this.createGrassTextures(count, resolution);
    
    // Initialize bark textures for all tree types
    this.createBarkTexture('pine', resolution);
    this.createBarkTexture('oak', resolution);
    this.createBarkTexture('birch', resolution);
    this.createBarkTexture('tropical', resolution);
    
    console.log(`Initialized ${this.textureCache.size} textures`);
  }

  /**
   * Get a facade texture, ensuring it's different from the last used at this position
   * @param {string} type - Type of facade texture ('glass', 'office', 'residential')
   * @param {string} positionKey - Unique key for building position to avoid duplicates
   * @returns {THREE.Texture} A texture for the facade
   */
  getFacadeTexture(type = 'glass', positionKey = '') {
    const availableTextures = Array.from(this.textureCache.keys())
      .filter(key => key.startsWith(type));
    
    if (availableTextures.length === 0) {
      console.warn('No textures available for type:', type);
      return null;
    }
    
    // Get last used index for this position
    const lastIndex = this.lastUsedIndex.get(positionKey) || -1;
    
    // Choose a different index
    let newIndex;
    if (availableTextures.length === 1) {
      newIndex = 0;
    } else {
      do {
        newIndex = Math.floor(Math.random() * availableTextures.length);
      } while (newIndex === lastIndex && availableTextures.length > 1);
    }
    
    // Store this index as the last used for this position
    this.lastUsedIndex.set(positionKey, newIndex);
    
    return this.textureCache.get(availableTextures[newIndex]);
  }

  /**
   * Get environment texture for different parts of the city environment
   * @param {string} type - Type of environment texture (e.g., 'road', 'sidewalk', 'grass')
   * @param {string} [variant] - Optional variant of the texture
   * @returns {THREE.Texture} The requested texture
   */
  getEnvironmentTexture(type, variant = null) {
    const cacheKey = `env_${type}_${variant || 'default'}`;
    
    // Check if we already have this texture cached
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey);
    }
    
    // Otherwise create the appropriate texture
    let texture;
    
    switch (type) {
      case 'road':
        texture = this.createRoadTexture();
        break;
      case 'asphalt':
        texture = this.createAsphaltTexture();
        break;
      case 'sidewalk':
        texture = this.createSidewalkTexture();
        break;
      case 'grass':
        texture = this.createGrassTexture();
        break;
      case 'tree':
        texture = this.createTreeFoliageTexture(variant || 'oak');
        break;
      default:
        texture = this.createDefaultTexture();
    }
    
    // Cache the texture for future use
    if (texture) {
      this.textureCache.set(cacheKey, texture);
    }
    
    return texture;
  }

  /**
   * Create a realistic asphalt texture for roads
   * @returns {THREE.Texture} The asphalt texture
   */
  createAsphaltTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base dark asphalt color
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add texture and noise to the asphalt
    for (let i = 0; i < 10000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2 + 0.5;
      
      // Small noise particles with varying shades of gray
      const grayValue = Math.floor(Math.random() * 25) + 20; // 20-45 (darker grays)
      const colorValue = grayValue.toString(16).padStart(2, '0');
      ctx.fillStyle = `#${colorValue}${colorValue}${colorValue}`;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add some larger aggregate texture
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 4 + 1;
      
      // Larger aggregate with slightly lighter shades
      const grayValue = Math.floor(Math.random() * 20) + 40; // 40-60 (medium grays)
      const colorValue = grayValue.toString(16).padStart(2, '0');
      ctx.fillStyle = `#${colorValue}${colorValue}${colorValue}`;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add some cracks and imperfections
    for (let i = 0; i < 20; i++) {
      const x1 = Math.random() * canvas.width;
      const y1 = Math.random() * canvas.height;
      const x2 = x1 + (Math.random() * 100 - 50);
      const y2 = y1 + (Math.random() * 100 - 50);
      
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = Math.random() * 2 + 0.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Create glass building facades with window patterns
   * @param {number} count - Number of unique textures to generate
   * @param {number} resolution - Texture resolution (width/height)
   */
  createGlassFacades(count, resolution) {
    for (let i = 0; i < count; i++) {
      const textureKey = `glass_${i}`;
      const canvas = document.createElement('canvas');
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext('2d');
      
      // Base color - blue to blue-green tint
      const baseHue = 200 + Math.random() * 20;
      ctx.fillStyle = `hsl(${baseHue}, 50%, 60%)`;
      ctx.fillRect(0, 0, resolution, resolution);
      
      // Window parameters
      const windowRowCount = 10 + Math.floor(Math.random() * 6); // 10-15 rows
      const windowColCount = 8 + Math.floor(Math.random() * 5);  // 8-12 columns
      const windowWidth = resolution / windowColCount;
      const windowHeight = resolution / windowRowCount;
      
      // Glass panel pattern
      ctx.fillStyle = `hsla(${baseHue}, 70%, 70%, 0.7)`;
      
      for (let row = 0; row < windowRowCount; row++) {
        for (let col = 0; col < windowColCount; col++) {
          // Panel with reflections
          ctx.fillStyle = `hsla(${baseHue}, 70%, ${40 + Math.random() * 40}%, 0.7)`;
          
          // Panel spacing
          const spacing = resolution * 0.005;
          ctx.fillRect(
            col * windowWidth + spacing,
            row * windowHeight + spacing,
            windowWidth - spacing * 2,
            windowHeight - spacing * 2
          );
          
          // Add random reflections
          if (Math.random() < 0.3) {
            ctx.fillStyle = `hsla(${baseHue - 10}, 40%, 90%, 0.3)`;
            const reflectWidth = windowWidth * 0.3;
            const reflectHeight = windowHeight * 0.5;
            ctx.fillRect(
              col * windowWidth + spacing + windowWidth * 0.1,
              row * windowHeight + spacing + windowHeight * 0.1,
              reflectWidth,
              reflectHeight
            );
          }
        }
      }
      
      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      
      this.textureCache.set(textureKey, texture);
    }
  }

  /**
   * Create office building facades with structured windows
   * @param {number} count - Number of unique textures to generate
   * @param {number} resolution - Texture resolution (width/height)
   */
  createOfficeFacades(count, resolution) {
    for (let i = 0; i < count; i++) {
      const textureKey = `office_${i}`;
      const canvas = document.createElement('canvas');
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext('2d');
      
      // Base color - gray to brown tint
      const baseColor = 170 + Math.floor(Math.random() * 50);
      ctx.fillStyle = `rgb(${baseColor},${baseColor},${baseColor})`;
      ctx.fillRect(0, 0, resolution, resolution);
      
      // Office building pattern features
      const floorCount = 6 + Math.floor(Math.random() * 4); // 6-9 floors
      const floorHeight = resolution / floorCount;
      
      // Add floors with windows
      for (let floor = 0; floor < floorCount; floor++) {
        // Floor divider
        ctx.fillStyle = `rgb(120,120,120)`;
        ctx.fillRect(0, floor * floorHeight, resolution, 2);
        
        // Windows per floor
        const windowsPerFloor = 4 + Math.floor(Math.random() * 5); // 4-8 windows
        const windowWidth = (resolution / windowsPerFloor) * 0.7; // 70% of available width
        const windowSpacing = (resolution - (windowWidth * windowsPerFloor)) / (windowsPerFloor + 1);
        
        for (let w = 0; w < windowsPerFloor; w++) {
          const windowX = windowSpacing + w * (windowWidth + windowSpacing);
          const windowY = floor * floorHeight + floorHeight * 0.2;
          const windowHeightValue = floorHeight * 0.6;
          
          // Window frame
          ctx.fillStyle = `rgb(40,40,40)`;
          ctx.fillRect(windowX, windowY, windowWidth, windowHeightValue);
          
          // Window glass
          const brightness = 150 + Math.floor(Math.random() * 80);
          const isLit = Math.random() < 0.4; // 40% chance window is lit
          
          if (isLit) {
            ctx.fillStyle = `rgba(255,255,170,0.8)`;
          } else {
            ctx.fillStyle = `rgba(${brightness},${brightness},${brightness},0.9)`;
          }
          
          // Glass pane inside frame
          const frameWidth = 2;
          ctx.fillRect(
            windowX + frameWidth, 
            windowY + frameWidth, 
            windowWidth - frameWidth * 2, 
            windowHeightValue - frameWidth * 2
          );
          
          // Add window panes - horizontal divider
          ctx.fillStyle = `rgb(40,40,40)`;
          ctx.fillRect(
            windowX, 
            windowY + windowHeightValue / 2, 
            windowWidth, 
            frameWidth
          );
          
          // Add window panes - vertical divider
          ctx.fillRect(
            windowX + windowWidth / 2, 
            windowY, 
            frameWidth, 
            windowHeightValue
          );
        }
      }
      
      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      
      this.textureCache.set(textureKey, texture);
    }
  }

  /**
   * Create residential building facades with apartment patterns
   * @param {number} count - Number of unique textures to generate
   * @param {number} resolution - Texture resolution (width/height)
   */
  createResidentialFacades(count, resolution) {
    for (let i = 0; i < count; i++) {
      const textureKey = `residential_${i}`;
      const canvas = document.createElement('canvas');
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext('2d');
      
      // Base wall color - warm tones
      const colorValue = 180 + Math.floor(Math.random() * 50);
      const redOffset = Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgb(${colorValue + redOffset},${colorValue},${colorValue - 20})`;
      ctx.fillRect(0, 0, resolution, resolution);
      
      // Add brick texture pattern
      if (Math.random() < 0.5) {
        // Brick texture
        const brickColors = [
          `rgb(${colorValue + redOffset - 10},${colorValue - 10},${colorValue - 30})`,
          `rgb(${colorValue + redOffset + 10},${colorValue + 10},${colorValue - 10})`
        ];
        
        const brickHeight = resolution / 50;
        const brickWidth = resolution / 25;
        let offsetRow = 0;
        
        for (let y = 0; y < resolution; y += brickHeight) {
          offsetRow = (offsetRow + 1) % 2;
          
          for (let x = 0; x < resolution; x += brickWidth) {
            // Offset every other row for brick pattern
            const drawX = x + (offsetRow * brickWidth / 2);
            if (drawX + brickWidth <= resolution) {
              ctx.fillStyle = brickColors[Math.floor(Math.random() * brickColors.length)];
              ctx.fillRect(drawX, y, brickWidth - 1, brickHeight - 1);
            }
          }
        }
      }
      
      // Apartment pattern
      const apartmentRows = 6 + Math.floor(Math.random() * 3); // 6-8 rows
      const apartmentCols = 4 + Math.floor(Math.random() * 3); // 4-6 columns
      
      const apartmentWidth = resolution / apartmentCols;
      const apartmentHeight = resolution / apartmentRows;
      
      for (let row = 0; row < apartmentRows; row++) {
        for (let col = 0; col < apartmentCols; col++) {
          // Apartment dividers
          ctx.fillStyle = 'rgba(40,40,40,0.5)';
          ctx.fillRect(col * apartmentWidth, row * apartmentHeight, apartmentWidth, 1);
          ctx.fillRect(col * apartmentWidth, row * apartmentHeight, 1, apartmentHeight);
          
          // Apartment windows
          const windowMargin = apartmentWidth * 0.15;
          const windowWidth = apartmentWidth - windowMargin * 2;
          const windowHeight = apartmentHeight * 0.6;
          
          // Random window styles and customizations
          const hasBalcony = Math.random() < 0.3; // 30% chance of balcony
          
          // Window frame
          ctx.fillStyle = 'rgb(60,60,60)';
          ctx.fillRect(
            col * apartmentWidth + windowMargin, 
            row * apartmentHeight + windowMargin, 
            windowWidth, 
            windowHeight
          );
          
          // Window glass
          const isLit = Math.random() < 0.3; // 30% chance window is lit
          if (isLit) {
            ctx.fillStyle = 'rgba(255,255,170,0.8)';
          } else {
            const brightness = 150 + Math.floor(Math.random() * 50);
            ctx.fillStyle = `rgba(${brightness},${brightness},${brightness},0.7)`;
          }
          
          // Glass pane inside frame
          const frameWidth = 2;
          ctx.fillRect(
            col * apartmentWidth + windowMargin + frameWidth, 
            row * apartmentHeight + windowMargin + frameWidth, 
            windowWidth - frameWidth * 2, 
            windowHeight - frameWidth * 2
          );
          
          // Optional balcony
          if (hasBalcony) {
            ctx.fillStyle = 'rgba(40,40,40,0.7)';
            ctx.fillRect(
              col * apartmentWidth + windowMargin - 5, 
              row * apartmentHeight + windowMargin + windowHeight, 
              windowWidth + 10, 
              5
            );
            
            // Balcony railing
            ctx.strokeStyle = 'rgba(80,80,80,0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            // Vertical rails
            const railSpacing = windowWidth / 8;
            for (let r = 0; r <= windowWidth; r += railSpacing) {
              ctx.moveTo(col * apartmentWidth + windowMargin + r, row * apartmentHeight + windowMargin + windowHeight + 5);
              ctx.lineTo(col * apartmentWidth + windowMargin + r, row * apartmentHeight + windowMargin + windowHeight + 15);
            }
            
            // Horizontal top rail
            ctx.moveTo(col * apartmentWidth + windowMargin - 5, row * apartmentHeight + windowMargin + windowHeight + 5);
            ctx.lineTo(col * apartmentWidth + windowMargin + windowWidth + 5, row * apartmentHeight + windowMargin + windowHeight + 5);
            
            // Horizontal bottom rail
            ctx.moveTo(col * apartmentWidth + windowMargin - 5, row * apartmentHeight + windowMargin + windowHeight + 15);
            ctx.lineTo(col * apartmentWidth + windowMargin + windowWidth + 5, row * apartmentHeight + windowMargin + windowHeight + 15);
            
            ctx.stroke();
          }
        }
      }
      
      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      
      this.textureCache.set(textureKey, texture);
    }
  }

  /**
   * Create road textures with lanes, markings, and variations
   * @param {number} count - Number of unique textures to generate
   * @param {number} resolution - Texture resolution (width/height)
   */
  createRoadTextures(count, resolution) {
    const variants = ['basic', 'with_lines', 'with_crossing'];
    
    for (let i = 0; i < count; i++) {
      const variant = variants[i % variants.length];
      const textureKey = `road_${variant}`;
      const canvas = document.createElement('canvas');
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext('2d');
      
      // Base asphalt color with slight variations
      const baseGray = 50 + Math.floor(Math.random() * 10);
      ctx.fillStyle = `rgb(${baseGray},${baseGray},${baseGray + 5})`;
      ctx.fillRect(0, 0, resolution, resolution);
      
      // Add asphalt texture/grain
      this.addAsphaltTexture(ctx, resolution);
      
      // Add road features based on variant
      switch (variant) {
        case 'basic':
          // Simple asphalt with subtle texture
          break;
          
        case 'with_lines':
          // Road with lane lines
          this.addRoadLines(ctx, resolution);
          break;
          
        case 'with_crossing':
          // Road with pedestrian crossing
          this.addPedestrianCrossing(ctx, resolution);
          break;
      }
      
      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      
      this.textureCache.set(textureKey, texture);
    }
    
    // Create sidewalk texture
    this.createSidewalkTexture(resolution);
  }

  /**
   * Create a road texture with lane markings
   * @returns {THREE.Texture} The road texture
   */
  createRoadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base asphalt color and texture
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add asphalt texture with small noise particles
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2 + 0.5;
      
      // Small noise particles with varying shades of gray
      const grayValue = Math.floor(Math.random() * 30) + 30; // 30-60 range
      const colorValue = grayValue.toString(16).padStart(2, '0');
      ctx.fillStyle = `#${colorValue}${colorValue}${colorValue}`;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add white lane marking in center
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(canvas.width / 2 - 5, 0, 10, canvas.height);
    
    // Add dashed lane markings
    ctx.setLineDash([30, 20]);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 5;
    
    // Left lane marking
    ctx.beginPath();
    ctx.moveTo(canvas.width / 4, 0);
    ctx.lineTo(canvas.width / 4, canvas.height);
    ctx.stroke();
    
    // Right lane marking
    ctx.beginPath();
    ctx.moveTo(3 * canvas.width / 4, 0);
    ctx.lineTo(3 * canvas.width / 4, canvas.height);
    ctx.stroke();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
  
  /**
   * Create a realistic sidewalk texture
   * @returns {THREE.Texture} The sidewalk texture
   */
  createSidewalkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base concrete color
    ctx.fillStyle = '#CCCCCC';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create concrete panel grid
    const panelSize = 128; // Size of concrete panels
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 2;
    
    // Draw grid lines for concrete panels
    for (let x = 0; x <= canvas.width; x += panelSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= canvas.height; y += panelSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Add texture and variations to the concrete
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 3 + 0.5;
      
      // Small texture particles with varying shades
      const grayValue = Math.floor(Math.random() * 40) + 160; // 160-200 (varying light grays)
      const colorValue = grayValue.toString(16).padStart(2, '0');
      ctx.fillStyle = `#${colorValue}${colorValue}${colorValue}`;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add some cracks and imperfections
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * canvas.width / panelSize) * panelSize;
      const y = Math.floor(Math.random() * canvas.height / panelSize) * panelSize;
      
      ctx.strokeStyle = '#AAAAAA';
      ctx.lineWidth = Math.random() * 1.5 + 0.5;
      
      // Create random crack pattern within a panel
      ctx.beginPath();
      let currentX = x + Math.random() * panelSize;
      let currentY = y + Math.random() * panelSize;
      ctx.moveTo(currentX, currentY);
      
      // Create a zigzag line for the crack
      const segments = Math.floor(Math.random() * 4) + 2;
      for (let j = 0; j < segments; j++) {
        currentX += (Math.random() - 0.5) * panelSize * 0.5;
        currentY += (Math.random() - 0.5) * panelSize * 0.5;
        
        // Keep crack within panel bounds
        currentX = Math.max(x, Math.min(x + panelSize, currentX));
        currentY = Math.max(y, Math.min(y + panelSize, currentY));
        
        ctx.lineTo(currentX, currentY);
      }
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Add asphalt texture/noise to the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} resolution - Texture resolution
   */
  addAsphaltTexture(ctx, resolution) {
    // Add noise and subtle cracks to simulate asphalt
    const pixelSize = 2;
    for (let y = 0; y < resolution; y += pixelSize) {
      for (let x = 0; x < resolution; x += pixelSize) {
        const noise = Math.random() * 15 - 5;
        const alpha = Math.random() * 0.05 + 0.05;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(x, y, pixelSize, pixelSize);
        
        // Occasionally add lighter specs for aggregate in asphalt
        if (Math.random() < 0.1) {
          ctx.fillStyle = `rgba(150,150,150,0.1)`;
          ctx.fillRect(x, y, pixelSize, pixelSize);
        }
      }
    }
    
    // Add some cracks/imperfections
    for (let i = 0; i < 10; i++) {
      const startX = Math.random() * resolution;
      const startY = Math.random() * resolution;
      const length = 10 + Math.random() * 30;
      const angle = Math.random() * Math.PI * 2;
      
      ctx.strokeStyle = `rgba(20,20,20,0.2)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX + Math.cos(angle) * length,
        startY + Math.sin(angle) * length
      );
      ctx.stroke();
    }
  }

  /**
   * Add concrete texture/noise to the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} resolution - Texture resolution
   */
  addConcreteTexture(ctx, resolution) {
    // Add noise to simulate concrete texture
    const pixelSize = 2;
    for (let y = 0; y < resolution; y += pixelSize) {
      for (let x = 0; x < resolution; x += pixelSize) {
        const noise = Math.random() * 10 - 5;
        const alpha = Math.random() * 0.03 + 0.02;
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(x, y, pixelSize, pixelSize);
      }
    }
    
    // Add small cracks and imperfections
    for (let i = 0; i < 20; i++) {
      const startX = Math.random() * resolution;
      const startY = Math.random() * resolution;
      const length = 5 + Math.random() * 15;
      const angle = Math.random() * Math.PI * 2;
      
      ctx.strokeStyle = `rgba(100,100,100,0.2)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX + Math.cos(angle) * length,
        startY + Math.sin(angle) * length
      );
      ctx.stroke();
    }
  }

  /**
   * Add road lines to the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} resolution - Texture resolution
   */
  addRoadLines(ctx, resolution) {
    // Center line (solid or dashed)
    const isDashed = Math.random() < 0.5;
    const lineWidth = resolution * 0.02;
    
    ctx.fillStyle = `rgb(255,255,255)`;
    
    if (isDashed) {
      // Dashed center line
      const dashLength = resolution * 0.1;
      const gapLength = resolution * 0.05;
      
      for (let y = 0; y < resolution; y += dashLength + gapLength) {
        ctx.fillRect(
          resolution / 2 - lineWidth / 2,
          y,
          lineWidth,
          dashLength
        );
      }
    } else {
      // Solid center line
      ctx.fillRect(
        resolution / 2 - lineWidth / 2,
        0,
        lineWidth,
        resolution
      );
    }
    
    // Lane edge lines
    ctx.fillRect(
      resolution * 0.1,
      0,
      resolution * 0.01,
      resolution
    );
    
    ctx.fillRect(
      resolution * 0.9 - resolution * 0.01,
      0,
      resolution * 0.01,
      resolution
    );
  }

  /**
   * Add pedestrian crossing to the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} resolution - Texture resolution
   */
  addPedestrianCrossing(ctx, resolution) {
    // Add center line first
    this.addRoadLines(ctx, resolution);
    
    // Add zebra crossing
    const stripeCount = 6;
    const stripeWidth = resolution * 0.6;
    const stripeHeight = resolution * 0.12;
    const startX = (resolution - stripeWidth) / 2;
    
    ctx.fillStyle = `rgb(255,255,255)`;
    
    for (let i = 0; i < stripeCount; i++) {
      const y = (i * (stripeHeight * 2)) + resolution * 0.1;
      
      ctx.fillRect(
        startX,
        y,
        stripeWidth,
        stripeHeight
      );
    }
  }

  /**
   * Create tree textures as sprites/billboards
   * @param {number} count - Number of unique textures to generate
   * @param {number} resolution - Texture resolution (width/height)
   */
  createTreeTextures(count, resolution) {
    const variants = ['pine', 'oak', 'birch', 'tropical'];
    
    for (let i = 0; i < count; i++) {
      const variant = variants[i % variants.length];
      const textureKey = `tree_${variant}`;
      const canvas = document.createElement('canvas');
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext('2d');
      
      // Transparent background
      ctx.clearRect(0, 0, resolution, resolution);
      
      // Draw tree based on variant
      switch (variant) {
        case 'pine':
          this.drawPineTree(ctx, resolution);
          break;
          
        case 'oak':
          this.drawOakTree(ctx, resolution);
          break;
          
        case 'birch':
          this.drawBirchTree(ctx, resolution);
          break;
          
        case 'tropical':
          this.drawTropicalTree(ctx, resolution);
          break;
      }
      
      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.transparent = true;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      
      this.textureCache.set(textureKey, texture);
      
      // Also create matching bark textures for each tree type
      this.createBarkTexture(variant, resolution);
    }
  }

  /**
   * Draw a pine tree on the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} resolution - Texture resolution
   */
  drawPineTree(ctx, resolution) {
    const centerX = resolution / 2;
    const trunkWidth = resolution * 0.1;
    const trunkHeight = resolution * 0.35;
    const trunkStartY = resolution * 0.8;
    
    // Draw trunk
    const trunkGradient = ctx.createLinearGradient(
      centerX - trunkWidth/2, 0, centerX + trunkWidth/2, 0
    );
    trunkGradient.addColorStop(0, '#5D4037');
    trunkGradient.addColorStop(0.5, '#8D6E63');
    trunkGradient.addColorStop(1, '#5D4037');
    
    ctx.fillStyle = trunkGradient;
    ctx.fillRect(
      centerX - trunkWidth/2,
      trunkStartY - trunkHeight,
      trunkWidth,
      trunkHeight
    );
    
    // Draw more detailed pine needle foliage
    // Base color gradient
    const foliageGradient = ctx.createRadialGradient(
      centerX, resolution * 0.4, resolution * 0.05,
      centerX, resolution * 0.4, resolution * 0.45
    );
    foliageGradient.addColorStop(0, '#2E7D32'); // Bright center
    foliageGradient.addColorStop(0.7, '#1B5E20'); // Mid-dark
    foliageGradient.addColorStop(1, '#0A3C0A'); // Darker edges
    
    // Draw main pine shape
    ctx.fillStyle = foliageGradient;
    
    // Create a triangular shape for the foliage
    ctx.beginPath();
    ctx.moveTo(centerX, resolution * 0.15); // Top point
    ctx.lineTo(centerX - resolution * 0.35, resolution * 0.6); // Bottom left
    ctx.lineTo(centerX + resolution * 0.35, resolution * 0.6); // Bottom right
    ctx.closePath();
    ctx.fill();
    
    // Add texture details to simulate pine needles
    ctx.strokeStyle = '#338037'; // Slightly lighter than base
    ctx.lineWidth = 0.8;
    
    // Draw angled lines to simulate pine needle clusters
    for (let i = 0; i < 160; i++) {
      const startX = centerX + (Math.random() - 0.5) * resolution * 0.7;
      const startY = resolution * 0.2 + Math.random() * resolution * 0.4;
      
      // Don't draw outside the triangle silhouette
      const normalizedY = (startY - resolution * 0.15) / (resolution * 0.45);
      const maxWidth = resolution * 0.35 * (1 - normalizedY * 0.7);
      
      if (Math.abs(startX - centerX) > maxWidth) continue;
      
      const angle = (Math.random() - 0.5) * Math.PI * 0.4 + (startX > centerX ? -Math.PI/4 : Math.PI/4);
      const length = 4 + Math.random() * 8;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX + Math.cos(angle) * length,
        startY + Math.sin(angle) * length
      );
      ctx.stroke();
    }
    
    // Add highlights for dimension
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(centerX, resolution * 0.15); // Top point
    ctx.lineTo(centerX - resolution * 0.15, resolution * 0.4); // Mid left
    ctx.lineTo(centerX, resolution * 0.35); // Mid center
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draw an oak tree on the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} resolution - Texture resolution
   */
  drawOakTree(ctx, resolution) {
    const centerX = resolution / 2;
    const trunkWidth = resolution * 0.12;
    const trunkHeight = resolution * 0.3;
    const trunkStartY = resolution * 0.8;
    
    // Draw trunk
    const trunkGradient = ctx.createLinearGradient(
      centerX - trunkWidth/2, 0, centerX + trunkWidth/2, 0
    );
    trunkGradient.addColorStop(0, '#5D4037');
    trunkGradient.addColorStop(0.5, '#8D6E63');
    trunkGradient.addColorStop(1, '#5D4037');
    
    ctx.fillStyle = trunkGradient;
    ctx.fillRect(
      centerX - trunkWidth/2,
      trunkStartY - trunkHeight,
      trunkWidth,
      trunkHeight
    );
    
    // Create more detailed oak leaf texture
    // Base canopy
    const canopyRadius = resolution * 0.35;
    const canopyCenterY = resolution * 0.38;
    
    // Create more realistic gradient with deeper colors
    const canopyGradient = ctx.createRadialGradient(
      centerX - canopyRadius * 0.2, canopyCenterY - canopyRadius * 0.2, canopyRadius * 0.1,
      centerX, canopyCenterY, canopyRadius * 1.1
    );
    canopyGradient.addColorStop(0, '#4CAF50');   // Highlight point
    canopyGradient.addColorStop(0.4, '#388E3C'); // Mid green
    canopyGradient.addColorStop(0.8, '#2E7D32'); // Dark green
    canopyGradient.addColorStop(1, '#1B5E20');   // Darker edge
    
    // Draw main foliage as an irregular shape instead of perfect circle
    ctx.fillStyle = canopyGradient;
    ctx.beginPath();
    
    // Draw an irregular oak canopy
    const leafCluster = (x, y, size) => {
      // Create a cluster of small "leaf" circles
      const clusterSize = size || 20 + Math.random() * 20;
      const count = 3 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const distance = clusterSize * (0.4 + Math.random() * 0.3);
        const leafX = x + Math.cos(angle) * distance;
        const leafY = y + Math.sin(angle) * distance;
        const leafSize = clusterSize * (0.3 + Math.random() * 0.4);
        
        ctx.beginPath();
        ctx.arc(leafX, leafY, leafSize, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    
    // Draw main canopy mass
    ctx.beginPath();
    ctx.arc(centerX, canopyCenterY, canopyRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Add leaf clusters around the edges
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = canopyRadius * 0.7;
      const x = centerX + Math.cos(angle) * dist;
      const y = canopyCenterY + Math.sin(angle) * dist;
      
      leafCluster(x, y);
    }
    
    // Add smaller detail texture inside
    ctx.strokeStyle = 'rgba(50,120,50,0.4)';
    ctx.lineWidth = 0.8;
    
    // Add small details to simulate leaf textures
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * canopyRadius * 0.9;
      const x = centerX + Math.cos(angle) * dist;
      const y = canopyCenterY + Math.sin(angle) * dist;
      
      const leafAngle = Math.random() * Math.PI * 2;
      const leafSize = 3 + Math.random() * 4;
      
      // Draw small "v" shapes for oak leaf texture
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(leafAngle) * leafSize,
        y + Math.sin(leafAngle) * leafSize
      );
      ctx.lineTo(
        x + Math.cos(leafAngle + 0.4) * leafSize * 0.8,
        y + Math.sin(leafAngle + 0.4) * leafSize * 0.8
      );
      ctx.stroke();
    }
    
    // Add subtle highlights
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.arc(
      centerX - canopyRadius * 0.2,
      canopyCenterY - canopyRadius * 0.2,
      canopyRadius * 0.6,
      0, Math.PI * 2
    );
    ctx.fill();
  }

  /**
   * Draw a birch tree on the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} resolution - Texture resolution
   */
  drawBirchTree(ctx, resolution) {
    const centerX = resolution / 2;
    const trunkWidth = resolution * 0.08;
    const trunkHeight = resolution * 0.4;
    const trunkStartY = resolution * 0.8;
    
    // Draw trunk with white birch coloring
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(
      centerX - trunkWidth/2,
      trunkStartY - trunkHeight,
      trunkWidth,
      trunkHeight
    );
    
    // Add more realistic bark details (horizontal lines for birch)
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    
    for (let y = trunkStartY - trunkHeight; y < trunkStartY; y += resolution * 0.03) {
      const lineLength = Math.random() * (trunkWidth * 0.5) + trunkWidth * 0.25;
      const lineX = centerX - trunkWidth/2 + Math.random() * (trunkWidth - lineLength);
      
      ctx.beginPath();
      ctx.moveTo(lineX, y);
      ctx.lineTo(lineX + lineLength, y);
      ctx.stroke();
    }
    
    // Create more natural foliage texture
    const foliageWidth = resolution * 0.6;
    const foliageHeight = resolution * 0.7; // Taller for birch
    const foliageCenterY = resolution * 0.35;
    
    // Create vertical gradient for birch foliage
    const foliageGradient = ctx.createLinearGradient(
      centerX, foliageCenterY - foliageHeight/2,
      centerX, foliageCenterY + foliageHeight/2
    );
    foliageGradient.addColorStop(0, '#ABEBC6'); // Lighter at top
    foliageGradient.addColorStop(0.5, '#81C784');
    foliageGradient.addColorStop(1, '#66BB6A'); // Slightly darker at bottom
    
    ctx.fillStyle = foliageGradient;
    
    // Draw multiple overlapping ovals for more natural looking canopy
    const drawOval = (x, y, width, height) => {
      ctx.beginPath();
      ctx.ellipse(
        x, y,
        width/2, height/2,
        0, 0, Math.PI * 2
      );
      ctx.fill();
    };
    
    // Draw main oval
    drawOval(centerX, foliageCenterY, foliageWidth, foliageHeight);
    
    // Draw sub-ovals for texture
    drawOval(
      centerX + foliageWidth * 0.2,
      foliageCenterY - foliageHeight * 0.15,
      foliageWidth * 0.6,
      foliageHeight * 0.5
    );
    
    drawOval(
      centerX - foliageWidth * 0.25,
      foliageCenterY - foliageHeight * 0.2,
      foliageWidth * 0.7,
      foliageHeight * 0.45
    );
    
    // Add detailed leaf texture
    ctx.strokeStyle = 'rgba(100, 180, 100, 0.4)';
    ctx.lineWidth = 0.6;
    
    // Small triangular strokes to simulate birch leaves
    for (let i = 0; i < 200; i++) {
      const x = centerX + (Math.random() - 0.5) * foliageWidth * 0.9;
      const yOffset = (Math.random() - 0.5) * foliageHeight * 0.8;
      const y = foliageCenterY + yOffset;
      
      // Don't draw outside the oval shape
      const normalizedX = (x - centerX) / (foliageWidth/2);
      const normalizedY = yOffset / (foliageHeight/2);
      if (normalizedX * normalizedX + normalizedY * normalizedY > 0.9) continue;
      
      // Small diagonal line representing leaf edge
      const angle = Math.random() * Math.PI;
      const size = 3 + Math.random() * 3;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(angle) * size,
        y + Math.sin(angle) * size
      );
      ctx.stroke();
    }
    
    // Add subtle highlights
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    drawOval(
      centerX - foliageWidth * 0.15,
      foliageCenterY - foliageHeight * 0.15,
      foliageWidth * 0.6,
      foliageHeight * 0.4
    );
  }

  /**
   * Draw a tropical/palm tree on the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} resolution - Texture resolution
   */
  drawTropicalTree(ctx, resolution) {
    const centerX = resolution / 2;
    const trunkWidth = resolution * 0.1;
    const trunkHeight = resolution * 0.5;
    const trunkStartY = resolution * 0.8;
    
    // Curve for palm trunk with more realistic texture
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = trunkWidth;
    ctx.lineCap = 'round';
    
    const curveEndX = centerX + resolution * 0.1;
    const curveEndY = resolution * 0.3;
    
    // Add trunk texture first
    const trunkX = centerX;
    const trunkY = trunkStartY - trunkHeight / 2;
    
    // Draw textured trunk
    const trunkGradient = ctx.createLinearGradient(
      trunkX - trunkWidth/2, 0,
      trunkX + trunkWidth/2, 0
    );
    trunkGradient.addColorStop(0, '#8D6E63');
    trunkGradient.addColorStop(0.4, '#A1887F');
    trunkGradient.addColorStop(0.6, '#A1887F');
    trunkGradient.addColorStop(1, '#8D6E63');
    
    ctx.strokeStyle = trunkGradient;
    
    // Draw trunk with curve
    ctx.beginPath();
    ctx.moveTo(centerX, trunkStartY);
    ctx.quadraticCurveTo(
      centerX - resolution * 0.05,
      trunkStartY - trunkHeight * 0.6,
      curveEndX,
      curveEndY
    );
    ctx.stroke();
    
    // Add trunk texture details - horizontal lines for palm trunk segments
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 1;
    
    // Add texture rings to the trunk
    const trunkSteps = 12; 
    const trunkPath = [];
    
    // Generate points along the trunk curve
    for (let i = 0; i <= trunkSteps; i++) {
      const t = i / trunkSteps;
      const x = centerX * (1 - t) * (1 - t) + 
                (centerX - resolution * 0.05) * 2 * t * (1 - t) +
                curveEndX * t * t;
                
      const y = trunkStartY * (1 - t) * (1 - t) + 
                (trunkStartY - trunkHeight * 0.6) * 2 * t * (1 - t) +
                curveEndY * t * t;
                
      trunkPath.push({x, y});
    }
    
    // Draw texture lines across the trunk
    for (let i = 1; i < trunkPath.length - 1; i += 2) {
      const point = trunkPath[i];
      const prevPoint = trunkPath[i-1];
      const nextPoint = trunkPath[i+1];
      
      // Calculate perpendicular direction to trunk curve
      const dx = nextPoint.x - prevPoint.x;
      const dy = nextPoint.y - prevPoint.y;
      const length = Math.sqrt(dx*dx + dy*dy);
      
      // Normalize and get perpendicular
      const nx = -dy / length;
      const ny = dx / length;
      
      // Draw texture line
      ctx.beginPath();
      ctx.moveTo(
        point.x - nx * trunkWidth/1.8,
        point.y - ny * trunkWidth/1.8
      );
      ctx.lineTo(
        point.x + nx * trunkWidth/1.8,
        point.y + ny * trunkWidth/1.8
      );
      ctx.stroke();
    }
    
    // Create crown at the top
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(curveEndX, curveEndY, trunkWidth, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw palm fronds with more realistic details
    const frondCount = 9;
    const frondLength = resolution * 0.4;
    
    // Set for drawing fronds with more details
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = trunkWidth / 4;
    ctx.lineCap = 'round';
    
    for (let i = 0; i < frondCount; i++) {
      const angle = (i * Math.PI * 2 / frondCount) - Math.PI * 0.5;
      
      // Create curved frond path
      ctx.beginPath();
      ctx.moveTo(curveEndX, curveEndY);
      
      // Control point for curve
      const cpX = curveEndX + Math.cos(angle) * frondLength * 0.5;
      const cpY = curveEndY + Math.sin(angle) * frondLength * 0.3;
      
      // End point with slight droop
      const endX = curveEndX + Math.cos(angle) * frondLength;
      const endY = curveEndY + Math.sin(angle) * frondLength + frondLength * 0.15;
      
      // Draw the curved frond
      ctx.quadraticCurveTo(cpX, cpY, endX, endY);
      ctx.stroke();
      
      // Add leaflet details
      ctx.strokeStyle = '#66BB6A';
      ctx.lineWidth = resolution * 0.006;
      
      const leafletCount = 10;
      
      // Calculate points along the quadratic curve
      for (let j = 1; j <= leafletCount; j++) {
        const t = j / (leafletCount + 1);
        
        // Position along the quadratic curve
        const frondX = (1-t)*(1-t)*curveEndX + 2*(1-t)*t*cpX + t*t*endX;
        const frondY = (1-t)*(1-t)*curveEndY + 2*(1-t)*t*cpY + t*t*endY;
        
        // Leaflet length tapers toward end
        const leafletLength = (resolution * 0.15) * (1 - t * 0.5);
        
        // Angle of the frond at this point (tangent to the curve)
        const frondAngle = angle + (t * Math.PI * 0.1);
        
        // Draw leaflets on both sides
        for (const side of [-1, 1]) {
          const leafletAngle = frondAngle + side * Math.PI/2;
          
          ctx.beginPath();
          ctx.moveTo(frondX, frondY);
          
          // Add curve to the leaflet
          const leafletCpX = frondX + Math.cos(leafletAngle) * leafletLength * 0.5;
          const leafletCpY = frondY + Math.sin(leafletAngle) * leafletLength * 0.5;
          
          const leafletEndX = frondX + Math.cos(leafletAngle) * leafletLength;
          const leafletEndY = frondY + Math.sin(leafletAngle) * leafletLength + leafletLength * side * 0.2;
          
          ctx.quadraticCurveTo(leafletCpX, leafletCpY, leafletEndX, leafletEndY);
          ctx.stroke();
        }
      }
    }
  }

  /**
   * Get a bark texture for a specific tree type
   * @param {string} treeType - Type of tree ('pine', 'oak', 'birch', 'tropical')
   * @returns {THREE.Texture} The bark texture
   */
  getBarkTexture(treeType) {
    const textureKey = `tree_${treeType}_bark`;
    
    // Return cached texture if available
    if (this.textureCache.has(textureKey)) {
      return this.textureCache.get(textureKey);
    }
    
    // Create and return a new texture
    this.createBarkTexture(treeType, 512);
    return this.textureCache.get(textureKey);
  }

  /**
   * Creates a bark texture for a specific tree type
   * @param {string} treeType - Type of tree bark to create
   * @param {number} resolution - Texture resolution
   * @returns {THREE.Texture} The created texture
   */
  createBarkTexture(treeType, resolution) {
    const textureKey = `tree_${treeType}_bark`;
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');
    
    // Base bark color
    let baseColor, detailColor1, detailColor2;
    
    switch (treeType) {
      case 'pine':
        baseColor = '#5D4037';
        detailColor1 = '#4E342E';
        detailColor2 = '#6D4C41';
        break;
      case 'oak':
        baseColor = '#795548';
        detailColor1 = '#6D4C41';
        detailColor2 = '#8D6E63';
        break;
      case 'birch':
        baseColor = '#E0E0E0';
        detailColor1 = '#BDBDBD';
        detailColor2 = '#F5F5F5';
        break;
      case 'tropical':
        baseColor = '#8D6E63';
        detailColor1 = '#795548';
        detailColor2 = '#A1887F';
        break;
      default:
        baseColor = '#795548';
        detailColor1 = '#6D4C41';
        detailColor2 = '#8D6E63';
    }
    
    // Fill with base color
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, resolution, resolution);
    
    // Add bark patterns based on tree type
    switch (treeType) {
      case 'pine':
        // Pine bark has vertical cracks and rough texture
        this.addVerticalBarkPattern(ctx, resolution, detailColor1, detailColor2, 8, 60);
        break;
        
      case 'oak':
        // Oak bark has deep furrows and is chunky
        this.addRoughBarkPattern(ctx, resolution, detailColor1, detailColor2, 12, 40);
        break;
        
      case 'birch':
        // Birch bark has horizontal paper-like strips
        this.addBirchBarkPattern(ctx, resolution, detailColor1, detailColor2, 15, 5);
        break;
        
      case 'tropical':
        // Palm bark has diagonal pattern
        this.addDiagonalBarkPattern(ctx, resolution, detailColor1, detailColor2, 10, 30);
        break;
        
      default:
        // Generic bark texture
        this.addRoughBarkPattern(ctx, resolution, detailColor1, detailColor2, 10, 30);
    }
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    this.textureCache.set(textureKey, texture);
    return texture;
  }

  /**
   * Add vertical crack patterns typical of pine bark
   */
  addVerticalBarkPattern(ctx, resolution, darkColor, lightColor, crackWidth, crackLength) {
    // Add vertical cracks
    for (let x = 0; x < resolution; x += resolution / 8) {
      const offsetX = x + (Math.random() - 0.5) * resolution / 16;
      
      for (let y = 0; y < resolution; y += crackLength / 2) {
        if (Math.random() < 0.7) {
          const actualLength = crackLength * (0.5 + Math.random() * 0.5);
          const actualWidth = crackWidth * (0.5 + Math.random() * 0.5);
          
          // Crack color varies between light and dark
          ctx.fillStyle = Math.random() < 0.7 ? darkColor : lightColor;
          
          // Draw a vertical crack
          ctx.beginPath();
          ctx.moveTo(offsetX, y);
          ctx.lineTo(offsetX + (Math.random() - 0.5) * 10, y + actualLength);
          ctx.lineTo(offsetX + (Math.random() - 0.5) * 10 + actualWidth, y + actualLength);
          ctx.lineTo(offsetX + actualWidth, y);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    
    // Add small noise texture
    this.addBarkNoise(ctx, resolution, darkColor, lightColor, 0.1);
  }

  /**
   * Add rough patterns typical of oak bark
   */
  addRoughBarkPattern(ctx, resolution, darkColor, lightColor, patternSize, depth) {
    // Add blocky pattern
    for (let y = 0; y < resolution; y += patternSize) {
      for (let x = 0; x < resolution; x += patternSize) {
        const offsetX = (Math.random() - 0.5) * patternSize * 0.5;
        const offsetY = (Math.random() - 0.5) * patternSize * 0.5;
        
        const patternWidth = patternSize * (0.5 + Math.random() * 0.5);
        const patternHeight = patternSize * (0.5 + Math.random() * 0.5);
        
        // Furrow color
        ctx.fillStyle = Math.random() < 0.7 ? darkColor : lightColor;
        
        // Draw a furrow block
        ctx.fillRect(
          x + offsetX, 
          y + offsetY, 
          patternWidth, 
          patternHeight
        );
      }
    }
    
    // Add crack lines
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 1;
    
    for (let i = 0; i < depth; i++) {
      const x1 = Math.random() * resolution;
      const y1 = Math.random() * resolution;
      const x2 = x1 + (Math.random() - 0.5) * patternSize * 3;
      const y2 = y1 + (Math.random() - 0.5) * patternSize * 3;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    
    // Add small noise texture
    this.addBarkNoise(ctx, resolution, darkColor, lightColor, 0.2);
  }

  /**
   * Add horizontal strip patterns typical of birch bark
   */
  addBirchBarkPattern(ctx, resolution, darkColor, lightColor, stripHeight, stripGap) {
    // Add horizontal strips
    for (let y = 0; y < resolution; y += stripHeight + stripGap) {
      const actualHeight = stripHeight * (0.8 + Math.random() * 0.4);
      
      // Draw a horizontal strip
      ctx.fillStyle = lightColor;
      ctx.fillRect(0, y, resolution, actualHeight);
      
      // Add small horizontal dark marks characteristic of birch
      ctx.fillStyle = darkColor;
      
      const markCount = 5 + Math.floor(Math.random() * 8);
      for (let i = 0; i < markCount; i++) {
        const markX = Math.random() * resolution;
        const markY = y + Math.random() * actualHeight;
        const markWidth = 5 + Math.random() * 15;
        const markHeight = 2 + Math.random() * 4;
        
        ctx.fillRect(markX, markY, markWidth, markHeight);
      }
    }
    
    // Add small noise texture
    this.addBarkNoise(ctx, resolution, darkColor, lightColor, 0.05);
  }

  /**
   * Add diagonal pattern typical of palm tree bark
   */
  addDiagonalBarkPattern(ctx, resolution, darkColor, lightColor, patternSize, count) {
    // Base diagonal pattern
    for (let i = 0; i < count; i++) {
      const startX = Math.random() * resolution;
      const startY = Math.random() * resolution;
      const width = resolution * 0.2 + Math.random() * resolution * 0.3;
      const height = 5 + Math.random() * 10;
      
      // Diagonal angle
      const angle = Math.PI / 4 + (Math.random() - 0.5) * Math.PI / 8;
      
      // Create a diagonal rectangle
      ctx.save();
      ctx.translate(startX, startY);
      ctx.rotate(angle);
      ctx.fillStyle = Math.random() < 0.6 ? darkColor : lightColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    
    // Add horizontal rings
    for (let y = patternSize; y < resolution; y += patternSize * 2) {
      ctx.fillStyle = darkColor;
      ctx.fillRect(0, y - 1, resolution, 2);
    }
    
    // Add small noise texture
    this.addBarkNoise(ctx, resolution, darkColor, lightColor, 0.15);
  }

  /**
   * Add noise to bark texture for more realism
   */
  addBarkNoise(ctx, resolution, darkColor, lightColor, intensity) {
    // Add small noise pixels
    const pixelSize = 2;
    for (let y = 0; y < resolution; y += pixelSize) {
      for (let x = 0; x < resolution; x += pixelSize) {
        if (Math.random() < intensity) {
          ctx.fillStyle = Math.random() < 0.5 ? darkColor : lightColor;
          ctx.fillRect(x, y, pixelSize, pixelSize);
        }
      }
    }
  }

  /**
   * Create grass textures with variations
   * @param {number} count - Number of unique textures to generate
   * @param {number} resolution - Texture resolution (width/height)
   */
  createGrassTextures(count, resolution) {
    const variants = ['lawn', 'wild', 'dry'];
    
    for (let i = 0; i < count; i++) {
      const variant = variants[i % variants.length];
      const textureKey = `grass_${variant}`;
      const canvas = document.createElement('canvas');
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext('2d');
      
      // Base grass color
      let baseColor, bladeColor, accentColor;
      
      switch (variant) {
        case 'lawn':
          baseColor = '#2E7D32'; // Dark green
          bladeColor = '#4CAF50'; // Medium green
          accentColor = '#81C784'; // Light green
          break;
          
        case 'wild':
          baseColor = '#33691E'; // Darker green
          bladeColor = '#558B2F'; // Olive
          accentColor = '#7CB342'; // Light olive
          break;
          
        case 'dry':
          baseColor = '#827717'; // Yellow-green
          bladeColor = '#9E9D24'; // Yellow-olive
          accentColor = '#D4E157'; // Light yellow
          break;
      }
      
      // Fill background
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, resolution, resolution);
      
      // Add noise and texture
      this.addGrassTexture(ctx, resolution, bladeColor, accentColor, variant);
      
      // Create texture from canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      
      this.textureCache.set(textureKey, texture);
    }
  }

  /**
   * Add grass blades and texture to the canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} resolution - Texture resolution
   * @param {string} bladeColor - Main color for grass blades
   * @param {string} accentColor - Highlight color for some blades
   * @param {string} variant - Type of grass ('lawn', 'wild', 'dry')
   */
  addGrassTexture(ctx, resolution, bladeColor, accentColor, variant) {
    // Draw different types of grass blades
    const bladeCount = variant === 'lawn' ? 1000 : 
                      (variant === 'wild' ? 800 : 600);
    
    for (let i = 0; i < bladeCount; i++) {
      const x = Math.random() * resolution;
      const y = Math.random() * resolution;
      
      // Determine blade attributes based on variant
      let bladeHeight, bladeWidth, curvature;
      
      switch (variant) {
        case 'lawn':
          bladeHeight = 3 + Math.random() * 4;
          bladeWidth = 1 + Math.random();
          curvature = 0.2 + Math.random() * 0.3;
          break;
          
        case 'wild':
          bladeHeight = 5 + Math.random() * 8;
          bladeWidth = 1 + Math.random() * 1.5;
          curvature = 0.3 + Math.random() * 0.5;
          break;
          
        case 'dry':
          bladeHeight = 4 + Math.random() * 7;
          bladeWidth = 0.8 + Math.random();
          curvature = 0.1 + Math.random() * 0.3;
          break;
      }
      
      // Randomly choose blade color
      ctx.fillStyle = Math.random() < 0.8 ? bladeColor : accentColor;
      
      // Draw blade
      ctx.beginPath();
      ctx.moveTo(x, y);
      
      const controlX = x + curvature * bladeHeight * (Math.random() > 0.5 ? 1 : -1);
      const controlY = y - bladeHeight * 0.6;
      const endX = x + (Math.random() - 0.5) * bladeWidth * 2;
      const endY = y - bladeHeight;
      
      ctx.quadraticCurveTo(controlX, controlY, endX, endY);
      ctx.lineTo(endX + bladeWidth, endY);
      ctx.quadraticCurveTo(controlX + bladeWidth, controlY, x + bladeWidth, y);
      ctx.closePath();
      ctx.fill();
    }
    
    // Add small details and dirt specs
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * resolution;
      const y = Math.random() * resolution;
      const size = 1 + Math.random();
      
      if (Math.random() < 0.7) {
        // Grass detail
        ctx.fillStyle = Math.random() < 0.5 ? bladeColor : accentColor;
      } else {
        // Dirt/debris
        ctx.fillStyle = `rgba(101, 67, 33, ${Math.random() * 0.2 + 0.1})`;
      }
      
      ctx.fillRect(x, y, size, size);
    }
  }

  /**
   * Create a realistic grass texture
   * @returns {THREE.Texture} The grass texture
   */
  createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base grass color
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create grass texture with varying colors and sizes
    const grassColors = [
      '#1B5E20', // Dark green
      '#2E7D32', // Medium green
      '#388E3C', // Regular green
      '#43A047', // Lighter green
      '#4CAF50', // Light green
    ];
    
    // Create base grass layer with small dots
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 4 + 1;
      
      // Random grass color
      ctx.fillStyle = grassColors[Math.floor(Math.random() * grassColors.length)];
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add grass blades
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const height = Math.random() * 15 + 5;
      const width = Math.random() * 2 + 1;
      
      // Random grass color
      ctx.fillStyle = grassColors[Math.floor(Math.random() * grassColors.length)];
      
      // Draw a grass blade as a thin rectangle
      ctx.beginPath();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((Math.random() - 0.5) * Math.PI / 2); // Random angle
      ctx.fillRect(-width/2, 0, width, height);
      ctx.restore();
    }
    
    // Add some dirt patches
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 20 + 10;
      
      // Semi-transparent dirt color
      ctx.fillStyle = 'rgba(101, 67, 33, 0.2)'; // Brown with transparency
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Create tree foliage texture for different tree types
   * @param {string} type - Type of tree (oak, pine, birch, tropical)
   * @returns {THREE.Texture} The tree foliage texture
   */
  createTreeFoliageTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Base color based on tree type
    let baseColor;
    switch (type) {
      case 'pine':
        baseColor = '#2E5E20'; // Darker green for pine
        break;
      case 'birch':
        baseColor = '#81C784'; // Lighter green for birch
        break;
      case 'tropical':
        baseColor = '#66BB6A'; // Vibrant green for tropical
        break;
      case 'oak':
      default:
        baseColor = '#388E3C'; // Standard green for oak
    }
    
    // Fill with base color
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add texture variation based on tree type
    if (type === 'pine') {
      // Pine needle texture - thin lines
      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const length = Math.random() * 10 + 5;
        const angle = Math.random() * Math.PI;
        
        ctx.strokeStyle = '#1B5E20'; // Dark green for pine needles
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
      }
    } else if (type === 'birch') {
      // Birch leaf texture - small ovals
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 8 + 4;
        
        ctx.fillStyle = Math.random() > 0.7 ? '#A5D6A7' : '#81C784'; // Varying shades
        
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === 'tropical') {
      // Tropical leaf texture - large ovals
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 40 + 30;
        
        ctx.fillStyle = Math.random() > 0.5 ? '#43A047' : '#66BB6A'; // Varying shades
        
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * 0.3, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
        
        // Add veins
        ctx.strokeStyle = '#2E7D32';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size, y);
        ctx.stroke();
      }
    } else {
      // Oak leaf texture - medium rounded shapes
      for (let i = 0; i < 300; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 15 + 10;
        
        ctx.fillStyle = Math.random() > 0.6 ? '#388E3C' : '#2E7D32'; // Varying shades
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Create a default placeholder texture
   * @returns {THREE.Texture} A simple checkerboard texture
   */
  createDefaultTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Create a simple checkerboard pattern
    const squareSize = 32;
    for (let x = 0; x < canvas.width; x += squareSize) {
      for (let y = 0; y < canvas.height; y += squareSize) {
        const isAlternate = (x / squareSize + y / squareSize) % 2 === 0;
        ctx.fillStyle = isAlternate ? '#FF00FF' : '#00FFFF'; // Magenta and cyan checkerboard
        ctx.fillRect(x, y, squareSize, squareSize);
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
} 
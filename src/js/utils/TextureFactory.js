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
   * Initialize texture set with various building facades
   * @param {number} count - Number of unique facade textures to generate
   * @param {number} resolution - Texture resolution (width/height)
   * @returns {Map<string, THREE.Texture>} Map of generated textures
   */
  initTextures(count = 8, resolution = 512) {
    // Create different types of building facades
    this.createGlassFacades(Math.ceil(count * 0.3), resolution);
    this.createOfficeFacades(Math.ceil(count * 0.3), resolution);
    this.createResidentialFacades(Math.ceil(count * 0.4), resolution);
    
    // Create road and nature textures
    this.createRoadTextures(3, resolution);
    this.createTreeTextures(4, resolution);
    this.createGrassTextures(3, resolution);
    
    return this.textureCache;
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
   * Get a texture for roads, trees, or grass
   * @param {string} type - Type of texture ('road', 'tree', 'grass')
   * @param {string} variant - Specific variant if needed ('road_with_lines', 'road_with_crossing', etc.)
   * @returns {THREE.Texture} A texture for the specified element
   */
  getEnvironmentTexture(type, variant = null) {
    let availableTextures;
    
    if (variant) {
      // Try to get the specific variant
      const specificKey = `${type}_${variant}`;
      if (this.textureCache.has(specificKey)) {
        return this.textureCache.get(specificKey);
      }
    }
    
    // Get all textures of the requested type
    availableTextures = Array.from(this.textureCache.keys())
      .filter(key => key.startsWith(type));
    
    if (availableTextures.length === 0) {
      console.warn('No textures available for type:', type);
      return null;
    }
    
    // Return a random texture of the requested type
    const randomIndex = Math.floor(Math.random() * availableTextures.length);
    return this.textureCache.get(availableTextures[randomIndex]);
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
   * Create a sidewalk texture
   * @param {number} resolution - Texture resolution
   */
  createSidewalkTexture(resolution) {
    const canvas = document.createElement('canvas');
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext('2d');
    
    // Base concrete color
    const baseGray = 160 + Math.floor(Math.random() * 20);
    ctx.fillStyle = `rgb(${baseGray},${baseGray},${baseGray})`;
    ctx.fillRect(0, 0, resolution, resolution);
    
    // Add concrete tile pattern
    const tileSize = resolution / 8;
    ctx.strokeStyle = `rgba(120,120,120,0.5)`;
    ctx.lineWidth = 2;
    
    // Horizontal lines
    for (let y = 0; y <= resolution; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(resolution, y);
      ctx.stroke();
    }
    
    // Vertical lines
    for (let x = 0; x <= resolution; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, resolution);
      ctx.stroke();
    }
    
    // Add subtle texture variations
    this.addConcreteTexture(ctx, resolution);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    
    this.textureCache.set('sidewalk', texture);
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
    
    // Draw foliage (multiple triangle layers)
    const foliageLayers = 4;
    const baseWidth = resolution * 0.8;
    const layerHeight = resolution * 0.15;
    
    for (let i = 0; i < foliageLayers; i++) {
      const y = trunkStartY - trunkHeight - (i * layerHeight * 0.8);
      const width = baseWidth - (i * baseWidth * 0.15);
      
      // Foliage gradient
      const foliageGradient = ctx.createRadialGradient(
        centerX, y, width * 0.1,
        centerX, y, width * 0.5
      );
      foliageGradient.addColorStop(0, '#2E7D32');
      foliageGradient.addColorStop(1, '#1B5E20');
      
      ctx.fillStyle = foliageGradient;
      
      // Draw triangle
      ctx.beginPath();
      ctx.moveTo(centerX - width/2, y);
      ctx.lineTo(centerX + width/2, y);
      ctx.lineTo(centerX, y - layerHeight);
      ctx.closePath();
      ctx.fill();
    }
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
    
    // Draw canopy as a large circle
    const canopyRadius = resolution * 0.35;
    const canopyCenterY = trunkStartY - trunkHeight - canopyRadius * 0.5;
    
    // Canopy gradient
    const canopyGradient = ctx.createRadialGradient(
      centerX, canopyCenterY, canopyRadius * 0.1,
      centerX, canopyCenterY, canopyRadius
    );
    canopyGradient.addColorStop(0, '#388E3C');
    canopyGradient.addColorStop(1, '#2E7D32');
    
    ctx.fillStyle = canopyGradient;
    ctx.beginPath();
    ctx.arc(centerX, canopyCenterY, canopyRadius, 0, Math.PI * 2);
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
    
    // Add bark details (horizontal lines for birch)
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
    
    // Draw foliage as an oval shape
    const foliageWidth = resolution * 0.6;
    const foliageHeight = resolution * 0.5;
    const foliageCenterY = trunkStartY - trunkHeight - foliageHeight * 0.3;
    
    // Foliage gradient
    const foliageGradient = ctx.createRadialGradient(
      centerX, foliageCenterY, foliageWidth * 0.1,
      centerX, foliageCenterY, foliageWidth * 0.5
    );
    foliageGradient.addColorStop(0, '#81C784');
    foliageGradient.addColorStop(1, '#4CAF50');
    
    ctx.fillStyle = foliageGradient;
    
    // Draw oval
    ctx.beginPath();
    ctx.ellipse(
      centerX, foliageCenterY,
      foliageWidth/2, foliageHeight/2,
      0, 0, Math.PI * 2
    );
    ctx.fill();
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
    
    // Curve for palm trunk
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = trunkWidth;
    ctx.lineCap = 'round';
    
    const curveEndX = centerX + resolution * 0.1;
    const curveEndY = trunkStartY - trunkHeight;
    
    ctx.beginPath();
    ctx.moveTo(centerX, trunkStartY);
    ctx.quadraticCurveTo(
      centerX - resolution * 0.05,
      trunkStartY - trunkHeight * 0.5,
      curveEndX,
      curveEndY
    );
    ctx.stroke();
    
    // Draw palm fronds radiating from top
    const frondCount = 7;
    const frondLength = resolution * 0.35;
    
    for (let i = 0; i < frondCount; i++) {
      const angle = (i * Math.PI * 2 / frondCount) - Math.PI * 0.5;
      
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth = resolution * 0.02;
      
      ctx.beginPath();
      ctx.moveTo(curveEndX, curveEndY);
      ctx.lineTo(
        curveEndX + Math.cos(angle) * frondLength,
        curveEndY + Math.sin(angle) * frondLength
      );
      ctx.stroke();
      
      // Add frond detail
      const leafCount = 5;
      const leafLength = resolution * 0.08;
      
      for (let j = 1; j <= leafCount; j++) {
        const t = j / (leafCount + 1); // position along the frond (0-1)
        const leafX = curveEndX + Math.cos(angle) * frondLength * t;
        const leafY = curveEndY + Math.sin(angle) * frondLength * t;
        
        // Left leaf
        const leftAngle = angle - Math.PI/2;
        ctx.strokeStyle = '#66BB6A';
        ctx.lineWidth = resolution * 0.01;
        ctx.beginPath();
        ctx.moveTo(leafX, leafY);
        ctx.lineTo(
          leafX + Math.cos(leftAngle) * leafLength,
          leafY + Math.sin(leftAngle) * leafLength
        );
        ctx.stroke();
        
        // Right leaf
        const rightAngle = angle + Math.PI/2;
        ctx.beginPath();
        ctx.moveTo(leafX, leafY);
        ctx.lineTo(
          leafX + Math.cos(rightAngle) * leafLength,
          leafY + Math.sin(rightAngle) * leafLength
        );
        ctx.stroke();
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
} 
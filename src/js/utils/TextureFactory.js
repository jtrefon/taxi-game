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
} 
import { TextureFactory } from './TextureFactory.js';

/**
 * Proxy Pattern implementation for building texture management
 * Acts as an intermediary for building texture application, handling
 * initialization, caching, and optimal texture type assignment
 */
export class BuildingTextureService {
  constructor() {
    this.textureFactory = new TextureFactory();
    this.initialized = false;
    this.buildingRegistry = new Map(); // Tracks which buildings use which textures
    this.environmentMap = null;
  }
  
  /**
   * Initialize the texture service
   * @param {number} textureCount - Number of unique textures to generate
   * @param {number} resolution - Texture resolution
   * @param {THREE.CubeTexture} [environmentMap] - Optional environment map for reflections
   */
  init(textureCount = 8, resolution = 512, environmentMap = null) {
    if (this.initialized) return;
    
    console.log(`Initializing Building Texture Service with ${textureCount} textures at ${resolution}x${resolution} resolution`);
    this.textureFactory.initTextures(textureCount, resolution);
    this.environmentMap = environmentMap;
    this.initialized = true;
  }
  
  /**
   * Set the environment map for reflective materials
   * @param {THREE.CubeTexture} environmentMap - Environment map texture
   */
  setEnvironmentMap(environmentMap) {
    this.environmentMap = environmentMap;
    
    // Update existing materials in registry if they use environment maps
    this.buildingRegistry.forEach((info, key) => {
      if (info.material && info.type === 'glass') {
        info.material.envMap = this.environmentMap;
      }
    });
  }
  
  /**
   * Apply a suitable texture to a building
   * @param {THREE.Mesh} building - Building mesh to texture
   * @param {Object} options - Texture options
   * @param {string} options.type - Preferred texture type ('glass', 'office', 'residential')
   * @param {number} options.height - Building height (used for making smart choices)
   * @param {string} options.positionKey - Unique position key for building
   * @returns {THREE.Mesh} - The textured building
   */
  applyTexture(building, options = {}) {
    // Initialize if not already done
    if (!this.initialized) {
      this.init();
    }
    
    // Default options
    const buildingOptions = {
      type: 'office',
      height: 20,
      positionKey: `${building.position.x.toFixed(1)}_${building.position.z.toFixed(1)}`
    };
    
    // Apply provided options
    Object.assign(buildingOptions, options);
    
    // Smart texture type selection if not explicitly provided
    if (!options.type) {
      if (buildingOptions.height > 40) {
        // Taller buildings tend to be glass/office
        buildingOptions.type = Math.random() < 0.7 ? 'glass' : 'office';
      } else if (buildingOptions.height > 25) {
        // Medium buildings could be any type, slight bias towards office
        const rand = Math.random();
        buildingOptions.type = rand < 0.4 ? 'office' : (rand < 0.7 ? 'glass' : 'residential');
      } else {
        // Shorter buildings are most likely residential
        buildingOptions.type = Math.random() < 0.8 ? 'residential' : 'office';
      }
    }
    
    // Get texture and apply it to building material
    let texture;
    
    // Special case for hospital type
    if (buildingOptions.type === 'hospital') {
      texture = this.textureFactory.createHospitalTexture(512);
    } else {
      texture = this.textureFactory.getFacadeTexture(
        buildingOptions.type, 
        buildingOptions.positionKey
      );
    }
    
    if (texture) {
      let newMaterial;
      
      // Handle multi-material buildings
      if (Array.isArray(building.material)) {
        const materials = building.material.map(mat => {
          const clonedMat = mat.clone();
          clonedMat.map = texture;
          
          // Adjust material properties based on type
          this.adjustMaterialProperties(clonedMat, buildingOptions.type);
          
          return clonedMat;
        });
        
        building.material = materials;
        newMaterial = materials[0]; // Store reference to the first material
      } else {
        // Single material building
        newMaterial = building.material.clone();
        newMaterial.map = texture;
        
        // Adjust material properties based on type
        this.adjustMaterialProperties(newMaterial, buildingOptions.type);
        
        building.material = newMaterial;
      }
      
      // Register building in registry
      this.buildingRegistry.set(buildingOptions.positionKey, {
        type: buildingOptions.type,
        textureKey: texture.uuid,
        material: newMaterial // Store reference to the material
      });
    }
    
    return building;
  }
  
  /**
   * Adjust material properties based on building type
   * @param {THREE.Material} material - Material to adjust
   * @param {string} type - Building type
   */
  adjustMaterialProperties(material, type) {
    material.needsUpdate = true;
    
    switch (type) {
      case 'glass':
        material.roughness = 0.2;
        material.metalness = 0.8;
        
        // Add environment mapping for reflections if available
        if (this.environmentMap) {
          material.envMap = this.environmentMap;
          material.envMapIntensity = 1.0;
        }
        break;
        
      case 'office':
        material.roughness = 0.5;
        material.metalness = 0.2;
        
        // Subtle environment mapping for office buildings
        if (this.environmentMap) {
          material.envMap = this.environmentMap;
          material.envMapIntensity = 0.3;
        }
        break;
        
      case 'residential':
        material.roughness = 0.7;
        material.metalness = 0.0;
        
        // No environment mapping for residential buildings
        material.envMap = null;
        break;
    }
  }
  
  /**
   * Get statistics about texture usage
   * @returns {Object} Statistics about texture usage
   */
  getTextureStats() {
    if (!this.initialized) return { initialized: false };
    
    const stats = {
      totalBuildings: this.buildingRegistry.size,
      byType: {
        glass: 0,
        office: 0,
        residential: 0
      }
    };
    
    // Count usage by type
    this.buildingRegistry.forEach(info => {
      if (stats.byType[info.type] !== undefined) {
        stats.byType[info.type]++;
      }
    });
    
    return stats;
  }
} 
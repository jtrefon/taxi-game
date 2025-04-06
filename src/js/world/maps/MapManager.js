import { ManhattanMap } from './ManhattanMap.js';

/**
 * MapManager class that handles the creation and management of game maps.
 * Uses the Factory Method pattern to create different types of maps.
 */
export class MapManager {
  constructor(scene, physicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.currentMap = null;
  }
  
  /**
   * Create a map of the specified type
   * @param {string} mapType - The type of map to create (e.g., 'manhattan')
   * @returns {BaseMap} The created map instance
   */
  createMap(mapType) {
    switch (mapType.toLowerCase()) {
      case 'manhattan':
        this.currentMap = new ManhattanMap(this.scene, this.physicsWorld);
        break;
      // Add other map types here as they are created
      default:
        console.warn(`Unknown map type: ${mapType}. Defaulting to Manhattan.`);
        this.currentMap = new ManhattanMap(this.scene, this.physicsWorld);
    }
    
    // Generate the map
    this.currentMap.generate();
    
    return this.currentMap;
  }
  
  /**
   * Get the current active map
   * @returns {BaseMap} The current map
   */
  getCurrentMap() {
    return this.currentMap;
  }
} 
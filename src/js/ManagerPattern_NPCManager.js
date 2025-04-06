constructor({ maxNPCs = 100, cityBounds = { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 }, excludeZones = [], sidewalkPoints = [] } = {}) {
  this.npcs = [];
  this.maxNPCs = maxNPCs;
  this.cityBounds = cityBounds;
  this.excludeZones = excludeZones;
  this.sidewalkPoints = sidewalkPoints;
}

// Gets a random sidewalk spawn position if available
getSidewalkSpawnPosition() {
  if (this.sidewalkPoints.length > 0) {
    const index = Math.floor(Math.random() * this.sidewalkPoints.length);
    const pos = this.sidewalkPoints[index];
    console.log('Using sidewalk spawn point:', pos);
    return pos;
  }
  return null;
}

spawnNPC(npcFactory) {
  let pos = this.getSidewalkSpawnPosition();
  if (!pos) {
    pos = this.getRandomPosition();
    console.warn('Using fixed spawn point as no sidewalk point was found');
  }
  let newNPC = npcFactory ? npcFactory({ position: pos }) : this.createDefaultNPC(pos);
  newNPC.position = pos;
  this.npcs.push(newNPC);
  this.enforceNPCLimit();
  return newNPC;
}

getRandomPosition() {
  const { minX, maxX, minZ, maxZ } = this.cityBounds;
  let attempt = 0;
  let pos;
  do {
    pos = {
      x: Math.random() * (maxX - minX) + minX,
      z: Math.random() * (maxZ - minZ) + minZ
    };
    attempt++;
  } while (this.isPositionExcluded(pos) && attempt < 100);
  if (attempt >= 100) {
    console.warn('Fixed spawn point used after 100 attempts');
  }
  console.log('Generated NPC spawn position:', pos);
  return pos;
} 
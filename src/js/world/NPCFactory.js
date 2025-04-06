import * as THREE from '../../libs/three.module.js';
import * as CANNON from '../../libs/cannon-es.js';
import { NPCTextureService } from '../utils/NPCTextureService.js';

/**
 * Factory for creating NPC (Non-Player Character) objects.
 * Assembles simple blocky characters with randomized appearances.
 */
export class NPCFactory {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.textureService = new NPCTextureService();

        // Define standard dimensions for body parts
        this.headSize = 0.8;
        this.torsoWidth = 1.0;
        this.torsoHeight = 1.2;
        this.torsoDepth = 0.5;
        this.legHeight = 1.0;
        this.legWidth = 0.4;
        this.legDepth = 0.4;
        this.armWidth = 0.3;
        this.armHeight = 1.0;
        this.armDepth = 0.3;
    }

    createNPC(x, z, options = {}) {
        const npcGroup = new THREE.Group();
        npcGroup.position.set(x, this.legHeight + this.torsoHeight / 2, z); // Initial position centered at torso base

        // Randomize appearance details
        const gender = options.gender || (Math.random() < 0.5 ? 'male' : 'female');
        const skinTone = this._getRandomElement(this.textureService.skinTones);
        const hairColor = this._getRandomElement(this.textureService.hairColors);
        const hairStyle = Math.floor(Math.random() * 3); // 0: Short, 1: Medium, 2: Bald
        const shirtColor = this._getRandomElement(this.textureService.shirtColors);
        const trouserColor = this._getRandomElement(this.textureService.trouserColors);
        const shoeColor = this._getRandomElement(this.textureService.shoeColors);

        const textureOptions = { skinTone, hairColor, hairStyle, shirtColor, trouserColor, shoeColor, gender };

        // --- Create Body Parts ---
        const head = this._createHead(textureOptions);
        const torso = this._createTorso(textureOptions);
        
        // Create pivot points for limbs
        const leftLegPivot = new THREE.Group();
        const rightLegPivot = new THREE.Group();
        const leftArmPivot = new THREE.Group();
        const rightArmPivot = new THREE.Group();

        // Create limb meshes
        const leftLegMesh = this._createLeg(textureOptions);
        const rightLegMesh = this._createLeg(textureOptions);
        const leftArmMesh = this._createArm(textureOptions);
        const rightArmMesh = this._createArm(textureOptions);

        // --- Position Pivots relative to the main group's origin (torso center) ---
        head.position.y = this.torsoHeight / 2 + this.headSize / 2; 
        
        const hipOffsetY = -this.torsoHeight / 2; // Vertical offset for hips from torso center
        const hipOffsetX = this.torsoWidth / 4;   // Horizontal offset for hips
        leftLegPivot.position.set(-hipOffsetX, hipOffsetY, 0);
        rightLegPivot.position.set(hipOffsetX, hipOffsetY, 0);

        const shoulderOffsetY = this.torsoHeight / 2 - this.armWidth / 2; // Adjust based on desired shoulder height
        const shoulderOffsetX = this.torsoWidth / 2 + this.armWidth / 2;
        leftArmPivot.position.set(-shoulderOffsetX, shoulderOffsetY, 0);
        rightArmPivot.position.set(shoulderOffsetX, shoulderOffsetY, 0);

        // --- Position Limb Meshes relative to their Pivots ---
        // Position top of the limb at the pivot point
        leftLegMesh.position.y = -this.legHeight / 2; 
        rightLegMesh.position.y = -this.legHeight / 2;
        leftArmMesh.position.y = -this.armHeight / 2; 
        rightArmMesh.position.y = -this.armHeight / 2;

        // --- Assemble Hierarchy ---
        // Add meshes to their pivots
        leftLegPivot.add(leftLegMesh);
        rightLegPivot.add(rightLegMesh);
        leftArmPivot.add(leftArmMesh);
        rightArmPivot.add(rightArmMesh);

        // Add head, torso, and pivots to the main group
        npcGroup.add(head);
        npcGroup.add(torso);
        npcGroup.add(leftLegPivot);
        npcGroup.add(rightLegPivot);
        npcGroup.add(leftArmPivot);
        npcGroup.add(rightArmPivot);

        this.scene.add(npcGroup);

        // --- Optional: Add Physics (simple capsule for now) ---
        const totalHeight = this.headSize + this.torsoHeight + this.legHeight;
        const radius = Math.max(this.torsoWidth, this.torsoDepth) / 2;
        
        // Use a cylinder shape instead of capsule (which isn't available)
        const shape = new CANNON.Cylinder(radius, radius, totalHeight, 8);
        
        // Need to rotate the cylinder to stand upright (CANNON.js cylinders lie flat by default)
        const quaternion = new CANNON.Quaternion();
        quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        
        const body = new CANNON.Body({
            mass: 50, // Give NPCs some mass
            position: new CANNON.Vec3(x, totalHeight / 2, z), // Physics body centered
            shape: shape,
            linearDamping: 0.1, // Significantly reduced damping
            angularDamping: 0.5, // Also reduced angular damping
            fixedRotation: true // Prevent falling over
        });
        
        // Apply the rotation to make the cylinder stand upright
        body.quaternion.copy(quaternion);

        this.physicsWorld.addBody(body);

        // Link mesh group to physics body
        npcGroup.userData.physicsBody = body;
        body.userData = { mesh: npcGroup }; // Link back for updates

        // Store NPC data for animation/AI - store PIVOTS now
        npcGroup.userData.npc = {
            headMesh: head, 
            leftLegPivot: leftLegPivot,      // Store reference to left leg pivot
            rightLegPivot: rightLegPivot,     // Store reference to right leg pivot
            leftArmPivot: leftArmPivot,      // Store reference to left arm pivot
            rightArmPivot: rightArmPivot,     // Store reference to right arm pivot
            state: 'walking', 
            speed: 2 + Math.random() * 3, // Random walking speed (2 to 5)
            targetPosition: null, 
            walkPhase: Math.random() * Math.PI * 2, 
            body: body
        };

        return npcGroup;
    }

    _createHead(texOptions) {
        const geometry = new THREE.BoxGeometry(this.headSize, this.headSize, this.headSize);
        // Get the array of materials for the head faces
        const materials = this.textureService.getHeadMaterials(texOptions);
        
        // Assign the array of materials to the mesh
        return new THREE.Mesh(geometry, materials);
    }

    _createTorso(texOptions) {
        const geometry = new THREE.BoxGeometry(this.torsoWidth, this.torsoHeight, this.torsoDepth);
        const material = new THREE.MeshStandardMaterial({
            map: this.textureService.getNPCTexture('torso', texOptions)
        });
        return new THREE.Mesh(geometry, material);
    }

    _createLeg(texOptions) {
        const geometry = new THREE.BoxGeometry(this.legWidth, this.legHeight, this.legDepth);
        const material = new THREE.MeshStandardMaterial({
            map: this.textureService.getNPCTexture('legs', texOptions)
        });
        return new THREE.Mesh(geometry, material);
    }

    _createArm(texOptions) {
        // Use torso texture for arms for simplicity, or create specific arm texture
        const geometry = new THREE.BoxGeometry(this.armWidth, this.armHeight, this.armDepth);
        const material = new THREE.MeshStandardMaterial({
             map: this.textureService.getNPCTexture('torso', { shirtColor: texOptions.shirtColor }) // Match shirt color
        });
        return new THREE.Mesh(geometry, material);
    }

    _getRandomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
} 
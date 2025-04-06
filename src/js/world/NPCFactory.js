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
        const leftLeg = this._createLeg(textureOptions);
        const rightLeg = this._createLeg(textureOptions);
        const leftArm = this._createArm(textureOptions);
        const rightArm = this._createArm(textureOptions);

        // --- Position Body Parts ---
        head.position.y = this.torsoHeight / 2 + this.headSize / 2; // Head on top of torso
        
        leftLeg.position.x = -this.torsoWidth / 4;
        leftLeg.position.y = -this.torsoHeight / 2 - this.legHeight / 2; // Legs below torso
        rightLeg.position.x = this.torsoWidth / 4;
        rightLeg.position.y = -this.torsoHeight / 2 - this.legHeight / 2;

        leftArm.position.x = -this.torsoWidth / 2 - this.armWidth / 2;
        leftArm.position.y = 0; // Arms centered vertically with torso
        rightArm.position.x = this.torsoWidth / 2 + this.armWidth / 2;
        rightArm.position.y = 0;

        // Add parts to the group
        npcGroup.add(head);
        npcGroup.add(torso);
        npcGroup.add(leftLeg);
        npcGroup.add(rightLeg);
        npcGroup.add(leftArm);
        npcGroup.add(rightArm);

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
            linearDamping: 0.9, // Dampen movement
            angularDamping: 0.9,
            fixedRotation: true // Prevent falling over
        });
        
        // Apply the rotation to make the cylinder stand upright
        body.quaternion.copy(quaternion);

        this.physicsWorld.addBody(body);

        // Link mesh group to physics body
        npcGroup.userData.physicsBody = body;
        body.userData = { mesh: npcGroup }; // Link back for updates

        // Store NPC data for animation/AI
        npcGroup.userData.npc = {
            state: 'walking',
            speed: 0.5 + Math.random() * 1.0, // Random walking speed
            targetPosition: null, // Will be set by AI/pathfinding
            body: body
        };

        return npcGroup;
    }

    _createHead(texOptions) {
        const geometry = new THREE.BoxGeometry(this.headSize, this.headSize, this.headSize);
        const material = new THREE.MeshStandardMaterial({
            map: this.textureService.getNPCTexture('head', texOptions)
        });
        return new THREE.Mesh(geometry, material);
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
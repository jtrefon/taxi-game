import * as THREE from '../../libs/three.module.js';

/**
 * Service to generate and manage textures for NPCs (Non-Player Characters).
 * Creates simple, blocky textures suitable for Lego-like characters.
 */
export class NPCTextureService {
    constructor(textureSize = 64) {
        this.textureSize = textureSize;
        this.hairColors = ['#000000', '#4d2600', '#ffcc00', '#cc6600', '#666666', '#ffffff']; // Added white
        this.skinTones = ['#f5c6a7', '#e0ac69', '#c68642', '#8d5524'];
        this.shirtColors = ['#ff0000', '#0000ff', '#00cc00', '#ffff00', '#ff9900', '#cc00cc', '#ffffff', '#666666']; // Added white, grey
        this.trouserColors = ['#0000cc', '#333333', '#663300', '#004d00', '#555555']; // Added dark grey
        this.shoeColors = ['#000000', '#404040', '#595959', '#ffffff']; // Added white
    }

    _getRandomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    _getTextureKey(type, options) {
        // Create a consistent key for caching based on type and options
        const sortedOptions = Object.keys(options).sort().reduce((acc, key) => {
            acc[key] = options[key];
            return acc;
        }, {});
        return `${type}_${JSON.stringify(sortedOptions)}`;
    }

    _createTexture(drawFunction) {
        // Create a completely new canvas for this texture instance
        const textureCanvas = document.createElement('canvas');
        textureCanvas.width = this.textureSize;
        textureCanvas.height = this.textureSize;
        const textureCtx = textureCanvas.getContext('2d');
        
        // Ensure canvas is clear before drawing
        textureCtx.fillStyle = '#cccccc'; // Default background to see edges
        textureCtx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Draw the specific texture onto this dedicated canvas
        drawFunction(textureCtx, this.textureSize);
        
        // Create the texture using the dedicated canvas
        const texture = new THREE.CanvasTexture(textureCanvas); 

        // Optional: Improve texture quality for blocky style
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        
        return texture;
    }

    getNPCTexture(type, options = {}) {
        const key = this._getTextureKey(type, options);
        // No caching when creating new canvas each time, always generate
        // if (this.textureCache.has(key)) {
        //     return this.textureCache.get(key);
        // }

        let drawFunction;
        switch (type) {
            case 'head':
                drawFunction = this._drawHeadTexture.bind(this, options);
                break;
            case 'torso':
                drawFunction = this._drawTorsoTexture.bind(this, options);
                break;
            case 'legs':
                drawFunction = this._drawLegsTexture.bind(this, options);
                break;
            default:
                console.warn(`Unknown NPC texture type: ${type}`);
                return null;
        }

        const texture = this._createTexture(drawFunction);
        // No caching when creating new canvas each time
        // this.textureCache.set(key, texture);
        return texture;
    }

    // --- Drawing Functions ---

    _drawHeadTexture(options, ctx, size) {
        const skinTone = options.skinTone || this._getRandomElement(this.skinTones);
        const hairColor = options.hairColor || this._getRandomElement(this.hairColors);
        const hairStyle = options.hairStyle !== undefined ? options.hairStyle : Math.floor(Math.random() * 3); // 0: Short, 1: Medium, 2: Bald
        const gender = options.gender || 'male'; // Add gender influence later if needed

        // Base skin tone
        ctx.fillStyle = skinTone;
        ctx.fillRect(0, 0, size, size);

        // Simple eyes
        ctx.fillStyle = '#000000';
        const eyeSize = size * 0.08;
        const eyeY = size * 0.4;
        const eyeXOffset = size * 0.2;
        ctx.fillRect(size * 0.5 - eyeXOffset - eyeSize / 2, eyeY - eyeSize / 2, eyeSize, eyeSize); // Left eye
        ctx.fillRect(size * 0.5 + eyeXOffset - eyeSize / 2, eyeY - eyeSize / 2, eyeSize, eyeSize); // Right eye

        // Simple mouth (subtle)
        ctx.fillStyle = '#8d5524'; // Darker skin tone
        ctx.fillRect(size * 0.4, size * 0.65, size * 0.2, size * 0.04);

        // Hair
        if (hairStyle < 2) { // Not bald
            ctx.fillStyle = hairColor;
            const hairTop = 0;
            let hairBottom = size * 0.15; // Default height

            // Style variations
            if (hairStyle === 0) { // Short Hair / Buzz cut
                 hairBottom = size * 0.18;
                 ctx.fillRect(0, hairTop, size, hairBottom);
            } else if (hairStyle === 1) { // Medium Hair / Bob
                 hairBottom = size * 0.25;
                 ctx.fillRect(0, hairTop, size, hairBottom);
                 // Add slight side coverage
                 ctx.fillRect(0, hairBottom, size * 0.15, size * 0.1);
                 ctx.fillRect(size - size * 0.15, hairBottom, size * 0.15, size * 0.1);
            }
            // Could add more styles here (long hair, ponytail etc.)
        }
    }

    _drawTorsoTexture(options, ctx, size) {
        const shirtColor = options.shirtColor || this._getRandomElement(this.shirtColors);
        const gender = options.gender || 'male';
        const hasStripe = Math.random() > 0.6;
        const stripeHorizontal = Math.random() > 0.5;

        // Base shirt color
        ctx.fillStyle = shirtColor;
        ctx.fillRect(0, 0, size, size);

        // Optional stripe
        if (hasStripe) {
            ctx.fillStyle = this._getRandomElement(this.shirtColors.filter(c => c !== shirtColor)); // Different color
            if (stripeHorizontal) {
                const stripeHeight = size * 0.25;
                ctx.fillRect(0, (size - stripeHeight) / 2, size, stripeHeight);
            } else {
                 const stripeWidth = size * 0.2;
                 ctx.fillRect((size - stripeWidth) / 2, 0, stripeWidth, size);
            }
        }

        // Simple neck line (skin color)
        const skinTone = options.skinTone || this.skinTones[0]; // Use a default if not provided
        ctx.fillStyle = skinTone;
        ctx.beginPath();
        ctx.arc(size / 2, size * 0.1, size * 0.18, 0, Math.PI, false); // Semi-circle cutout
        ctx.fill();

         // Add simple arms indication at the sides
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Subtle shadow line
        ctx.fillRect(0, 0, size * 0.05, size);
        ctx.fillRect(size - size * 0.05, 0, size * 0.05, size);
    }

    _drawLegsTexture(options, ctx, size) {
        const trouserColor = options.trouserColor || this._getRandomElement(this.trouserColors);
        const shoeColor = options.shoeColor || this._getRandomElement(this.shoeColors);
        const shoeHeight = size * 0.15;

        // Trousers
        ctx.fillStyle = trouserColor;
        ctx.fillRect(0, 0, size, size);

        // Simple line separating legs
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(size / 2 - 1, 0, 2, size);

        // Shoes (Overlay on bottom part)
        ctx.fillStyle = shoeColor;
        ctx.fillRect(0, size - shoeHeight, size, shoeHeight);
    }
} 
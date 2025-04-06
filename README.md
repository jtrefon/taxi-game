# Taxi Driver 3D

A 3D open-world game where you play as a taxi driver in a city filled with buildings, parks, and trees.

## Overview

This game is built using Three.js for 3D rendering and Cannon.js for physics simulation. The player controls a taxi car through a procedurally generated city with tall buildings, parks, and detailed road networks.

## Features

- 3D open-world environment with procedurally generated city
- Vehicle physics with realistic driving mechanics
- Various city elements including tall buildings, parks, and trees
- Simple HUD showing speed and money

## Getting Started

### Prerequisites

- Node.js (v14 or higher recommended)
- npm (comes with Node.js)

### Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd taxi-driver-3d
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173` (or the URL shown in your terminal)

## Controls

- **W / Arrow Up**: Accelerate forward
- **S / Arrow Down**: Reverse
- **A / Arrow Left**: Turn left
- **D / Arrow Right**: Turn right
- **Space**: Brake

## Project Structure

```
/
├── src/                 # Source code
│   ├── js/              # JavaScript code
│   │   ├── core/        # Core game mechanics
│   │   ├── entities/    # Game entities (vehicles, pedestrians)
│   │   └── world/       # World generation and management
│   ├── assets/          # Game assets
│   │   ├── models/      # 3D models
│   │   └── textures/    # Textures
│   └── css/             # Stylesheets
├── index.html           # Main HTML file
└── package.json         # Project dependencies and scripts
```

## Design Patterns Used

- **Factory Pattern**: Used in `CityGenerator` for creating different city elements
- **Strategy Pattern**: Applied in `Vehicle` for handling different movement behaviors
- **Observer Pattern**: Used for event handling in the game

## License

This project is licensed under the MIT License. 
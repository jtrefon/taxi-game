export class FullscreenButton {
  constructor() {
    this.button = null;
    this.isFullscreen = false;
    this.init();
  }

  init() {
    // Create button
    this.button = document.createElement('button');
    this.button.className = 'fullscreen-button';
    this.button.innerHTML = this.getFullscreenSVG();
    
    // Add event listeners
    this.button.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => this.updateButtonState());
    
    // Add to document
    document.body.appendChild(this.button);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  updateButtonState() {
    this.isFullscreen = !!document.fullscreenElement;
    this.button.innerHTML = this.isFullscreen ? this.getExitFullscreenSVG() : this.getFullscreenSVG();
  }

  getFullscreenSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
    </svg>`;
  }

  getExitFullscreenSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white">
      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
    </svg>`;
  }
} 
/**
 * Utility class for detecting device types and capabilities
 */
export class DeviceDetector {
  /**
   * Check if the current device is a mobile device
   * @returns {boolean} True if the device is mobile, false otherwise
   */
  static isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           (window.innerWidth <= 768 && window.innerHeight <= 1024);
  }

  /**
   * Check if the device has touch capabilities
   * @returns {boolean} True if the device has touch capabilities, false otherwise
   */
  static hasTouchCapability() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
} 
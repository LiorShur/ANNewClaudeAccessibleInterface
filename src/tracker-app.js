// Enhanced tracking interface integrated with your existing AccessNature system
console.log('🚀 AccessNature Enhanced Tracker Loading...');

// Import your existing modules
import { AppState } from './core/storage.js';
import { MapController } from './core/map.js';
import { TrackingController } from './core/tracking.js';
import { TimerController } from './core/timer.js';
import { AccessibilityForm } from './features/accessibility.js';
import { MediaController } from './features/media.js';
import { ExportController } from './features/export.js';
import { FirebaseController } from './features/firebase.js';
import { NavigationController } from './ui/navigation.js';
import { CompassController } from './ui/compass.js';

// Enhanced tracking interface that integrates with your existing system
class EnhancedTrackingInterface {
  constructor() {
    console.log('📱 Initializing Enhanced Tracking Interface...');
    
    this.state = 'idle'; // idle, tracking, paused
    this.heading = 0;
    this.isMapRotationEnabled = false;
    
    // Initialize your existing controllers
    this.appState = new AppState();
    this.mapController = new MapController();
    this.trackingController = new TrackingController(this.appState);
    this.timerController = new TimerController();
    this.accessibilityForm = new AccessibilityForm();
    this.mediaController = new MediaController(this.appState);
    this.exportController = new ExportController(this.appState);
    this.firebaseController = new FirebaseController();
    this.navigationController = new NavigationController();
    this.compassController = new CompassController();
    
    this.initializeSystem();
  }

  async initializeSystem() {
    try {
      console.log('🔧 Setting up integrated system...');
      
      // Set up dependencies between controllers
      this.trackingController.setDependencies({
        map: this.mapController,
        timer: this.timerController
      });
      
      this.compassController.setDependencies({
        map: this.mapController
      });
      
      this.exportController.setDependencies({
        map: this.mapController
      });

      // Initialize all controllers
      await this.mapController.initialize();
      this.timerController.initialize();
      this.accessibilityForm.initialize();
      this.mediaController.initialize();
      this.exportController.initialize();
      await this.firebaseController.initialize();
      this.navigationController.initialize();
      this.compassController.initialize();

      // Set up enhanced UI controls
      this.initializeEnhancedControls();
      this.setupCompass();
      this.setupKeyboardShortcuts();
      
      // Check for unsaved routes
      await this.checkForBackupRoute();
      
      this.announceAppReady();
      console.log('✅ Enhanced Tracking Interface Ready!');
      
    } catch (error) {
      console.error('❌ Failed to initialize system:', error);
      alert('Failed to initialize tracking system: ' + error.message);
    }
  }

  initializeEnhancedControls() {
    console.log('🎮 Setting up enhanced controls...');
    
    const playPauseBtn = document.getElementById('playPauseBtn');
    const saveBtn = document.getElementById('saveBtn');
    const mapRotationToggle = document.getElementById('mapRotationToggle');

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => this.handlePlayPause());
      playPauseBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handlePlayPause();
        }
      });
    }
    
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSave());
      saveBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleSave();
        }
      });
    }
    
    if (mapRotationToggle) {
      mapRotationToggle.addEventListener('click', () => this.toggleMapRotation());
    }

    console.log('✅ Enhanced controls setup complete');
  }

  async handlePlayPause() {
    console.log(`🎯 handlePlayPause - Current state: ${this.state}`);
    
    const playPauseBtn = document.getElementById('playPauseBtn');
    const saveBtn = document.getElementById('saveBtn');

    try {
      switch(this.state) {
        case 'idle':
          console.log('▶️ Starting tracking...');
          
          // Use your existing tracking controller
          const startSuccess = await this.trackingController.start();
          if (startSuccess) {
            this.state = 'tracking';
            this.updatePlayPauseButton('tracking');
            this.enableSaveButton();
            this.announceToScreenReader('GPS tracking started');
          }
          break;
          
        case 'tracking':
          console.log('⏸️ Pausing tracking...');
          
          const pauseSuccess = this.trackingController.togglePause();
          if (pauseSuccess) {
            this.state = 'paused';
            this.updatePlayPauseButton('paused');
            this.announceToScreenReader('GPS tracking paused');
          }
          break;
          
        case 'paused':
          console.log('▶️ Resuming tracking...');
          
          const resumeSuccess = this.trackingController.togglePause();
          if (resumeSuccess) {
            this.state = 'tracking';
            this.updatePlayPauseButton('tracking');
            this.announceToScreenReader('GPS tracking resumed');
          }
          break;
      }
      
      console.log(`✅ State changed to: ${this.state}`);
      
    } catch (error) {
      console.error('❌ Play/Pause action failed:', error);
      alert('Failed to start/pause tracking: ' + error.message);
    }
  }

  async handleSave() {
    console.log(`💾 handleSave - Current state: ${this.state}`);
    
    if (this.state === 'tracking' || this.state === 'paused') {
      try {
        // Use your existing tracking controller's stop method
        const stopSuccess = this.trackingController.stop();
        
        if (stopSuccess) {
          this.state = 'idle';
          this.updatePlayPauseButton('idle');
          this.updateSaveButton('saving');
          
          this.announceToScreenReader('Tracking stopped, route saved');
          
          // Reset save button after animation
          setTimeout(() => {
            this.updateSaveButton('idle');
          }, 2000);
        }
        
      } catch (error) {
        console.error('❌ Save action failed:', error);
        alert('Failed to save route: ' + error.message);
      }
    } else {
      console.log('⚠️ Cannot save - not currently tracking');
    }
  }

  updatePlayPauseButton(state) {
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (!playPauseBtn) return;

    switch(state) {
      case 'idle':
        playPauseBtn.innerHTML = '<span aria-hidden="true">▶</span><span class="sr-only">Start Tracking</span>';
        playPauseBtn.setAttribute('aria-label', 'Start tracking');
        playPauseBtn.className = 'control-button play-pause-btn';
        break;
      case 'tracking':
        playPauseBtn.innerHTML = '<span aria-hidden="true">⏸</span><span class="sr-only">Pause Tracking</span>';
        playPauseBtn.setAttribute('aria-label', 'Pause tracking');
        playPauseBtn.className = 'control-button play-pause-btn tracking';
        break;
      case 'paused':
        playPauseBtn.innerHTML = '<span aria-hidden="true">▶</span><span class="sr-only">Resume Tracking</span>';
        playPauseBtn.setAttribute('aria-label', 'Resume tracking');
        playPauseBtn.className = 'control-button play-pause-btn paused';
        break;
    }
  }

  enableSaveButton() {
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.className = 'control-button save-btn';
    }
  }

  updateSaveButton(state) {
    const saveBtn = document.getElementById('saveBtn');
    if (!saveBtn) return;

    switch(state) {
      case 'idle':
        saveBtn.disabled = true;
        saveBtn.className = 'control-button save-btn';
        break;
      case 'saving':
        saveBtn.className = 'control-button save-btn ready-to-save';
        saveBtn.disabled = true;
        break;
    }
  }

  setupCompass() {
    console.log('🧭 Setting up enhanced compass...');
    
    // Use your existing compass controller
    this.compassController.initialize();
    
    // Also set up heading display updates
    if ('DeviceOrientationEvent' in window) {
      const requestPermission = async () => {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
          try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
              this.startCompassListener();
            }
          } catch (error) {
            console.error('Compass permission failed:', error);
          }
        } else {
          this.startCompassListener();
        }
      };
      
      requestPermission();
    }
  }

  startCompassListener() {
    window.addEventListener('deviceorientation', (e) => {
      if (e.alpha !== null) {
        let newHeading = Math.round(360 - e.alpha);
        if (newHeading < 0) newHeading += 360;
        if (newHeading >= 360) newHeading -= 360;
        
        this.heading = newHeading;
        this.updateCompassDisplay();
      }
    });
  }

  updateCompassDisplay() {
    const needle = document.getElementById('compass-needle');
  const headingDisplay = document.getElementById('compass-heading');
  
  console.log('Updating compass - heading:', this.heading);
  
  if (needle) {
    // CRITICAL FIX: Use the correct transform
    const transform = `translate(-50%, -50%) rotate(${this.heading}deg)`;
    needle.style.transform = transform;
    
    // Debug: Log the applied transform
    console.log('Applied transform:', transform);
    console.log('Needle element:', needle);
    console.log('Computed styles:', window.getComputedStyle(needle));
    
  } else {
    console.error('Compass needle element not found!');
  }
  
  if (headingDisplay) {
    const cardinalDirection = this.getCardinalDirection(this.heading);
    const displayText = `${this.heading}° ${cardinalDirection}`;
    headingDisplay.textContent = displayText;
    
    // Debug: Log the heading display
    console.log('Heading display text:', displayText);
    console.log('Heading element:', headingDisplay);
    
  } else {
    console.error('Compass heading display element not found!');
  }
  }

  getCardinalDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  // async toggleMapRotation() {
  //   console.log('🔄 Toggling map rotation...');
    
  //   try {
  //     // Use your existing compass controller
  //     await this.compassController.toggleRotation();
      
  //     // Update our state to match the compass controller
  //     this.isMapRotationEnabled = this.compassController.isRotationActive();
      
  //     // Fixed: Update UI with correct color states
  //     const toggle = document.getElementById('mapRotationToggle');
      
  //     if (toggle) {
  //       if (this.isMapRotationEnabled) {
  //         toggle.classList.add('active');
  //         toggle.setAttribute('aria-label', 'Disable map rotation');
  //         toggle.title = 'Disable map rotation';
  //         this.announceToScreenReader('Map rotation enabled - map will follow device orientation');
  //         console.log('✅ Map rotation enabled');
  //         // Hook into compass controller's orientation updates
  //       this.connectToCompassController();
  //       } else {
  //         toggle.classList.remove('active');
  //         toggle.setAttribute('aria-label', 'Enable map rotation');
  //         toggle.title = 'Enable map rotation with device orientation';
  //         this.announceToScreenReader('Map rotation disabled - map orientation locked');
  //         console.log('❌ Map rotation disabled');
  //         this.disconnectFromCompassController();
  //       }
  //     }
      
  //   } catch (error) {
  //     console.error('❌ Map rotation toggle failed:', error);
      
  //     // Fallback: manually toggle the UI state
  //     this.isMapRotationEnabled = !this.isMapRotationEnabled;
  //     const toggle = document.getElementById('mapRotationToggle');
      
  //     if (toggle) {
  //       if (this.isMapRotationEnabled) {
  //         toggle.classList.add('active');
  //       } else {
  //         toggle.classList.remove('active');
  //       }
  //     }
  //   }
  // }
async toggleMapRotation() {
  console.log('Toggling map rotation...');
  
  try {
    await this.compassController.toggleRotation();
    this.isMapRotationEnabled = this.compassController.isRotationActive();
    
    const toggle = document.getElementById('mapRotationToggle');
    
    if (toggle) {
      if (this.isMapRotationEnabled) {
        toggle.classList.add('active');
        // Hook into compass controller's orientation updates
        this.connectToCompassController();
      } else {
        toggle.classList.remove('active');
        this.disconnectFromCompassController();
      }
    }
  } catch (error) {
    console.error('Map rotation toggle failed:', error);
  }
}
 connectToCompassController() {
  // Store the original handler so we can restore it later
  if (!this.originalCompassHandler) {
    this.originalCompassHandler = this.compassController.handleOrientationChange;
  }
  
  // Override the compass controller's handleOrientationChange
  this.compassController.handleOrientationChange = (event) => {
    // Call original handler for map rotation
    this.originalCompassHandler.call(this.compassController, event);
    
    // Update needle display
    if (event.alpha !== null) {
      let newHeading = Math.round(360 - event.alpha);
      if (newHeading < 0) newHeading += 360;
      if (newHeading >= 360) newHeading -= 360;
      
      this.heading = newHeading;
      this.updateCompassDisplay();
    }
  };
}

disconnectFromCompassController() {
  // Restore the original handler
  if (this.originalCompassHandler) {
    this.compassController.handleOrientationChange = this.originalCompassHandler;
  }
  
  // Optionally reset needle to north or stop updating
  this.heading = 0;
  this.updateCompassDisplay();
}

  setupKeyboardShortcuts() {
    console.log('⌨️ Setting up keyboard shortcuts...');
    
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch(e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          this.handlePlayPause();
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.handleSave();
          }
          break;
        case 'a':
          e.preventDefault();
          this.openAccessibilityForm();
          break;
        case 'escape':
          this.closeAccessibilityForm();
          this.navigationController.hideAllPanels();
          break;
        case 'r':
          e.preventDefault();
          this.toggleMapRotation();
          break;
        case 'p':
          e.preventDefault();
          this.takePhoto();
          break;
        case 'n':
          e.preventDefault();
          this.addTextNote();
          break;
      }
    });
  }

  async checkForBackupRoute() {
    console.log('🔍 Checking for unsaved route backup...');
    
    try {
      const backup = await this.appState.checkForUnsavedRoute();
      if (backup) {
        const message = `🔥 Found unsaved route backup:
        
📍 ${backup.routeData.filter(p => p.type === 'location').length} GPS points
📸 ${backup.routeData.filter(p => p.type === 'photo').length} photos  
📝 ${backup.routeData.filter(p => p.type === 'text').length} notes
📏 ${backup.totalDistance?.toFixed(2) || 0} km
⏱️ ${this.formatTime(backup.elapsedTime || 0)}

Would you like to restore this route?`;

        const shouldRestore = confirm(message);
        if (shouldRestore) {
          console.log('🔧 Restoring backup route...');
          const restored = this.appState.restoreFromBackup(backup);
          
          if (restored) {
            this.announceToScreenReader('Route backup restored successfully');
            
            // Update timer display if there's elapsed time
            if (backup.elapsedTime) {
              this.timerController.setElapsedTime(backup.elapsedTime);
            }
            
            console.log('✅ Route backup restored successfully');
          } else {
            console.error('❌ Failed to restore backup');
          }
        } else {
          // Clear the backup if user doesn't want it
          await this.appState.clearRouteBackup();
        }
      }
    } catch (error) {
      console.error('❌ Error checking for backup:', error);
    }
  }

  openAccessibilityForm() {
    console.log('♿ Opening accessibility form...');
    this.accessibilityForm.open();
  }

  closeAccessibilityForm() {
    console.log('❌ Closing accessibility form...');
    this.accessibilityForm.close();
  }

  async takePhoto() {
    console.log('📷 Taking photo...');
    try {
      await this.mediaController.capturePhoto();
    } catch (error) {
      console.error('❌ Photo capture failed:', error);
    }
  }

  async addTextNote() {
    console.log('📝 Adding text note...');
    try {
      await this.mediaController.addTextNote();
    } catch (error) {
      console.error('❌ Note addition failed:', error);
    }
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  announceToScreenReader(message) {
    console.log('🔊 Screen reader announcement:', message);
    
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }

  announceAppReady() {
    setTimeout(() => {
      this.announceToScreenReader('AccessNature Enhanced Tracker ready. Use spacebar to start tracking, A for accessibility survey.');
    }, 1000);
  }

  // Expose controllers for global access (for your existing system)
  getController(name) {
    const controllers = {
      'state': this.appState,
      'map': this.mapController,
      'tracking': this.trackingController,
      'timer': this.timerController,
      'accessibility': this.accessibilityForm,
      'media': this.mediaController,
      'export': this.exportController,
      'firebase': this.firebaseController,
      'navigation': this.navigationController,
      'compass': this.compassController
    };
    
    return controllers[name];
  }

  // Get tracking statistics
  getTrackingStats() {
    return {
      isTracking: this.state === 'tracking',
      isPaused: this.state === 'paused',
      totalDistance: this.appState.getTotalDistance(),
      elapsedTime: this.appState.getElapsedTime(),
      pointCount: this.appState.getRouteData().length
    };
  }
}

// Global functions for compatibility with your existing HTML onclick handlers
window.openAccessibilityForm = function() {
  console.log('🌍 Global openAccessibilityForm called');
  if (window.AccessNatureApp) {
    window.AccessNatureApp.openAccessibilityForm();
  }
};

window.closeAccessibilityForm = function() {
  console.log('🌍 Global closeAccessibilityForm called');
  if (window.AccessNatureApp) {
    window.AccessNatureApp.closeAccessibilityForm();
  }
};

window.addTextNote = function() {
  console.log('🌍 Global addTextNote called');
  if (window.AccessNatureApp) {
    window.AccessNatureApp.addTextNote();
  }
};

window.togglePanel = function(panelId) {
  console.log('🌍 Global togglePanel called:', panelId);
  if (window.AccessNatureApp) {
    const nav = window.AccessNatureApp.getController('navigation');
    if (nav) {
      nav.togglePanel(panelId);
    }
  }
};

window.showRouteDataOnMap = function() {
  console.log('🌍 Global showRouteDataOnMap called');
  if (window.AccessNatureApp) {
    const state = window.AccessNatureApp.getController('state');
    const map = window.AccessNatureApp.getController('map');
    
    if (state && map) {
      const routeData = state.getRouteData();
      if (routeData.length > 0) {
        map.showRouteData(routeData);
      } else {
        alert('No route data to display on map');
      }
    }
  }
};

// Initialize the enhanced system when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🎯 DOM Content Loaded - Initializing Enhanced AccessNature App...');
  
  try {
    // Create global app instance
    window.AccessNatureApp = new EnhancedTrackingInterface();
    
    // Initialize photo button
    const takePhotoBtn = document.getElementById('takePhotoBtn');
    if (takePhotoBtn) {
      takePhotoBtn.addEventListener('click', function() {
        console.log('📷 Photo button clicked');
        window.AccessNatureApp.takePhoto();
      });
    }
    
    // Handle accessibility form submission
    document.addEventListener('submit', function(e) {
      if (e.target.id === 'accessibilityForm') {
        e.preventDefault();
        console.log('📋 Accessibility form submitted');
        
        // Let your existing accessibility form handle it
        const accessibilityController = window.AccessNatureApp.getController('accessibility');
        if (accessibilityController) {
          accessibilityController.handleFormSubmit(e);
        }
      }
    });
    
    console.log('🎉 Enhanced AccessNature Tracker Fully Loaded and Integrated!');
    
  } catch (error) {
    console.error('❌ Failed to initialize Enhanced AccessNature App:', error);
    alert('Failed to initialize application: ' + error.message);
  }
});

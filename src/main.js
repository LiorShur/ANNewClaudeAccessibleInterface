// Main V2 - Accessible tracker with integrated functionality
import { AppState } from './core/storage.js';
import { MapController } from './core/map.js';
import { TrackingController } from './core/tracking.js';
import { TimerController } from './core/timer.js';
import { NavigationController } from './ui/navigation.js';
import { CompassController } from './ui/compass.js';
import { AccessibilityForm } from './features/accessibility.js';
import { MediaController } from './features/media.js';
import { ExportController } from './features/export.js';
import { FirebaseController } from './features/firebase.js';
import { AuthController } from './features/auth.js';

class AccessNatureTrackerV2 {
  constructor() {
    this.controllers = {};
    this.isInitialized = false;
    this.accessibleUI = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🌲 Access Nature V2 starting...');

      // Initialize core systems
      this.controllers.state = new AppState();
      this.controllers.map = new MapController();
      this.controllers.tracking = new TrackingController(this.controllers.state);
      this.controllers.timer = new TimerController();

      // Initialize UI controllers
      this.controllers.navigation = new NavigationController();
      this.controllers.compass = new CompassController();

      // Initialize feature controllers
      this.controllers.accessibility = new AccessibilityForm();
      this.controllers.media = new MediaController(this.controllers.state);
      this.controllers.export = new ExportController(this.controllers.state);
      this.controllers.firebase = new FirebaseController();
      this.controllers.auth = new AuthController();

      // Set up dependencies
      this.setupControllerDependencies();

      // Initialize all controllers
      await this.initializeControllers();

      // Initialize the new accessible UI
      this.accessibleUI = new AccessibleTrackingInterface(this.controllers);

      // Handle unsaved route restoration
      await this.handleUnsavedRoute();

      // Load initial state
      await this.loadInitialState();

      // Set up global error handling
      this.setupErrorHandling();

      this.isInitialized = true;
      console.log('✅ Access Nature V2 initialization complete');

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      this.showError('Failed to initialize application. Please refresh the page.');
    }
  }

  setupControllerDependencies() {
    this.controllers.tracking.setDependencies({
      timer: this.controllers.timer,
      map: this.controllers.map,
      media: this.controllers.media
    });

    this.controllers.export.setDependencies({
      map: this.controllers.map,
      accessibility: this.controllers.accessibility
    });

    this.controllers.compass.setDependencies({
      map: this.controllers.map
    });
  }

  async initializeControllers() {
    const initPromises = Object.entries(this.controllers).map(async ([name, controller]) => {
      try {
        if (typeof controller.initialize === 'function') {
          await controller.initialize();
          console.log(`✅ ${name} controller initialized`);
        }
      } catch (error) {
        console.error(`❌ Failed to initialize ${name} controller:`, error);
      }
    });

    await Promise.all(initPromises);
  }

  async handleUnsavedRoute() {
    try {
      await this.waitForStateController();
      const backupData = await this.controllers.state.checkForUnsavedRoute();
      
      if (backupData && this.accessibleUI) {
        const success = await this.accessibleUI.showRestoreDialog(backupData);
        if (success) {
          console.log('✅ Route restoration completed');
        }
      }
    } catch (error) {
      console.error('❌ Error handling unsaved route:', error);
    }
  }

  async waitForStateController() {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      if (this.controllers.state && this.controllers.state.dbReady !== undefined) {
        if (this.controllers.state.dbReady === false) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  async loadInitialState() {
    try {
      if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
      }
    } catch (error) {
      console.error('Failed to load initial state:', error);
    }
  }

  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleError(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(event.reason);
      event.preventDefault();
    });
  }

  handleError(error) {
    console.error('App error:', error);
    
    const isCritical = error instanceof TypeError || 
                      error instanceof ReferenceError ||
                      error.message?.includes('Firebase') ||
                      error.message?.includes('geolocation');

    if (isCritical) {
      this.showError('A critical error occurred. Some features may not work properly.');
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
  }

  getController(name) {
    return this.controllers[name];
  }
}

// New Accessible Tracking Interface
class AccessibleTrackingInterface {
  constructor(controllers) {
    this.controllers = controllers;
    this.state = 'idle'; // idle, tracking, paused
    this.announcements = [];
    
    this.initializeInterface();
    this.setupKeyboardShortcuts();
    this.setupAccessibilityFeatures();
    
    // Announce app readiness
    setTimeout(() => {
      this.announceToScreenReader('Access Nature tracker ready. Press Space to start tracking or A to open accessibility survey.');
    }, 1000);
  }

  initializeInterface() {
    // Connect the new UI to existing controllers
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');

    if (startBtn) {
      startBtn.addEventListener('click', () => this.handleStartClick());
      startBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleStartClick();
        }
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.handlePauseClick());
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => this.handleStopClick());
    }

    // Set up tracking state listener
    this.setupTrackingStateListener();
  }

  setupTrackingStateListener() {
    // Listen for tracking state changes from the tracking controller
    const trackingController = this.controllers.tracking;
    
    if (trackingController) {
      // Override the updateTrackingButtons method to use our accessible UI
      const originalUpdateButtons = trackingController.updateTrackingButtons.bind(trackingController);
      
      trackingController.updateTrackingButtons = () => {
        originalUpdateButtons();
        this.updateAccessibleUI();
      };
    }
  }

  async handleStartClick() {
    try {
      if (this.state === 'idle') {
        console.log('🎯 Starting tracking via accessible interface');
        await this.controllers.tracking.start();
        this.state = 'tracking';
        this.announceToScreenReader('Tracking started');
      } else if (this.state === 'paused') {
        this.controllers.tracking.togglePause(); // Resume
        this.state = 'tracking';
        this.announceToScreenReader('Tracking resumed');
      }
      this.updateAccessibleUI();
    } catch (error) {
      console.error('Failed to start/resume tracking:', error);
      this.announceToScreenReader('Failed to start tracking: ' + error.message);
    }
  }

  handlePauseClick() {
    if (this.state === 'tracking') {
      this.controllers.tracking.togglePause();
      this.state = 'paused';
      this.announceToScreenReader('Tracking paused');
      this.updateAccessibleUI();
    }
  }

  handleStopClick() {
    if (this.state === 'tracking' || this.state === 'paused') {
      this.controllers.tracking.stop();
      this.state = 'idle';
      this.announceToScreenReader('Tracking stopped');
      this.updateAccessibleUI();
    }
  }

  updateAccessibleUI() {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stopBtn = document.getElementById('stopBtn');
    const stateIndicator = document.getElementById('tracking-state');

    if (!startBtn || !pauseBtn || !stopBtn || !stateIndicator) return;

    // Update primary button appearance and functionality
    startBtn.className = `primary-button ${this.state}`;
    
    switch(this.state) {
      case 'idle':
        startBtn.innerHTML = '<span aria-hidden="true">▶</span><span class="sr-only">Start Tracking</span>';
        startBtn.setAttribute('aria-label', 'Start tracking trail');
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        stateIndicator.className = 'state-indicator state-idle';
        stateIndicator.textContent = 'Ready';
        break;
        
      case 'tracking':
        startBtn.innerHTML = '<span aria-hidden="true">⏸</span><span class="sr-only">Pause Tracking</span>';
        startBtn.setAttribute('aria-label', 'Pause tracking');
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        stateIndicator.className = 'state-indicator state-tracking';
        stateIndicator.textContent = 'Tracking';
        break;
        
      case 'paused':
        startBtn.innerHTML = '<span aria-hidden="true">▶</span><span class="sr-only">Resume Tracking</span>';
        startBtn.setAttribute('aria-label', 'Resume tracking');
        pauseBtn.disabled = true;
        stopBtn.disabled = false;
        stateIndicator.className = 'state-indicator state-paused';
        stateIndicator.textContent = 'Paused';
        break;
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only process if not in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      switch(e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          this.handleStartClick();
          break;
        case 'p':
          e.preventDefault();
          this.handlePauseClick();
          break;
        case 'a':
          e.preventDefault();
          this.openAccessibilityForm();
          break;
        case 'c':
          e.preventDefault();
          document.getElementById('takePhotoBtn')?.click();
          break;
        case 'n':
          e.preventDefault();
          this.addTextNote();
          break;
        case 'escape':
          if (this.state === 'tracking' || this.state === 'paused') {
            this.handleStopClick();
          }
          this.hideAllPanels();
          break;
        case 'm':
          e.preventDefault();
          this.toggleQuickMenu();
          break;
      }
    });
  }

  setupAccessibilityFeatures() {
    // Ensure all interactive elements are focusable
    this.makeFocusable();
    
    // Set up ARIA live regions for announcements
    this.setupLiveRegions();
    
    // Enhanced focus management
    this.setupFocusManagement();
    
    // Voice control readiness
    this.setupVoiceControlSupport();
  }

  makeFocusable() {
    const interactiveElements = document.querySelectorAll('button, [role="button"], [tabindex]');
    interactiveElements.forEach(element => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
    });
  }

  setupLiveRegions() {
    // Create announcement container if it doesn't exist
    if (!document.getElementById('announcements')) {
      const announcements = document.createElement('div');
      announcements.id = 'announcements';
      announcements.setAttribute('aria-live', 'polite');
      announcements.setAttribute('aria-atomic', 'true');
      announcements.className = 'sr-only';
      document.body.appendChild(announcements);
    }
  }

  setupFocusManagement() {
    // Trap focus in modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.bottom-popup:not(.hidden), .auth-modal:not(.hidden), .overlay:not(.hidden)');
        if (modal) {
          this.trapFocus(e, modal);
        }
      }
    });
  }

  trapFocus(e, container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }

  setupVoiceControlSupport() {
    // Add data attributes for voice control software
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      const label = button.getAttribute('aria-label') || button.textContent.trim();
      if (label) {
        button.setAttribute('data-voice-command', label.toLowerCase());
      }
    });
  }

  announceToScreenReader(message, priority = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Clean up after announcement
    setTimeout(() => {
      if (announcement.parentNode) {
        document.body.removeChild(announcement);
      }
    }, 1000);

    // Also log for debugging
    console.log(`📢 Screen reader: ${message}`);
  }

  openAccessibilityForm() {
    this.announceToScreenReader('Opening accessibility survey');
    if (window.openAccessibilityForm) {
      window.openAccessibilityForm();
    } else {
      console.warn('Accessibility form function not available');
    }
  }

  addTextNote() {
    this.announceToScreenReader('Adding text note');
    if (window.addTextNote) {
      window.addTextNote();
    }
  }

  toggleQuickMenu() {
    const menu = document.getElementById('quickActionsPanel');
    if (menu) {
      const isHidden = menu.classList.contains('hidden');
      this.hideAllPanels();
      
      if (isHidden) {
        menu.classList.remove('hidden');
        menu.setAttribute('aria-expanded', 'true');
        this.announceToScreenReader('Quick menu opened');
        
        // Focus first button in menu
        const firstButton = menu.querySelector('button');
        if (firstButton) {
          setTimeout(() => firstButton.focus(), 100);
        }
      } else {
        this.announceToScreenReader('Quick menu closed');
      }
    }
  }

  hideAllPanels() {
    const panels = document.querySelectorAll('.bottom-popup');
    panels.forEach(panel => {
      panel.classList.add('hidden');
      panel.setAttribute('aria-expanded', 'false');
    });
  }

  async showRestoreDialog(backupData) {
    return new Promise((resolve) => {
      try {
        if (!backupData || typeof backupData !== 'object') {
          console.error('Invalid backup data structure');
          resolve(false);
          return;
        }

        const backupDate = new Date(backupData.backupTime || Date.now()).toLocaleString();
        const routeData = backupData.routeData || [];
        const distance = (backupData.totalDistance || 0).toFixed(2);
        
        const locationPoints = routeData.filter(p => p && p.type === 'location').length;
        const photos = routeData.filter(p => p && p.type === 'photo').length;
        const notes = routeData.filter(p => p && p.type === 'text').length;

        const restoreMessage = `🔄 UNSAVED ROUTE FOUND!

📅 Created: ${backupDate}

📊 Route Details:
📏 Distance: ${distance} km
📍 GPS Points: ${locationPoints}
📷 Photos: ${photos}
📝 Notes: ${notes}

This route was not saved before the app was closed.

Would you like to restore it?

✅ OK = Restore and continue route
❌ Cancel = Start fresh (data will be lost)`;

        const shouldRestore = confirm(restoreMessage);
        
        if (shouldRestore) {
          console.log('👤 User chose to restore route');
          
          const success = this.controllers.state.restoreFromBackup(backupData);
          
          if (success) {
            this.showSuccessMessage(`✅ Route restored! ${distance} km and ${locationPoints} GPS points recovered.`);
            this.announceToScreenReader(`Route restored successfully. ${distance} kilometers and ${locationPoints} GPS points recovered. You can now continue tracking or save the route.`);
            resolve(true);
          } else {
            this.showError('❌ Failed to restore route. Starting fresh.');
            this.controllers.state.clearRouteBackup();
            resolve(false);
          }
        } else {
          const confirmDiscard = confirm(`⚠️ Are you sure you want to discard this route?

This will permanently delete:
- ${distance} km of tracked distance
- ${locationPoints} GPS points
- ${photos} photos
- ${notes} notes

This action cannot be undone!`);
          
          if (confirmDiscard) {
            this.controllers.state.clearRouteBackup();
            this.showSuccessMessage('🗑️ Route data discarded. Starting fresh.');
            resolve(false);
          } else {
            // User changed their mind, try restore
            const success = this.controllers.state.restoreFromBackup(backupData);
            if (success) {
              this.showSuccessMessage(`✅ Route restored! ${distance} km recovered.`);
              resolve(true);
            } else {
              this.showError('❌ Failed to restore route.');
              resolve(false);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in restore dialog:', error);
        this.showError('❌ Error during route restoration.');
        this.controllers.state.clearRouteBackup();
        resolve(false);
      }
    });
  }

  showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 4000);
    
    // Also announce to screen reader
    this.announceToScreenReader(message);
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
    
    // Also announce to screen reader with assertive priority
    this.announceToScreenReader(message, 'assertive');
  }
}

// Global app instance
let app = null;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 DOM loaded, initializing Access Nature V2...');
  app = new AccessNatureTrackerV2();
  await app.initialize();
  window.AccessNatureApp = app;
});

// Global functions for HTML onclick handlers (maintain compatibility)
window.openAccessibilityForm = (callback) => {
  console.log('🔧 Opening accessibility form');
  app?.getController('accessibility')?.open(callback);
};

window.closeAccessibilityForm = () => {
  console.log('🔧 Closing accessibility form');
  app?.getController('accessibility')?.close();
};

window.addTextNote = () => {
  console.log('📝 Adding text note');
  app?.getController('media')?.addTextNote();
};

window.showRouteDataOnMap = () => {
  console.log('🗺️ Showing route data on map');
  const routeData = app?.getController('state')?.getRouteData();
  app?.getController('map')?.showRouteData(routeData);
};

window.togglePanel = (panelId) => {
  console.log('📱 Toggling panel:', panelId);
  
  // Hide all panels first
  const panels = document.querySelectorAll('.bottom-popup');
  panels.forEach(panel => {
    if (panel.id !== panelId) {
      panel.classList.add('hidden');
      panel.setAttribute('aria-expanded', 'false');
    }
  });

  // Toggle the requested panel
  const targetPanel = document.getElementById(panelId);
  if (targetPanel) {
    const isHidden = targetPanel.classList.contains('hidden');
    targetPanel.classList.toggle('hidden');
    targetPanel.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    
    // Focus management
    if (isHidden) {
      const firstButton = targetPanel.querySelector('button');
      if (firstButton) {
        setTimeout(() => firstButton.focus(), 100);
      }
    }
  }
};

window.showStorageMonitor = () => {
  console.log('💾 Showing storage monitor');
  app?.getController('navigation')?.showStorageMonitor();
};

window.triggerImport = () => {
  console.log('📥 Triggering import');
  app?.getController('export')?.triggerImport();
};

window.confirmAndResetApp = () => {
  console.log('🔄 Confirming app reset');
  if (confirm('Reset everything? This will delete all data and cannot be undone.')) {
    app?.getController('state')?.clearAllAppData();
    location.reload();
  }
};

// Enhanced global functions for trail guides
window.loadMyTrailGuides = () => {
  console.log('🌐 Loading trail guides');
  const auth = app?.getController('auth');
  if (auth && typeof auth.loadMyTrailGuides === 'function') {
    auth.loadMyTrailGuides();
  } else {
    console.error('Auth controller or method not available');
    alert('Please sign in to access your trail guides.');
  }
};

window.viewMyTrailGuide = (guideId) => app?.getController('auth')?.viewTrailGuide(guideId);
window.toggleGuideVisibility = (guideId, makePublic) => app?.getController('auth')?.toggleTrailGuideVisibility(guideId, makePublic);
window.deleteTrailGuide = (guideId) => app?.getController('auth')?.deleteTrailGuide(guideId);

// Auth modal functions
window.showAuthModal = () => app?.getController('auth')?.showAuthModal();
window.closeAuthModal = () => app?.getController('auth')?.closeAuthModal();
window.switchToLogin = () => app?.getController('auth')?.switchToLogin();
window.switchToSignup = () => app?.getController('auth')?.switchToSignup();

export { AccessNatureTrackerV2 };
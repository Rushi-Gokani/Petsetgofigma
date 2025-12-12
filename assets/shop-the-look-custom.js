/**
 * Shop The Look Custom - Hotspot functionality
 * This script handles the hotspot interactions for the shop-the-look-custom section
 */

document.addEventListener("DOMContentLoaded", function() {
  // Function to initialize hotspots for a specific section
  function initializeHotspots(sectionId) {
    // Get all hotspot elements in the section
    const hotspotItems = document.querySelectorAll(`.section-${sectionId} .hotspot-item`);
    const backdrop = document.querySelector(`.section-${sectionId} .hotspot-backdrop`);
    
    if (!hotspotItems.length) return;
    
    // Process each hotspot
    hotspotItems.forEach(hotspot => {
      const hotspotId = hotspot.getAttribute('data-hotspot-id');
      const hotspotIcon = hotspot.querySelector('.hotspot-icon');
      const popover = document.getElementById(`popover-${hotspotId}`);
      const closeButton = popover?.querySelector('.mbl-po-btn');
      
      // Add click event to hotspot icon
      hotspotIcon.addEventListener('click', function(event) {
        event.stopPropagation();
        
        const isActive = hotspot.classList.contains('active');
        
        // Reset all hotspots first
        resetAllHotspots(sectionId);
        
        // If not already active, activate this hotspot
        if (!isActive) {
          hotspot.classList.add('active');
          hotspotIcon.classList.add('active');
          if (popover) {
            popover.setAttribute('open', '');
          }
          if (backdrop) {
            backdrop.classList.add('active');
          }
          document.body.classList.add('no-scroll');
        }
      });
      
      // Add click event to close button if it exists
      if (closeButton) {
        closeButton.addEventListener('click', function(event) {
          event.stopPropagation();
          resetAllHotspots(sectionId);
        });
      }
    });
    
    // Close hotspots when clicking outside
    document.addEventListener('click', function() {
      resetAllHotspots(sectionId);
    });
    
    // Prevent backdrop click from closing popup
    if (backdrop) {
      backdrop.addEventListener('click', function(event) {
        event.stopPropagation();
      });
    }
    
    // Stop propagation on popover clicks to prevent closing
    const popovers = document.querySelectorAll(`.section-${sectionId} .hot-spot-popover`);
    popovers.forEach(popover => {
      popover.addEventListener('click', function(event) {
        event.stopPropagation();
      });
    });
  }
  
  // Function to reset all hotspots in a section
  function resetAllHotspots(sectionId) {
    const hotspots = document.querySelectorAll(`.section-${sectionId} .hotspot-item`);
    const backdrop = document.querySelector(`.section-${sectionId} .hotspot-backdrop`);
    
    hotspots.forEach(hotspot => {
      hotspot.classList.remove('active');
      const icon = hotspot.querySelector('.hotspot-icon');
      if (icon) icon.classList.remove('active');
      
      const hotspotId = hotspot.getAttribute('data-hotspot-id');
      const popover = document.getElementById(`popover-${hotspotId}`);
      if (popover) {
        popover.removeAttribute('open');
      }
    });
    
    if (backdrop) {
      backdrop.classList.remove('active');
    }
    document.body.classList.remove('no-scroll');
  }
  
  // Initialize all shop-the-look sections on the page
  const shopTheLookSections = document.querySelectorAll('[id^="shopify-section-"]');
  shopTheLookSections.forEach(section => {
    const sectionId = section.id.replace('shopify-section-', '');
    if (section.querySelector(`.section-${sectionId}`)) {
      initializeHotspots(sectionId);
    }
  });
});

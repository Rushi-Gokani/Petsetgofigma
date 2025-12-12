document.addEventListener('DOMContentLoaded', function() {
  // Wait for Alpine.js to initialize
  setTimeout(function() {
    // Force the announcement slider to recalculate its dimensions
    const slider = document.getElementById('announcement-slider');
    if (slider) {
      const event = new Event('resize');
      window.dispatchEvent(event);
    }
  }, 500);
});

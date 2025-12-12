document.addEventListener('DOMContentLoaded', () => {
  // Allow theme scripts to hydrate before initializing the gallery.
  window.setTimeout(() => initProductGalleryMobile(document), 250);
});

['shopify:section:load', 'shopify:section:select'].forEach(eventName => {
  document.addEventListener(eventName, event => {
    if (!event || !event.target) return;
    initProductGalleryMobile(event.target);
  });
});

['shopify:section:unload', 'shopify:section:deselect', 'shopify:section:reorder'].forEach(eventName => {
  document.addEventListener(eventName, event => {
    if (!event || !event.target) return;
    cleanupProductGalleryMobile(event.target);
  });
});

function initProductGalleryMobile(root) {
  const context = root instanceof Element ? root : document;
  const galleries = context.querySelectorAll('.product-gallery-mobile');

  galleries.forEach(gallery => {
    if (gallery.dataset.galleryInitialized === 'true') return;
    setupMobileGallery(gallery);
  });
}

function cleanupProductGalleryMobile(root) {
  const context = root instanceof Element ? root : document;
  const galleries = context.querySelectorAll('.product-gallery-mobile');

  galleries.forEach(gallery => {
    if (gallery.dataset.galleryInitialized !== 'true') return;
    cleanupMobileGallery(gallery);
  });
}

function setupMobileGallery(gallery) {
  const carousel = gallery.querySelector('[data-gallery-carousel]');
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll('.product-gallery-mobile__media'));
  if (!slides.length) return;

  gallery.dataset.galleryInitialized = 'true';

  const thumbnails = Array.from(gallery.querySelectorAll('.product-gallery-mobile__thumbnail-btn'));
  const prevButton = gallery.querySelector('[data-gallery-prev]');
  const nextButton = gallery.querySelector('[data-gallery-next]');
  const counterCurrent = gallery.querySelector('[data-gallery-counter-current]');
  const counterTotal = gallery.querySelector('[data-gallery-counter-total]');
  const progressBar = gallery.querySelector('[data-gallery-progress]');
  const wrapper = gallery.querySelector('[data-gallery-wrapper]');

  // Store references for cleanup
  gallery._galleryCleanup = {
    resizeObserver: null,
    eventListeners: []
  };

  const totalSlides = slides.length;
  const initialIndex = clampIndex(parseInt(wrapper?.dataset.galleryInitial || wrapper?.getAttribute('data-gallery-initial') || '0', 10), totalSlides);
  let activeIndex = initialIndex;
  let isTransitioning = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let isDragging = false;

  if (counterTotal) {
    counterTotal.textContent = totalSlides;
  }

  // Set up smooth sliding carousel
  setupSmoothCarousel();
  updateUI(activeIndex, { immediate: true });
  syncProgress({ immediate: true });

  function setupSmoothCarousel() {
    // Set initial position
    updateCarouselPosition(activeIndex, { immediate: true });

    // Touch events for smooth swiping
    carousel.addEventListener('touchstart', handleTouchStart, { passive: true });
    carousel.addEventListener('touchmove', handleTouchMove, { passive: false });
    carousel.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Mouse events for desktop support
    carousel.addEventListener('mousedown', handleMouseDown);
    carousel.addEventListener('mousemove', handleMouseMove);
    carousel.addEventListener('mouseup', handleMouseUp);
    carousel.addEventListener('mouseleave', handleMouseUp);

    // Prevent text selection while dragging
    carousel.addEventListener('selectstart', preventDefault);
  }

  function handleTouchStart(e) {
    if (isTransitioning) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isDragging = true;
    carousel.style.transition = 'none';
  }

  function handleTouchMove(e) {
    if (!isDragging || isTransitioning) return;

    touchEndX = e.touches[0].clientX;
    touchEndY = e.touches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Only allow horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
      const slideWidth = carousel.clientWidth;
      const currentTranslate = -activeIndex * slideWidth;
      const newTranslate = currentTranslate + deltaX;

      carousel.style.transform = `translateX(${newTranslate}px)`;
    }
  }

  function handleTouchEnd(e) {
    if (!isDragging || isTransitioning) return;

    const deltaX = touchEndX - touchStartX;
    const slideWidth = carousel.clientWidth;
    const threshold = slideWidth * 0.2; // 20% threshold for swipe

    isDragging = false;

    if (Math.abs(deltaX) > threshold) {
      const direction = deltaX > 0 ? -1 : 1;
      const targetIndex = activeIndex + direction;
      scrollToIndex(targetIndex);
    } else {
      // Snap back to current slide
      updateCarouselPosition(activeIndex);
    }

    carousel.style.transition = '';
  }

  function handleMouseDown(e) {
    if (isTransitioning) return;
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    isDragging = true;
    carousel.style.transition = 'none';
    carousel.style.cursor = 'grabbing';
  }

  function handleMouseMove(e) {
    if (!isDragging || isTransitioning) return;

    const deltaX = e.clientX - touchStartX;
    const deltaY = e.clientY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
      const slideWidth = carousel.clientWidth;
      const currentTranslate = -activeIndex * slideWidth;
      const newTranslate = currentTranslate + deltaX;

      carousel.style.transform = `translateX(${newTranslate}px)`;
    }
  }

  function handleMouseUp(e) {
    if (!isDragging || isTransitioning) return;

    // Short-circuit on mouseleave or when clientX is undefined
    if (e.type === 'mouseleave' || e.clientX === undefined) {
      isDragging = false;
      carousel.style.cursor = 'grab';
      carousel.style.transition = '';
      updateCarouselPosition(activeIndex);
      return;
    }

    const deltaX = e.clientX - touchStartX;
    const slideWidth = carousel.clientWidth;
    const threshold = slideWidth * 0.2;

    isDragging = false;
    carousel.style.cursor = 'grab';

    if (Math.abs(deltaX) > threshold) {
      const direction = deltaX > 0 ? -1 : 1;
      const targetIndex = activeIndex + direction;
      scrollToIndex(targetIndex);
    } else {
      updateCarouselPosition(activeIndex);
    }

    carousel.style.transition = '';
  }

  function preventDefault(e) {
    if (isDragging) {
      e.preventDefault();
    }
  }

  function updateCarouselPosition(index, { immediate = false } = {}) {
    const slideWidth = carousel.clientWidth;
    const translateX = -index * slideWidth;

    if (immediate) {
      carousel.style.transition = 'none';
      carousel.style.transform = `translateX(${translateX}px)`;
      // Force a reflow
      carousel.offsetHeight;
      carousel.style.transition = '';
    } else {
      carousel.style.transform = `translateX(${translateX}px)`;
    }
  }

  function scrollToIndex(targetIndex) {
    const clampedIndex = clampIndex(targetIndex, totalSlides);
    if (clampedIndex === activeIndex || isTransitioning) return;

    isTransitioning = true;
    activeIndex = clampedIndex;

    updateCarouselPosition(activeIndex);
    updateUI(activeIndex);
    syncProgress();

    // Reset transition flag after animation
    setTimeout(() => {
      isTransitioning = false;
    }, 300);
  }

  function updateUI(index, { immediate = false } = {}) {
    if (counterCurrent) {
      counterCurrent.textContent = index + 1;
    }

    prevButton?.toggleAttribute('disabled', index === 0);
    nextButton?.toggleAttribute('disabled', index === totalSlides - 1);

    thumbnails.forEach((thumbnail, thumbIndex) => {
      const isActive = thumbIndex === index;
      thumbnail.setAttribute('aria-current', isActive ? 'true' : 'false');
      thumbnail.classList.toggle('product-gallery-mobile__thumbnail-btn--active', isActive);

      if (isActive) {
        window.requestAnimationFrame(() => {
          thumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
      }
    });

    if (immediate) {
      syncProgress({ immediate: true });
    }
  }

  function syncProgress({ immediate = false } = {}) {
    if (!progressBar) return;

    const ratio = (activeIndex + 1) / totalSlides;

    progressBar.style.transitionDuration = immediate ? '0ms' : '300ms';
    progressBar.style.transform = `scaleX(${ratio})`;
  }

  // Button click handlers
  prevButton?.addEventListener('click', () => scrollToIndex(activeIndex - 1));
  nextButton?.addEventListener('click', () => scrollToIndex(activeIndex + 1));

  thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', () => scrollToIndex(index));
  });

  // Handle resize events
  const resizeObserver = new ResizeObserver(() => {
    updateCarouselPosition(activeIndex, { immediate: true });
  });
  resizeObserver.observe(carousel);

  // Store resize observer for cleanup
  gallery._galleryCleanup.resizeObserver = resizeObserver;
}

function cleanupMobileGallery(gallery) {
  if (!gallery._galleryCleanup) return;

  const { resizeObserver, eventListeners } = gallery._galleryCleanup;

  // Disconnect ResizeObserver to prevent memory leak
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  // Remove any stored event listeners
  eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });

  // Clear cleanup references
  gallery._galleryCleanup = null;
  gallery.dataset.galleryInitialized = 'false';
}

function clampIndex(index, total) {
  if (Number.isNaN(index)) return 0;
  return Math.max(0, Math.min(index, total - 1));
}

function buildThresholds() {
  const thresholds = [];
  for (let i = 0; i <= 1; i += 0.1) {
    thresholds.push(parseFloat(i.toFixed(1)));
  }
  return thresholds;
}

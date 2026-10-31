(() => {
  'use strict';

  // ==========================================================================
  // 1. DOM ELEMENT CACHE
  // ==========================================================================
  const canvas = document.getElementById('portfolio-sequence');
  const section = document.querySelector('.hero-sequence');
  const scrollTrack = document.querySelector('.sequence-scroll');
  const frames = Array.isArray(window.PORTFOLIO_FRAMES) ? window.PORTFOLIO_FRAMES : [];
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.getElementById('primary-navigation');
  const year = document.getElementById('current-year');
  const progressBar = document.querySelector('.scroll-progress');
  const progressFill = document.querySelector('.scroll-progress__fill');
  const canvasFallback = document.getElementById('sequence-fallback');
  const backToTop = document.querySelector('.back-to-top');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Contact Form Elements
  const contactForm = document.getElementById('contact-form');
  const contactSubmitBtn = document.getElementById('contact-submit-btn');
  const contactStatus = document.getElementById('contact-status');

  // Google Forms accepts cross-origin URL-encoded submissions, but its response
  // is opaque to browser JavaScript. The form therefore reports dispatch, not
  // verified acceptance.
  const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdJACqvmSz4dn3tvr8ohkHBNLzirhma9_ThcFtKZtAcEmshhg/formResponse';
  const GOOGLE_FORM_FIELDS = {
    name: 'entry.236897307',
    email: 'entry.431285163',
    message: 'entry.330590262',
    subject: 'entry.380925257'
  };
  const RATE_LIMIT_STORAGE_KEY = 'portfolio_contact_last_sent';
  const RATE_LIMIT_COOLDOWN_MS = 30000; // 30-second rate limit between submissions
  const formInitTime = Date.now();

  // ==========================================================================
  // 2. DYNAMIC YEAR
  // ==========================================================================
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  // ==========================================================================
  // 3. NAVIGATION ACTIVE-STATE & SCROLL PROGRESS
  // ==========================================================================
  const navigationItems = navigation
    ? Array.from(navigation.querySelectorAll('a[href^="#"]'))
        .map(link => ({
          link,
          section: document.getElementById(link.getAttribute('href').slice(1))
        }))
        .filter(item => item.section)
    : [];

  function updateScrollUi() {
    const doc = document.documentElement;
    const scrollableHeight = Math.max(0, doc.scrollHeight - window.innerHeight);
    const progress = scrollableHeight
      ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight))
      : 0;

    if (progressFill) {
      progressFill.style.transform = `scaleX(${progress})`;
    }
    if (progressBar) {
      progressBar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    }
    if (backToTop) {
      backToTop.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.4);
    }

    // Active Section Tracking
    let activeSectionId = '';
    const activationLine = window.innerHeight * 0.35;

    if (window.scrollY < 80 && navigationItems.length) {
      activeSectionId = navigationItems[0].section.id;
    } else {
      navigationItems.forEach(item => {
        const rect = item.section.getBoundingClientRect();
        if (rect.top <= activationLine) {
          activeSectionId = item.section.id;
        }
      });
    }

    // Reliable bottom-of-page check (activates contact section at end of page)
    if (Math.ceil(window.innerHeight + window.scrollY) >= doc.scrollHeight - 24 && navigationItems.length) {
      activeSectionId = navigationItems[navigationItems.length - 1].section.id;
    }

    navigationItems.forEach(item => {
      if (item.section.id === activeSectionId) {
        item.link.setAttribute('aria-current', 'location');
      } else {
        item.link.removeAttribute('aria-current');
      }
    });
  }

  let scrollUiQueued = false;
  function requestScrollUiUpdate() {
    if (scrollUiQueued) return;
    scrollUiQueued = true;
    requestAnimationFrame(() => {
      scrollUiQueued = false;
      updateScrollUi();
    });
  }

  window.addEventListener('scroll', requestScrollUiUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUiUpdate, { passive: true });
  requestScrollUiUpdate();

  // ==========================================================================
  // 4. SCROLL REVEAL (CORRECTED TARGET SELECTORS)
  // ==========================================================================
  if (!motionPreference.matches && 'IntersectionObserver' in window) {
    const revealTargets = document.querySelectorAll(
      '.content-section, .skill-category-row, .featured-project-stage, .standard-project-card, .github-id-banner, .repo-item, .contribution-chart-wrap, .education-editorial-layout, .contact-editorial-container'
    );

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -28px 0px'
    });

    revealTargets.forEach(target => {
      target.classList.add('reveal-on-scroll');
      revealObserver.observe(target);
    });
    document.body.classList.add('reveal-enabled');
  }

  // ==========================================================================
  // 5. ACCESSIBLE MOBILE MENU & KEYBOARD FOCUS TRAP
  // ==========================================================================
  if (menuButton && navigation) {
    function closeNavigation(returnFocus = false) {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open navigation menu');
      navigation.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      if (returnFocus) menuButton.focus();
    }

    function openNavigation() {
      menuButton.setAttribute('aria-expanded', 'true');
      menuButton.setAttribute('aria-label', 'Close navigation menu');
      navigation.classList.add('is-open');
      document.body.classList.add('menu-open');
      const firstLink = navigation.querySelector('a');
      if (firstLink) firstLink.focus();
    }

    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeNavigation();
      } else {
        openNavigation();
      }
    });

    navigation.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => closeNavigation());
    });

    // Keyboard handling: Escape key closes menu, Tab traps focus inside
    document.addEventListener('keydown', event => {
      const isMenuOpen = menuButton.getAttribute('aria-expanded') === 'true';
      if (!isMenuOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeNavigation(true);
        return;
      }

      if (event.key === 'Tab') {
        const focusables = [menuButton, ...Array.from(navigation.querySelectorAll('a'))];
        const firstFocusable = focusables[0];
        const lastFocusable = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstFocusable) {
            event.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            event.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    });

    // Click outside to close
    document.addEventListener('click', event => {
      if (
        navigation.classList.contains('is-open') &&
        !navigation.contains(event.target) &&
        !menuButton.contains(event.target)
      ) {
        closeNavigation();
      }
    });
  }

  // ==========================================================================
  // 6. SCROLL-CONTROLLED CANVAS ANIMATION PIPELINE
  // ==========================================================================
  function showCanvasFallback() {
    if (canvasFallback) canvasFallback.hidden = false;
  }

  if (!canvas || !section || !scrollTrack || !frames.length) {
    showCanvasFallback();
  } else {
    initCanvasAnimation();
  }

  function initCanvasAnimation() {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      showCanvasFallback();
      return;
    }

    const canvasBg = '#0C0B0A';
    const images = new Array(frames.length);
    const imageStates = new Array(frames.length).fill('idle');
    const queuedFrames = [];
    const maxConcurrentLoads = 4;
    let activeLoads = 0;
    let wantedFrame = 0;
    let currentFrame = -1;
    let drawQueued = false;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let reducedMotion = motionPreference.matches;

    function sizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        currentFrame = -1; // Force immediate redraw on size change
      }
    }

    function frameForScroll() {
      if (reducedMotion) return 0;
      const rect = scrollTrack.getBoundingClientRect();
      const travel = Math.max(1, scrollTrack.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / travel));
      return Math.round(progress * (frames.length - 1));
    }

    function nearestLoadedFrame(index) {
      let nearest = -1;
      let nearestDistance = Infinity;
      images.forEach((image, frameIndex) => {
        if (image && image.complete && image.naturalWidth > 0) {
          const distance = Math.abs(frameIndex - index);
          if (distance < nearestDistance) {
            nearest = frameIndex;
            nearestDistance = distance;
          }
        }
      });
      return nearest;
    }

    function drawFrame(index) {
      const image = images[index];
      if (!image || !image.complete || !image.naturalWidth || index === currentFrame) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = canvasBg;
      ctx.fillRect(0, 0, width, height);

      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        image,
        (width - drawWidth) / 2,
        (height - drawHeight) / 2,
        drawWidth,
        drawHeight
      );

      currentFrame = index;
      if (canvasFallback) canvasFallback.hidden = true;
    }

    function pumpFrameQueue() {
      // Prioritize frames closest to wantedFrame
      queuedFrames.sort((a, b) => Math.abs(a - wantedFrame) - Math.abs(b - wantedFrame));

      while (activeLoads < maxConcurrentLoads && queuedFrames.length) {
        const index = queuedFrames.shift();
        if (imageStates[index] !== 'queued') continue;

        imageStates[index] = 'loading';
        activeLoads++;

        const image = new Image();
        images[index] = image;
        image.decoding = 'async';
        image.fetchPriority = (index === 0 || index === wantedFrame) ? 'high' : 'low';

        image.onload = () => {
          imageStates[index] = 'loaded';
          activeLoads--;
          requestDraw();
          pumpFrameQueue();
        };

        image.onerror = () => {
          imageStates[index] = 'failed';
          activeLoads--;
          if (nearestLoadedFrame(wantedFrame) < 0) {
            if (reducedMotion) {
              queueFrames(index + 1);
            } else {
              showCanvasFallback();
            }
          }
          requestDraw();
          pumpFrameQueue();
        };

        image.src = frames[index];
      }
    }

    function queueFrames(index) {
      wantedFrame = Math.min(frames.length - 1, Math.max(0, index));
      let candidates;

      if (reducedMotion) {
        if (nearestLoadedFrame(0) >= 0) return;
        const nextFrame = imageStates.findIndex(
          (state, frameIndex) =>
            frameIndex >= index && (state === 'idle' || state === 'queued' || state === 'loading')
        );
        candidates = nextFrame < 0 ? [] : [nextFrame];
      } else {
        // Queue initial frame 0, current frame, and lookahead window
        candidates = [
          ...new Set([
            0,
            ...[0, 1, -1, 2, -2, 3, 4, 5, 6, 7]
              .map(offset => wantedFrame + offset)
              .filter(frameIndex => frameIndex >= 0 && frameIndex < frames.length)
          ])
        ];
      }

      const candidateSet = new Set(candidates);
      for (let i = queuedFrames.length - 1; i >= 0; i--) {
        if (!candidateSet.has(queuedFrames[i])) {
          imageStates[queuedFrames[i]] = 'idle';
          queuedFrames.splice(i, 1);
        }
      }

      candidates.forEach(frameIndex => {
        if (imageStates[frameIndex] === 'idle') {
          imageStates[frameIndex] = 'queued';
          queuedFrames.push(frameIndex);
        }
      });

      pumpFrameQueue();
    }

    function requestDraw() {
      if (drawQueued) return;
      drawQueued = true;
      requestAnimationFrame(() => {
        drawQueued = false;
        sizeCanvas();
        const wanted = frameForScroll();
        queueFrames(wanted);
        const availableFrame = nearestLoadedFrame(wanted);
        if (availableFrame >= 0) {
          drawFrame(availableFrame);
        }
      });
    }

    window.addEventListener('scroll', requestDraw, { passive: true });
    window.addEventListener('resize', requestDraw, { passive: true });
    window.addEventListener('orientationchange', requestDraw, { passive: true });
    if ('ResizeObserver' in window) {
      new ResizeObserver(requestDraw).observe(canvas);
    }

    // Initial draw kick-off
    requestDraw();

    // Reduced motion change listener
    if (typeof motionPreference.addEventListener === 'function') {
      motionPreference.addEventListener('change', event => {
        reducedMotion = event.matches;
        requestDraw();
      });
    }
  }

  // ==========================================================================
  // 7. CONTACT FORM VALIDATION & GOOGLE FORMS SUBMISSION
  // ==========================================================================
  if (contactForm) {
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const subjectInput = document.getElementById('contact-subject');
    const messageInput = document.getElementById('contact-message');
    const nameError = document.getElementById('name-error');
    const emailError = document.getElementById('email-error');
    const messageError = document.getElementById('message-error');
    let submissionInProgress = false;

    function clearErrors() {
      [nameInput, emailInput, messageInput].forEach(input => {
        if (input) input.removeAttribute('aria-invalid');
      });
      if (nameError) nameError.textContent = '';
      if (emailError) emailError.textContent = '';
      if (messageError) messageError.textContent = '';
      if (contactStatus) {
        contactStatus.hidden = true;
        contactStatus.className = 'form-status';
        contactStatus.textContent = '';
      }
    }

    function validateEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    contactForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (submissionInProgress) return;
      clearErrors();

      // 1. Honeypot Bot Protection
      const hpInput = document.getElementById('contact-website');
      if (hpInput && hpInput.value.trim().length > 0) {
        if (contactStatus) {
          contactStatus.hidden = false;
          contactStatus.className = 'form-status is-error';
          contactStatus.textContent = 'Unable to submit this message. Please try again.';
        }
        return;
      }

      // 2. Rapid Automated Submission Guard (< 1.2s from load)
      if (Date.now() - formInitTime < 1200) {
        if (contactStatus) {
          contactStatus.hidden = false;
          contactStatus.className = 'form-status is-error';
          contactStatus.textContent = 'Please wait a moment before submitting your message.';
        }
        return;
      }

      // 3. Rate Limiting Check (30 seconds cooldown between submissions)
      try {
        const lastSent = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
        if (lastSent) {
          const elapsed = Date.now() - parseInt(lastSent, 10);
          if (elapsed < RATE_LIMIT_COOLDOWN_MS) {
            const waitSeconds = Math.ceil((RATE_LIMIT_COOLDOWN_MS - elapsed) / 1000);
            if (contactStatus) {
              contactStatus.hidden = false;
              contactStatus.className = 'form-status is-info';
              contactStatus.textContent = `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before sending another message.`;
            }
            return;
          }
        }
      } catch (storageErr) {
        // Gracefully handle private browsing storage blocks
      }

      // 4. Input Trimming & Client Validation
      const nameVal = nameInput ? nameInput.value.trim() : '';
      const emailVal = emailInput ? emailInput.value.trim() : '';
      const subjectVal = subjectInput ? subjectInput.value.trim() : '';
      const messageVal = messageInput ? messageInput.value.trim() : '';

      let hasError = false;
      let firstInvalid = null;

      if (!nameVal || nameVal.length < 2) {
        if (nameError) nameError.textContent = 'Please enter your name (at least 2 characters).';
        if (nameInput) nameInput.setAttribute('aria-invalid', 'true');
        hasError = true;
        firstInvalid = firstInvalid || nameInput;
      } else if (nameVal.length > 100) {
        if (nameError) nameError.textContent = 'Name cannot exceed 100 characters.';
        if (nameInput) nameInput.setAttribute('aria-invalid', 'true');
        hasError = true;
        firstInvalid = firstInvalid || nameInput;
      }

      if (!emailVal || !validateEmail(emailVal)) {
        if (emailError) emailError.textContent = 'Please enter a valid email address.';
        if (emailInput) emailInput.setAttribute('aria-invalid', 'true');
        hasError = true;
        firstInvalid = firstInvalid || emailInput;
      } else if (emailVal.length > 120) {
        if (emailError) emailError.textContent = 'Email address cannot exceed 120 characters.';
        if (emailInput) emailInput.setAttribute('aria-invalid', 'true');
        hasError = true;
        firstInvalid = firstInvalid || emailInput;
      }

      if (subjectVal.length > 150) {
        if (contactStatus) {
          contactStatus.hidden = false;
          contactStatus.className = 'form-status is-error';
          contactStatus.textContent = 'Subject cannot exceed 150 characters.';
        }
        hasError = true;
      }

      if (!messageVal || messageVal.length < 10) {
        if (messageError) messageError.textContent = 'Please enter a message of at least 10 characters.';
        if (messageInput) messageInput.setAttribute('aria-invalid', 'true');
        hasError = true;
        firstInvalid = firstInvalid || messageInput;
      } else if (messageVal.length > 3000) {
        if (messageError) messageError.textContent = 'Message cannot exceed 3000 characters.';
        if (messageInput) messageInput.setAttribute('aria-invalid', 'true');
        hasError = true;
        firstInvalid = firstInvalid || messageInput;
      }

      if (hasError) {
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // 5. UI Loading State
      submissionInProgress = true;
      if (contactSubmitBtn) {
        contactSubmitBtn.disabled = true;
        contactSubmitBtn.classList.add('is-loading');
        const btnText = contactSubmitBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'Sending...';
      }
      if (contactStatus) {
        contactStatus.hidden = false;
        contactStatus.className = 'form-status is-info';
        contactStatus.textContent = 'Sending your message to Google Forms...';
      }

      // 6. Send a credential-free POST. no-cors keeps the submission on this
      // page, but intentionally makes Google's acceptance response unreadable.
      try {
        const formData = new URLSearchParams();
        formData.set(GOOGLE_FORM_FIELDS.name, nameVal);
        formData.set(GOOGLE_FORM_FIELDS.email, emailVal);
        formData.set(GOOGLE_FORM_FIELDS.subject, subjectVal);
        formData.set(GOOGLE_FORM_FIELDS.message, messageVal);

        await fetch(GOOGLE_FORM_URL, {
          method: 'POST',
          mode: 'no-cors',
          credentials: 'omit',
          body: formData
        });

        try {
          localStorage.setItem(RATE_LIMIT_STORAGE_KEY, String(Date.now()));
        } catch (storageErr) {
          // Submission still works when browser storage is unavailable.
        }

        contactForm.reset();
        if (contactStatus) {
          contactStatus.hidden = false;
          contactStatus.className = 'form-status is-info';
          contactStatus.textContent = 'Your message has been sent successfully!';
        }
      } catch (err) {
        if (contactStatus) {
          contactStatus.hidden = false;
          contactStatus.className = 'form-status is-error';
          contactStatus.textContent = 'We could not send your message. Please check your connection and try again.';
        }
      } finally {
        submissionInProgress = false;
        if (contactSubmitBtn) {
          contactSubmitBtn.disabled = false;
          contactSubmitBtn.classList.remove('is-loading');
          const btnText = contactSubmitBtn.querySelector('.btn-text');
          if (btnText) btnText.textContent = 'Send Message';
        }
      }
    });
  }
})();

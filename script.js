(() => {
  'use strict';
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
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const navigationItems = navigation
    ? Array.from(navigation.querySelectorAll('a[href^="#"]')).map(link => ({
      link,
      section: document.getElementById(link.getAttribute('href').slice(1))
    })).filter(item => item.section)
    : [];
  if (year) year.textContent = String(new Date().getFullYear());

  function updateScrollUi() {
    const documentElement = document.documentElement;
    const scrollableHeight = Math.max(0, documentElement.scrollHeight - window.innerHeight);
    const progress = scrollableHeight
      ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight))
      : 0;

    if (progressFill) progressFill.style.transform = `scaleX(${progress})`;
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));

    const activationLine = window.innerHeight * 0.28;
    let activeSectionId = '';
    navigationItems.forEach(item => {
      if (item.section.getBoundingClientRect().top <= activationLine) {
        activeSectionId = item.section.id;
      }
    });
    if (window.innerHeight + window.scrollY >= documentElement.scrollHeight - 2 && navigationItems.length) {
      activeSectionId = navigationItems[navigationItems.length - 1].section.id;
    }
    navigationItems.forEach(item => {
      if (item.section.id === activeSectionId) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
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

  if (!motionPreference.matches && 'IntersectionObserver' in window) {
    const revealTargets = document.querySelectorAll('.content-section, .contact-section, .project-card, .education-card');
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -28px 0px' });

    revealTargets.forEach(target => {
      target.classList.add('reveal-on-scroll');
      revealObserver.observe(target);
    });
    document.body.classList.add('reveal-enabled');
  }

  if (menuButton && navigation) {
    function closeNavigation(returnFocus = false) {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open navigation');
      navigation.classList.remove('is-open');
      if (returnFocus) menuButton.focus();
    }

    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      menuButton.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
      navigation.classList.toggle('is-open', !isOpen);
    });
    navigation.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => closeNavigation());
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        closeNavigation(true);
      }
    });
  }

  function showCanvasFallback() {
    if (canvasFallback) canvasFallback.hidden = false;
  }

  if (!canvas || !section || !scrollTrack || !frames.length) {
    showCanvasFallback();
    return;
  }
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    showCanvasFallback();
    return;
  }
  const canvasBackground = getComputedStyle(canvas).backgroundColor;

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
      currentFrame = -1;
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
      if (image && image.complete && image.naturalWidth) {
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
    ctx.fillStyle = canvasBackground;
    ctx.fillRect(0, 0, width, height);
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    currentFrame = index;
    if (canvasFallback) canvasFallback.hidden = true;
  }

  function pumpFrameQueue() {
    queuedFrames.sort((first, second) =>
      Math.abs(first - wantedFrame) - Math.abs(second - wantedFrame));
    while (activeLoads < maxConcurrentLoads && queuedFrames.length) {
      const index = queuedFrames.shift();
      if (imageStates[index] !== 'queued') continue;
      imageStates[index] = 'loading';
      activeLoads++;
      const image = new Image();
      images[index] = image;
      image.decoding = 'async';
      image.fetchPriority = index === 0 ? 'high' : 'low';
      image.onload = () => {
        imageStates[index] = 'loaded';
        activeLoads--;
        requestDraw();
        pumpFrameQueue();
      };
      image.onerror = () => {
        imageStates[index] = 'failed';
        activeLoads--;
        console.error(`Animation frame failed to load: ${frames[index]}`);
        if (nearestLoadedFrame(wantedFrame) < 0) {
          if (reducedMotion) queueFrames(index + 1);
          else showCanvasFallback();
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
      const nextFrame = imageStates.findIndex((state, frameIndex) =>
        frameIndex >= index && (state === 'idle' || state === 'queued' || state === 'loading'));
      candidates = nextFrame < 0 ? [] : [nextFrame];
    } else {
      candidates = [...new Set([0, ...[0, -1, 1, -2, 2]
        .map(offset => wantedFrame + offset)
        .filter(frameIndex => frameIndex >= 0 && frameIndex < frames.length)])];
    }

    const candidateSet = new Set(candidates);
    for (let queueIndex = queuedFrames.length - 1; queueIndex >= 0; queueIndex--) {
      if (!candidateSet.has(queuedFrames[queueIndex])) {
        imageStates[queuedFrames[queueIndex]] = 'idle';
        queuedFrames.splice(queueIndex, 1);
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
      if (availableFrame >= 0) drawFrame(availableFrame);
    });
  }

  window.addEventListener('scroll', requestDraw, { passive: true });
  window.addEventListener('resize', requestDraw, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(requestDraw).observe(canvas);
  requestDraw();

  if (typeof motionPreference.addEventListener === 'function') {
    motionPreference.addEventListener('change', event => {
      reducedMotion = event.matches;
      requestDraw();
    });
  }
})();

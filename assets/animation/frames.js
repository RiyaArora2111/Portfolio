/* The supplied animation contains 50 sequential JPEG frames. */
window.PORTFOLIO_FRAMES = Array.from({ length: 50 }, (_, index) => {
  return `assets/animation/ezgif-frame-${String(index + 1).padStart(3, '0')}.jpg`;
});

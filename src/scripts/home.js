(function () {
  var d = document, hdr = d.querySelector('.hdr');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Header turns solid once the hero is behind us.
  function onScroll() { hdr.classList.toggle('is-solid', window.scrollY > 40); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Fade sections in and light each lantern as it enters the view.
  var io = 'IntersectionObserver' in window && new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  d.querySelectorAll('.reveal,.kitchen').forEach(function (el) { io ? io.observe(el) : el.classList.add('is-in'); });

  // Pause the looping scenery while it is off-screen to spare phone batteries.
  if (io) {
    var pause = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('is-off', !e.isIntersecting); });
    });
    d.querySelectorAll('.hero,.bar,.kitchens').forEach(function (el) { pause.observe(el); });
  }

  // The gold dragon draws itself towards the pearl as you scroll through the kitchens.
  var sec = d.getElementById('kitchens'), mask = d.getElementById('dragon-draw'), head = d.getElementById('dragon-head');
  if (!sec || !mask) return;
  function draw(p) {
    mask.style.strokeDashoffset = String(1 - p);
    head.style.opacity = p > .92 ? '1' : '0';
  }
  if (reduce) { draw(1); return; }
  var ticking = false, active = false;
  function tick() {
    ticking = false;
    var r = sec.getBoundingClientRect(), vh = window.innerHeight;
    var p = (vh - r.top) / (r.height + vh * .2);
    draw(Math.max(0, Math.min(1, p * 1.25)));
  }
  function req() { if (active && !ticking) { ticking = true; requestAnimationFrame(tick); } }
  new IntersectionObserver(function (es) { active = es[0].isIntersecting; req(); }).observe(sec);
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
})();

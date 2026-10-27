(function () {
  var d = document, q = d.getElementById('q'), empty = d.getElementById('empty');
  var secs = [].slice.call(d.querySelectorAll('.msec'));
  var btns = [].slice.call(d.querySelectorAll('.diet button'));
  var diet = 'all';
  try { diet = localStorage.getItem('soa-diet') || 'all'; } catch (e) {}

  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var items = [].slice.call(d.querySelectorAll('.item')).map(function (el) {
    return { el: el, text: norm(el.getAttribute('data-search')), vars: [].slice.call(el.querySelectorAll('.vars li')), diet: el.getAttribute('data-diet') };
  });

  function apply() {
    var term = norm(q.value.trim()), shown = 0;
    items.forEach(function (it) {
      var ok = !term || term.split(/\s+/).every(function (w) { return it.text.indexOf(w) > -1; });
      if (ok && diet !== 'all') {
        if (it.vars.length) {
          var any = false;
          it.vars.forEach(function (v) { var m = v.getAttribute('data-diet') === diet; v.hidden = !m; any = any || m; });
          ok = any;
        } else {
          // Items without a veg/non-veg label (desserts) stay visible in both views.
          ok = !it.diet || it.diet === diet;
        }
      } else {
        it.vars.forEach(function (v) { v.hidden = false; });
      }
      it.el.hidden = !ok;
      if (ok) shown++;
    });
    secs.forEach(function (s) { s.hidden = !s.querySelector('.item:not([hidden])'); });
    empty.hidden = shown > 0;
  }

  function setDiet(v) {
    diet = v;
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-diet') === v)); });
    try { localStorage.setItem('soa-diet', v); } catch (e) {}
    apply();
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { setDiet(b.getAttribute('data-diet')); }); });
  q.addEventListener('input', apply);
  setDiet(diet);

  // Highlight the category chip for the section being read.
  var cats = d.querySelector('.cats'), links = {};
  [].slice.call(cats.querySelectorAll('a')).forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var current;
  var spy = 'IntersectionObserver' in window && new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var a = links[e.target.id];
      if (!a || a === current) return;
      if (current) current.classList.remove('is-active');
      current = a; a.classList.add('is-active');
      cats.scrollTo({ left: a.offsetLeft - cats.clientWidth / 2 + a.clientWidth / 2 });
    });
  }, { rootMargin: '-160px 0px -65% 0px' });
  if (spy) secs.forEach(function (s) { spy.observe(s); });

  var top = d.querySelector('.totop');
  window.addEventListener('scroll', function () { top.classList.toggle('is-on', window.scrollY > 900); }, { passive: true });
})();

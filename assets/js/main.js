(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Sticky header shadow + back-to-top ---------- */
  var header = $('.site-header');
  var toTop = $('.to-top');
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle('scrolled', y > 10);
    if (toTop) toTop.classList.toggle('show', y > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- Mobile menu ---------- */
  var toggle = $('.menu-toggle');
  var nav = $('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('.has-dd > a', nav).forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (window.innerWidth <= 1024) {
          e.preventDefault();
          a.parentNode.classList.toggle('open');
        }
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Counters (odometer-style) ---------- */
  $$('[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var done = false;
    function run() {
      if (done) return; done = true;
      var start = null, dur = 1800;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if ('IntersectionObserver' in window) {
      var o = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { run(); o.disconnect(); }
      }, { threshold: 0.5 });
      o.observe(el);
    } else run();
  });

  /* ---------- Partner logo carousel: duplicate track for seamless loop ---------- */
  var track = $('.track');
  if (track) {
    track.innerHTML += track.innerHTML;
  }

  /* ---------- Typed text in "Your Dream. Our Effort" ---------- */
  var typed = $('.typed');
  if (typed) {
    var words = (typed.getAttribute('data-words') || 'Effort').split('|');
    var wi = 0, ci = 0, del = false;
    (function tick() {
      var w = words[wi];
      typed.textContent = w.slice(0, ci);
      var delay = del ? 60 : 130;
      if (!del && ci === w.length) { del = true; delay = 1800; }
      else if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; delay = 400; }
      else ci += del ? -1 : 1;
      setTimeout(tick, delay);
    })();
  }

  /* ---------- Testimonial slider ---------- */
  var tt = $('.t-track');
  if (tt) {
    var items = $$('.t-item', tt), idx = 0, timer;
    var dotsWrap = $('.t-dots');
    items.forEach(function (_, i) {
      var b = document.createElement('button');
      b.setAttribute('aria-label', 'Go to testimonial ' + (i + 1));
      b.addEventListener('click', function () { go(i); restart(); });
      dotsWrap.appendChild(b);
    });
    function go(i) {
      idx = (i + items.length) % items.length;
      tt.style.transform = 'translateX(' + (-idx * 100) + '%)';
      $$('button', dotsWrap).forEach(function (b, k) { b.classList.toggle('on', k === idx); });
    }
    function restart() { clearInterval(timer); timer = setInterval(function () { go(idx + 1); }, 5000); }
    $('.t-prev').addEventListener('click', function () { go(idx - 1); restart(); });
    $('.t-next').addEventListener('click', function () { go(idx + 1); restart(); });
    // swipe
    var sx = null;
    tt.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    tt.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); restart(); }
      sx = null;
    });
    go(0); restart();
  }

  /* ---------- Forms: saved to the admin dashboard (api/submit.php); falls back to email ---------- */
  var TYPES = { 'Website enquiry': 'contact', 'PTE Coaching booking': 'pte', 'Student Discount Application': 'discount', 'Refund request': 'refund' };
  $$('form[data-mailto]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var to = f.getAttribute('data-mailto');
      var subject = f.getAttribute('data-subject') || 'Website enquiry';
      var fields = {}, lines = [];
      $$('input,textarea,select', f).forEach(function (el) {
        if (el.name && el.value) { fields[el.name] = el.value; lines.push(el.name + ': ' + el.value); }
      });
      var ok = $('.form-ok', f), btn = $('button', f);
      if (btn) btn.disabled = true;
      fetch('api/submit.php', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: TYPES[subject] || 'other', subject: subject, fields: fields }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j.ok) throw new Error(j.error || 'Failed');
          if (ok) { ok.textContent = 'Thank you! Your message has been received. We will contact you soon.'; ok.style.display = 'block'; }
          f.reset();
        })
        .catch(function () {
          window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
          if (ok) { ok.textContent = 'Opening your email app to send this instead.'; ok.style.display = 'block'; }
        })
        .then(function () { if (btn) btn.disabled = false; });
    });
  });


  /* ---------- Admin-editable content (needs PHP; static markup stays as fallback) ---------- */
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function getContent(section, qs) {
    return fetch('api/content.php?section=' + section + (qs || ''), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  var offBox = $('.offices');
  if (offBox) getContent('offices').then(function (j) {
    if (!j || !j.offices) return;
    var bsel = $('select[name="Branch"]');
    if (bsel) { var cur = bsel.value; bsel.innerHTML = '<option value="">Select branch</option>' + j.offices.map(function (o) { return '<option value="' + esc(o.city) + '">' + esc(o.city) + (o.country ? ' (' + esc(o.country) + ')' : '') + '</option>'; }).join(''); bsel.value = cur; }
    offBox.innerHTML = j.offices.map(function (o) {
      var q = encodeURIComponent(o.mapq || o.address || o.city);
      return '<div class="office"><span class="sub-title">' + esc(o.country) + '</span><h3>' + esc(o.city) + '</h3>' +
        (o.call ? '<p><strong>Call</strong> ' + esc(o.call) + '</p>' : '') + (o.wa ? '<p><strong>WhatsApp</strong> ' + esc(o.wa) + '</p>' : '') +
        (o.email ? '<p><strong>Email</strong> <a href="mailto:' + esc(o.email) + '">' + esc(o.email) + '</a></p>' : '') +
        (o.address ? '<p><strong>Address</strong> ' + esc(o.address) + '</p>' : '') +
        '<iframe class="map map-sm" title="Map of ' + esc(o.city) + ' office" loading="lazy" src="https://www.google.com/maps?q=' + q + '&amp;output=embed" allowfullscreen></iframe>' +
        '<a class="map-link" href="https://www.google.com/maps/search/?api=1&amp;query=' + q + '" target="_blank" rel="noopener">Open in Google Maps &rarr;</a></div>';
    }).join('');
  });
  var homeBlog = $('.blog .blog-grid');
  if (homeBlog) getContent('posts', '&limit=3').then(function (j) {
    if (!j || !j.posts || !j.posts.length) return;
    homeBlog.innerHTML = j.posts.map(function (p) {
      var d = new Date(p.date + 'T00:00:00');
      return '<article class="post in">' + (p.image ? '<div class="thumb"><img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy"></div>' : '') +
        '<div class="body"><span class="cat">' + esc(p.category) + '</span><h4><a href="post.php?slug=' + encodeURIComponent(p.slug) + '">' + esc(p.title) + '</a></h4><div class="meta"><span>' + d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + '</span></div></div></article>';
    }).join('');
  });
  var teamBox = $('#team-section');
  if (teamBox) getContent('team').then(function (j) {
    if (!j || !j.team || !j.team.length) return;
    teamBox.innerHTML = '<h2>Our Counsellors</h2><div class="team-grid">' + j.team.map(function (m) {
      return '<div class="member">' + (m.photo ? '<img src="' + esc(m.photo) + '" alt="' + esc(m.name) + '" loading="lazy">' : '') + '<h3>' + esc(m.name) + '</h3>' + (m.role ? '<p class="role">' + esc(m.role) + '</p>' : '') + (m.bio ? '<p>' + esc(m.bio) + '</p>' : '') + '</div>';
    }).join('') + '</div>';
  });

  /* ---------- Smooth anchor offset ---------- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length > 1 && $(id)) { e.preventDefault(); $(id).scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  /* ---------- Hero video: pause when off-screen ---------- */
  $$('.hero video, .hero-mobile video').forEach(function (v) {
    if (!('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) {
      es.forEach(function (en) { en.isIntersecting ? v.play().catch(function () {}) : v.pause(); });
    }).observe(v);
  });
})();

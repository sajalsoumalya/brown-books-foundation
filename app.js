(function () {
  // Scroll: header border + reveal sections as they enter
  var bar = document.getElementById('top-bar');
  function onScroll() { if (bar) bar.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Helpers. Post text is always escaped before it reaches innerHTML.
  function esc(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }
  function fmt(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // Show only real engagement; a zero count reads as "dead", so it is omitted.
  function engage(p) {
    var bits = [];
    if (p.reactions > 0) bits.push('<span>' + esc(p.reactions) + ' reactions</span>');
    if (p.comments > 0) bits.push('<span>' + esc(p.comments) + ' comments</span>');
    return bits.join('');
  }

  // Stats (real values exported from the Facebook API)
  fetch('stats.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (s) {
      var f = typeof s.followers === 'number' ? s.followers.toLocaleString('en-IN') : '—';
      var pl = typeof s.pledge_count === 'number' ? s.pledge_count.toLocaleString('en-IN') : '—';
      var p = typeof s.posts_last_7_days === 'number' ? String(s.posts_last_7_days) : '—';
      ['proof-pledges', 'stat-pledges'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.textContent = pl;
      });
      var sf = document.getElementById('stat-followers'); if (sf) sf.textContent = f;
      var sp = document.getElementById('stat-posts'); if (sp) sp.textContent = p;
      var su = document.getElementById('stat-updated'); if (su) su.textContent = fmt(s.generated) || '—';
    })
    .catch(function () { /* leave the dashes in place */ });

  // Feed: 5 most recent posts with their photos, newest first
  var list = document.getElementById('feed-list');
  fetch('posts.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      if (!data.posts || !data.posts.length) {
        list.innerHTML = '<p class="muted">No posts yet. Check back soon.</p>';
        return;
      }
      list.innerHTML = data.posts.map(function (p, i) {
        var media = p.image
          ? '<a class="media" href="' + esc(p.url) + '" target="_blank" rel="noopener"><img src="' + esc(p.image) + '" alt="Photo from our post" loading="lazy" width="720" height="720"></a>'
          : '';
        return '<article class="post">' + media +
          '<div class="body">' +
          '<div class="head"><time datetime="' + esc(p.time) + '">' + esc(fmt(p.time)) + '</time>' +
          '<span class="rank">#' + (i + 1) + '</span></div>' +
          '<p>' + esc(p.text) + '</p>' +
          '<div class="meta">' + engage(p) +
          '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">Read on Facebook →</a></div>' +
          '</div></article>';
      }).join('');
    })
    .catch(function () {
      list.innerHTML = '<p class="muted">Latest posts are unavailable right now. See our Facebook page.</p>';
    });


  // Recent pledges: real, confirmed entries only (pledges_public.json)
  (function () {
    var box = document.getElementById('pledge-list');
    if (!box) return;
    fetch('pledges_public.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        if (!d.pledges || !d.pledges.length) {
          box.innerHTML = '<p class="muted">No pledges yet. Be the first to pledge $1 a month.</p>';
          return;
        }
        box.innerHTML = d.pledges.map(function (p) {
          var when = fmtDate(p.date);
          return '<div class="pledger">' +
            '<span class="avatar" aria-hidden="true">' + esc((p.name || '?').charAt(0).toUpperCase()) + '</span>' +
            '<div><strong>' + esc(p.name) + '</strong>' +
            '<span class="muted">pledged $1 a month for ' + esc(p.months) + (p.months === 1 ? ' month' : ' months') + '</span></div>' +
            '<time datetime="' + esc(p.date) + '">' + esc(when) + '</time>' +
            '</div>';
        }).join('');
      })
      .catch(function () { box.innerHTML = '<p class="muted">Pledges are unavailable right now.</p>'; });
  })();

  function fmtDate(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // Monthly pledge dial: 1–12 months at $1 each, set by drag or arrow keys
  (function () {
    var dial = document.getElementById('dial');
    if (!dial) return;
    var MIN = 1, MAX = 12, RATE = 1;
    var C = 2 * Math.PI * 86;                     // circumference of the ring (r=86)
    var progress = document.getElementById('dial-progress');
    var knob = document.getElementById('dial-knob');
    var totalEl = document.getElementById('dial-total');
    var labelEl = document.getElementById('dial-label');
    var pledgeBtn = document.getElementById('pledge-go');
    var months = 3;

    progress.style.strokeDasharray = C + ' ' + C;

    function render(n, animate) {
      months = Math.min(MAX, Math.max(MIN, Math.round(n)));
      var frac = (months - MIN) / (MAX - MIN) || 0;
      var arc = Math.max(frac, 1 / (MAX - MIN)) * C;       // always show at least a sliver
      progress.style.strokeDashoffset = (C - arc).toString();
      var a = -Math.PI / 2 + (months - MIN) / (MAX - MIN) * 2 * Math.PI;
      knob.setAttribute('transform', 'translate(' + (100 + 86 * Math.cos(a)) + ' ' + (100 + 86 * Math.sin(a)) + ')');
      totalEl.textContent = '$' + (months * RATE);
      labelEl.textContent = 'for ' + months + (months === 1 ? ' month' : ' months');
      dial.setAttribute('aria-valuenow', String(months));
      dial.setAttribute('aria-valuetext', '$1 a month for ' + months + (months === 1 ? ' month' : ' months') + ', $' + (months * RATE) + ' in total');
      if (animate) { totalEl.classList.remove('bump'); void totalEl.offsetWidth; totalEl.classList.add('bump'); }
      if (pledgeBtn) pledgeBtn.textContent = 'Pledge $1 a month for ' + months + (months === 1 ? ' month' : ' months');
    }

    function fromPointer(e) {
      var r = dial.getBoundingClientRect();
      var x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      var ang = Math.atan2(y, x) + Math.PI / 2;               // 0 at the top, clockwise
      if (ang < 0) ang += 2 * Math.PI;
      var n = MIN + (ang / (2 * Math.PI)) * (MAX - MIN);
      return n;
    }

    var dragging = false;
    dial.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;   // primary button / touch only
      dragging = true; dial.setPointerCapture(e.pointerId); render(fromPointer(e), true);
    });
    dial.addEventListener('pointermove', function (e) { if (dragging) render(fromPointer(e), false); });
    dial.addEventListener('pointerup', function () { dragging = false; });
    dial.addEventListener('pointercancel', function () { dragging = false; });
    dial.addEventListener('keydown', function (e) {
      var step = 0;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') step = 1;
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') step = -1;
      else if (e.key === 'Home') { render(MIN, true); e.preventDefault(); return; }
      else if (e.key === 'End') { render(MAX, true); e.preventDefault(); return; }
      if (step) { e.preventDefault(); render(months + step, true); }
    });

    render(months, false);
  })();

})();

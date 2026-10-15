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
      var p = typeof s.posts_last_7_days === 'number' ? String(s.posts_last_7_days) : '—';
      ['proof-followers', 'stat-followers'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.textContent = f;
      });
      var sp = document.getElementById('stat-posts'); if (sp) sp.textContent = p;
      var su = document.getElementById('stat-updated'); if (su) su.textContent = fmt(s.generated) || '—';
    })
    .catch(function () { /* leave the dashes in place */ });

  // Feed: top 5 ranked by the exporter, shown in rank order
  var list = document.getElementById('feed-list');
  fetch('posts.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      if (!data.posts || !data.posts.length) {
        list.innerHTML = '<p class="muted">No posts yet. Check back soon.</p>';
        return;
      }
      list.innerHTML = data.posts.map(function (p, i) {
        return '<article class="post">' +
          '<div class="head"><time datetime="' + esc(p.time) + '">' + esc(fmt(p.time)) + '</time>' +
          '<span class="rank">#' + (i + 1) + '</span></div>' +
          '<p>' + esc(p.text) + '</p>' +
          '<div class="meta">' + engage(p) +
          '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">Read on Facebook →</a></div>' +
          '</article>';
      }).join('');
    })
    .catch(function () {
      list.innerHTML = '<p class="muted">Latest posts are unavailable right now. See our Facebook page.</p>';
    });
})();

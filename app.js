(function () {
  // Reveal sections on scroll (respects reduced motion via CSS)
  var els = document.querySelectorAll('.card, .post, .request, .steps');
  els.forEach(function (el) { el.classList.add('reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  // Live feed from the exported JSON (no token in the browser)
  var list = document.getElementById('feed-list');
  fetch('posts.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      if (!data.posts || !data.posts.length) {
        list.innerHTML = '<p class="muted">No posts yet. Check back soon.</p>';
        return;
      }
      list.innerHTML = '';
      data.posts.forEach(function (p) {
        var d = new Date(p.time);
        var when = isNaN(d) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        var art = document.createElement('article');
        art.className = 'post';
        var t = document.createElement('time');
        t.textContent = when;
        var body = document.createElement('p');
        body.textContent = p.text;           // textContent: no HTML injection from post text
        var a = document.createElement('a');
        a.href = p.url; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'View on Facebook';
        a.style.fontSize = '.85rem';
        art.append(t, body, a);
        list.append(art);
      });
    })
    .catch(function () {
      list.innerHTML = '<p class="muted">Latest posts are unavailable right now. See our Facebook page.</p>';
    });
})();

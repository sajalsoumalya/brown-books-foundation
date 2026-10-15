(function () {
  // Live data from static JSON exported server-side (no token in the browser).
  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function fmt(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  fetch('stats.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (s) {
      document.getElementById('stat-followers').textContent =
        typeof s.followers === 'number' ? s.followers.toLocaleString('en-IN') : '—';
      document.getElementById('stat-posts').textContent =
        typeof s.posts_last_7_days === 'number' ? String(s.posts_last_7_days) : '—';
      document.getElementById('stat-updated').textContent = fmt(s.generated) || '—';
    })
    .catch(function () { /* stats stay as dashes */ });

  var list = document.getElementById('feed-list');
  fetch('posts.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      if (!data.posts || !data.posts.length) {
        list.innerHTML = '<p class="muted">No posts yet. Check back soon.</p>';
        return;
      }
      list.innerHTML = data.posts.map(function (p) {
        return '<article class="post">' +
          '<time datetime="' + esc(p.time) + '">' + esc(fmt(p.time)) + '</time>' +
          '<p>' + esc(p.text) + '</p>' +
          '<div class="meta">' +
            '<span>' + p.reactions + ' reactions</span>' +
            '<span>' + p.comments + ' comments</span>' +
            '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">View →</a>' +
          '</div></article>';
      }).join('');
    })
    .catch(function () {
      list.innerHTML = '<p class="muted">Latest posts are unavailable right now. See our Facebook page.</p>';
    });
})();

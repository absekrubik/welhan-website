(function () {
  'use strict';
  var root = document.getElementById('blog-root'); if (!root) return;
  var mode = root.getAttribute('data-mode');
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtDate(d) { var x = new Date(d + 'T00:00:00'); return isNaN(x) ? d : x.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  function setMeta(sel, attr, val) { var m = document.querySelector(sel); if (m) m.setAttribute(attr, val); }
  function body(txt) {   // plain text -> safe HTML: blank line = paragraph, "## " heading, "- " bullets
    return String(txt).trim().split(/\n\s*\n/).map(function (blk) {
      var lines = blk.trim().split('\n'), out = '', m = lines[0].match(/^## (.+)$/);
      if (m) { out += '<h2>' + esc(m[1]) + '</h2>'; lines.shift(); if (!lines.length) return out; }
      if (/^- /.test(lines[0])) return out + '<ul>' + lines.map(function (l) { return '<li>' + esc(l.replace(/^- /, '')) + '</li>'; }).join('') + '</ul>';
      return out + '<p>' + lines.map(esc).join('<br>') + '</p>';
    }).join('');
  }
  if (!window.WelhanAPI || !WelhanAPI.enabled) { root.innerHTML = '<p>No articles have been published yet. Please check back soon, or <a href="contact.html">contact our team</a>.</p>'; return; }
  if (mode === 'blog') {
    WelhanAPI.pub().then(function (d) {
      var posts = d && d.posts || [];
      if (!posts.length) { root.innerHTML = '<p>No articles have been published yet. Please check back soon, or <a href="contact.html">contact our team</a> with any questions.</p>'; return; }
      root.innerHTML = '<p class="blog-intro">Stay informed with the latest updates, expert tips, and trends in global education.</p><div class="blog-grid">' + posts.map(function (p) {
        return '<article class="post">' + (p.image ? '<div class="thumb"><img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy"></div>' : '') +
          '<div class="body"><span class="cat">' + esc(p.category) + '</span><h4><a href="post.html?slug=' + encodeURIComponent(p.slug) + '">' + esc(p.title) + '</a></h4><div class="meta"><span>' + fmtDate(p.date) + '</span></div><p>' + esc(p.excerpt) + '</p></div></article>';
      }).join('') + '</div>';
    });
  } else {
    var slug = new URLSearchParams(location.search).get('slug') || '';
    WelhanAPI.post(slug).then(function (j) {
      if (!j.ok) throw 0;
      var p = j.post, title = p.title + ' | Welhan Abroad Study', url = 'https://welhanabroadstudy.com/post.html?slug=' + encodeURIComponent(p.slug);
      document.title = title;
      setMeta('meta[name=description]', 'content', p.excerpt || ''); setMeta('link[rel=canonical]', 'href', url);
      setMeta('meta[property="og:title"]', 'content', title); setMeta('meta[property="og:url"]', 'content', url); setMeta('meta[property="og:description"]', 'content', p.excerpt || '');
      if (p.image) { setMeta('meta[property="og:image"]', 'content', p.image); setMeta('meta[name="twitter:image"]', 'content', p.image); }
      document.getElementById('page-h1').textContent = p.title; document.getElementById('crumb-title').textContent = p.title;
      var ld = document.createElement('script'); ld.type = 'application/ld+json';
      ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, datePublished: p.date, description: p.excerpt, image: p.image || undefined, author: { '@type': 'Organization', name: 'Welhan Abroad Study' }, mainEntityOfPage: url });
      document.head.appendChild(ld);
      root.innerHTML = '<article class="post-full">' + (p.image ? '<img class="post-hero" src="' + esc(p.image) + '" alt="' + esc(p.title) + '">' : '') + '<p class="post-meta"><span class="cat">' + esc(p.category) + '</span> · ' + fmtDate(p.date) + '</p>' + body(p.body) +
        '<p><a class="btn" href="contact.html"><span>Book an Appointment</span></a></p><p><a href="blog.html">&larr; All articles</a></p></article>';
    }).catch(function () { root.innerHTML = '<p>Sorry, we could not find that article. <a href="blog.html">Back to the blog</a>.</p>'; });
  }
})();

(function () {
  'use strict';
  var API = ((window.WELHAN_CONFIG || {}).apiUrl || '').trim(), app = document.getElementById('app');
  var S = { key: '', tab: 'dash', rows: [], labels: {}, f: { q: '', type: '', status: '', branch: '' }, prices: null, content: null, ctab: 'offices', settings: null, mail: null, flash: '' };
  var DEFAULT_OFFICES = [
    { country: 'Australia', city: 'Sydney', call: '+02 8021 1804, +61 415 594 328', wa: '+61 415 594 328', email: 'sydney@welhanabroadstudy.com', address: 'Suite 30 Level 3/104 Bathurst St, Sydney NSW 2000', mapq: 'Suite 30 Level 3/104 Bathurst St, Sydney NSW 2000' },
    { country: 'Nepal', city: 'Kathmandu', call: '+977-01-5901069, 9851088364', wa: '9851088364, 9744464990, 9744464991', email: 'admission@welhanabroadstudy.com', address: '2nd Floor Ram Nikunja Bhawan, 29 Ramshah Path, Putalisadak, Kathmandu 44600', mapq: 'Ram Nikunja Bhawan, Ramshah Path, Putalisadak, Kathmandu 44600, Nepal' },
    { country: 'Nepal', city: 'Bhanubhakta Chowk, Nepalgunj', call: '9851088364', wa: '9851088364', email: 'admission@welhanabroadstudy.com', address: 'Bypass road, Banke Nepalgunj, Lumbini province, Nepal', mapq: 'Bhanubhakta Chowk, Nepalgunj, Banke, Nepal' },
    { country: 'Nepal', city: 'Tulsipur-5, Galine, Dang', call: '9851088364', wa: '9851088364', email: 'admission@welhanabroadstudy.com', address: 'Sukrapath (Behind Kumari Bank) Butwal-8, Lumbini, Nepal', mapq: 'Tulsipur-5, Galine, Dang, Nepal' }];

  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (k === 'value') e.value = attrs[k];
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, kids) { var e = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
  function api(action, data) {   // every call is a POST carrying the admin password (text/plain avoids a CORS preflight)
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action, key: S.key }, data || {})) })
      .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Cannot reach the backend. Check the Web app URL in assets/js/config.js and your internet connection.' }; });
  }
  function show(node) { app.innerHTML = ''; app.appendChild(node); }
  function field(label, input, hint) { return el('label', { class: 'fld' }, [el('span', { text: label }), input, hint ? el('small', { text: hint }) : null]); }
  function when(j, ok) { if (j.ok) ok(); else if (j.error === 'auth') logout(); else alert(j.error || 'Failed'); }

  /* ---------- auth ---------- */
  function authScreen(msg) {
    var err = el('p', { class: 'err', text: msg || '' }), pw = el('input', { type: 'password', placeholder: 'Admin password', required: true, autofocus: true });
    show(el('form', { class: 'card login', onsubmit: function (e) {
      e.preventDefault(); err.textContent = ''; S.key = pw.value;
      api('ping').then(function (j) {
        if (j.ok) { try { sessionStorage.setItem('welhan_admin', S.key); } catch (x) {} loadAll(); }
        else { S.key = ''; err.textContent = j.error === 'auth' ? 'Wrong password.' : j.error; }
      });
    } }, [el('h1', { text: 'Admin login' }), err, pw, el('button', { text: 'Log in' })]));
  }
  function logout() { S.key = ''; try { sessionStorage.removeItem('welhan_admin'); } catch (x) {} authScreen(); }

  function shell(content) {
    var nav = function (id, label) { return el('a', { href: '#', class: S.tab === id ? 'on' : '', text: label, onclick: function (e) { e.preventDefault(); S.tab = id; S.flash = ''; render(); } }); };
    var newCount = S.rows.filter(function (r) { return r.status === 'new'; }).length;
    var right = el('div', { class: 'right' }, [
      S.tab === 'sub' ? el('a', { href: '#', text: 'Export CSV', onclick: function (e) { e.preventDefault(); exportCsv(); } }) : null,
      el('a', { href: '../index.html', target: '_blank', text: 'View site' }),
      el('button', { class: 'lnk', text: 'Log out', onclick: logout })]);
    var bar = el('header', { class: 'bar' }, [el('strong', { text: 'Welhan Admin' }), el('nav', { class: 'right' }, [nav('dash', 'Dashboard'), nav('sub', 'Submissions' + (newCount ? ' (' + newCount + ')' : '')), nav('prices', 'Insurance prices'), nav('content', 'Content'), nav('settings', 'Settings')]), right]);
    var w = el('div'); w.appendChild(bar); w.appendChild(el('main', {}, [content])); show(w);
  }

  function exportCsv() {
    var rows = S.rows.filter(function (r) { return (!S.f.type || r.type === S.f.type) && (!S.f.status || r.status === S.f.status) && (!S.f.branch || r.fields['Branch'] === S.f.branch); }), keys = [];
    rows.forEach(function (r) { Object.keys(r.fields).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
    var q = function (v) { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    var lines = [['Date', 'Type', 'Status', 'Note'].concat(keys).map(q).join(',')];
    rows.forEach(function (r) { lines.push([new Date(r.ts * 1000).toISOString().slice(0, 16).replace('T', ' '), S.labels[r.type] || r.type, r.status, r.note || ''].concat(keys.map(function (k) { return r.fields[k] || ''; })).map(q).join(',')); });
    var a = el('a', { href: URL.createObjectURL(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })), download: 'welhan-submissions-' + new Date().toISOString().slice(0, 10) + '.csv' });
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- dashboard ---------- */
  function weekStart(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); var day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x; }
  function dashboard() {
    var rows = S.rows, box = el('div'), WEEKS = 12;
    var now = weekStart(new Date()), weeks = [];
    for (var i = WEEKS - 1; i >= 0; i--) { var d = new Date(now); d.setDate(d.getDate() - i * 7); weeks.push({ d: d, quote: 0, other: 0 }); }
    rows.forEach(function (r) {
      var ws = weekStart(new Date(r.ts * 1000)).getTime();
      weeks.forEach(function (w) { if (w.d.getTime() === ws) { if (r.type === 'quote') w.quote++; else w.other++; } });
    });
    var thisWeek = weeks[WEEKS - 1].quote + weeks[WEEKS - 1].other, lastWeek = weeks[WEEKS - 2].quote + weeks[WEEKS - 2].other;
    var count = function (f) { return rows.filter(f).length; };
    box.appendChild(el('h1', { text: 'Lead dashboard' }));
    box.appendChild(el('div', { class: 'stats' }, [
      stat(rows.length, 'Total leads'), stat(count(function (r) { return r.status === 'new'; }), 'New (not contacted)'),
      stat(thisWeek, 'This week', lastWeek ? (thisWeek >= lastWeek ? '▲ ' : '▼ ') + Math.abs(thisWeek - lastWeek) + ' vs last week' : ''), stat(count(function (r) { return r.type === 'quote'; }), 'Insurance quotes')]));

    // stacked bar chart: submissions per week
    var max = Math.max(4, Math.max.apply(null, weeks.map(function (w) { return w.quote + w.other; }))), W = 700, H = 240, L = 34, B = 34, T = 14, cw = (W - L - 8) / WEEKS, ph = H - B - T;
    var step = max <= 8 ? 1 : max <= 20 ? 2 : Math.ceil(max / 5 / 5) * 5;
    max = Math.ceil(max / step) * step;
    var c = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Submissions per week for the last 12 weeks', class: 'chart' });
    for (var g = 0; g <= max; g += step) {
      var y = T + ph - g / max * ph;
      c.appendChild(svg('line', { x1: L, x2: W - 8, y1: y, y2: y, stroke: '#e3e7f0' })); c.appendChild(svg('text', { x: L - 6, y: y + 4, 'text-anchor': 'end', class: 'ax' }, [String(g)]));
    }
    weeks.forEach(function (w, i) {
      var x = L + i * cw + cw * 0.16, bw = cw * 0.68, hq = w.quote / max * ph, ho = w.other / max * ph, tot = w.quote + w.other;
      var gx = svg('g', {}, [svg('title', {}, [w.d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ': ' + tot + ' total (' + w.quote + ' quotes, ' + w.other + ' other forms)'])]);
      if (ho) gx.appendChild(svg('rect', { x: x, y: T + ph - hq - ho, width: bw, height: ho, fill: '#9a90cf', rx: 2 }));
      if (hq) gx.appendChild(svg('rect', { x: x, y: T + ph - hq, width: bw, height: hq, fill: '#3f346b', rx: 2 }));
      if (tot) gx.appendChild(svg('text', { x: x + bw / 2, y: T + ph - hq - ho - 4, 'text-anchor': 'middle', class: 'ax' }, [String(tot)]));
      c.appendChild(gx);
      if (i % 2 === (WEEKS - 1) % 2) c.appendChild(svg('text', { x: x + bw / 2, y: H - 12, 'text-anchor': 'middle', class: 'ax' }, [w.d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })]));
    });
    box.appendChild(el('div', { class: 'card' }, [el('h2', { text: 'Submissions per week' }), el('p', { class: 'mut', text: 'Weeks start on Monday · last 12 weeks' }), c,
      el('div', { class: 'legend' }, [el('span', {}, [el('i', { style: 'background:#3f346b' }), 'Insurance quotes']), el('span', {}, [el('i', { style: 'background:#9a90cf' }), 'Other forms'])])]));

    // breakdown + status
    var byType = {}; rows.forEach(function (r) { byType[r.type] = (byType[r.type] || 0) + 1; });
    var tl = el('div', { class: 'bars' });
    Object.keys(S.labels).forEach(function (k) { var n = byType[k] || 0; if (!n) return; tl.appendChild(el('div', { class: 'brow' }, [el('span', { text: S.labels[k] }), el('div', { class: 'track' }, [el('div', { class: 'fill', style: 'width:' + Math.round(n / rows.length * 100) + '%' })]), el('b', { text: n })])); });
    if (!rows.length) tl.appendChild(el('p', { class: 'mut', text: 'No data yet.' }));
    var stl = el('div', { class: 'bars' });
    ['new', 'contacted', 'done'].forEach(function (k) { var n = count(function (r) { return r.status === k; }); stl.appendChild(el('div', { class: 'brow' }, [el('span', { text: k }), el('div', { class: 'track' }, [el('div', { class: 'fill', style: 'width:' + (rows.length ? Math.round(n / rows.length * 100) : 0) + '%' })]), el('b', { text: n })])); });
    var byBr = {}; rows.forEach(function (r) { var b = r.fields['Branch']; if (b) byBr[b] = (byBr[b] || 0) + 1; });
    var bl = el('div', { class: 'bars' }), withBr = Object.keys(byBr).reduce(function (a, k) { return a + byBr[k]; }, 0);
    Object.keys(byBr).sort(function (a, b) { return byBr[b] - byBr[a]; }).forEach(function (k) { bl.appendChild(el('div', { class: 'brow' }, [el('span', { text: k }), el('div', { class: 'track' }, [el('div', { class: 'fill', style: 'width:' + Math.round(byBr[k] / withBr * 100) + '%' })]), el('b', { text: byBr[k] })])); });
    if (!withBr) bl.appendChild(el('p', { class: 'mut', text: 'No branch data yet (collected on the Contact form).' }));
    box.appendChild(el('div', { class: 'two' }, [el('div', { class: 'card' }, [el('h2', { text: 'By form' }), tl]), el('div', { class: 'card' }, [el('h2', { text: 'Follow-up status' }), stl])]));
    box.appendChild(el('div', { class: 'card' }, [el('h2', { text: 'Leads by branch' }), bl]));

    // recent
    var rec = el('div', { class: 'card' }, [el('h2', { text: 'Latest leads' })]);
    rows.slice(0, 6).forEach(function (r) {
      var nm = r.fields['Full name'] || r.fields['Name'] || r.fields['Email'] || '(no name)', ph = (r.fields['Branch'] ? r.fields['Branch'] + ' · ' : '') + (r.fields['Phone'] || '');
      rec.appendChild(el('div', { class: 'lead' }, [el('span', { class: 'tag', text: S.labels[r.type] || r.type }), el('strong', { text: nm }), el('span', { class: 'mut', text: ph }), el('time', { text: new Date(r.ts * 1000).toLocaleString() }), el('span', { class: 'pill', text: r.status })]));
    });
    if (!rows.length) rec.appendChild(el('p', { class: 'mut', text: 'No submissions yet.' }));
    box.appendChild(rec);
    return box;
    function stat(n, label, sub) { return el('div', {}, [el('b', { text: n }), label, sub ? el('small', { text: sub }) : null]); }
  }

  /* ---------- submissions (with notes) ---------- */
  function submissions() {
    var rows = S.rows, f = S.f, box = el('div');
    var q = el('input', { placeholder: 'Search name, email, phone, notes…', value: f.q, oninput: function () { f.q = q.value; renderList(); } });
    var ty = el('select', { onchange: function () { f.type = ty.value; render(); } }, [el('option', { value: '', text: 'All forms' })].concat(Object.keys(S.labels).map(function (k) { return el('option', { value: k, text: S.labels[k], selected: f.type === k }); })));
    var st = el('select', { onchange: function () { f.status = st.value; render(); } }, ['', 'new', 'contacted', 'done'].map(function (k) { return el('option', { value: k, text: k || 'Any status', selected: f.status === k }); }));
    var branches = []; rows.forEach(function (r) { var b = r.fields['Branch']; if (b && branches.indexOf(b) < 0) branches.push(b); });
    var br = el('select', { onchange: function () { f.branch = br.value; render(); } }, [el('option', { value: '', text: 'All branches' })].concat(branches.map(function (b) { return el('option', { value: b, text: b, selected: f.branch === b }); })));
    box.appendChild(el('div', { class: 'filters' }, [q, ty, st, br]));
    var holder = el('div'); box.appendChild(holder);
    function renderList() {
      var l = rows.filter(function (r) { return (!f.type || r.type === f.type) && (!f.status || r.status === f.status) && (!f.branch || r.fields['Branch'] === f.branch) && (!f.q || (JSON.stringify(r.fields) + (r.note || '')).toLowerCase().indexOf(f.q.toLowerCase()) >= 0); });
      holder.innerHTML = '';
      if (!l.length) holder.appendChild(el('p', { class: 'empty', text: 'No submissions found.' }));
      l.forEach(function (r) {
        var dl = el('dl'); Object.keys(r.fields).forEach(function (k) { dl.appendChild(el('dt', { text: k })); dl.appendChild(el('dd', { text: r.fields[k] })); });
        var sel = el('select', {}, ['new', 'contacted', 'done'].map(function (s) { return el('option', { text: s, selected: r.status === s }); }));
        var note = el('textarea', { rows: 2, placeholder: 'Private note (e.g. called on 27 Oct, wants Bupa 12 months)…' }); note.value = r.note || '';
        var nmsg = el('small', { class: 'mut' });
        holder.appendChild(el('article', { class: 'sub ' + r.status }, [
          el('div', { class: 'top' }, [el('span', { class: 'tag', text: S.labels[r.type] || r.type }), el('time', { text: new Date(r.ts * 1000).toLocaleString() }), el('span', { class: 'pill', text: r.status })]), dl,
          el('div', { class: 'notebox' }, [note, el('div', { class: 'row' }, [el('button', { class: 'ghost', text: 'Save note', onclick: function () { api('note', { id: r.id, note: note.value }).then(function (j) { when(j, function () { r.note = note.value; nmsg.textContent = 'Saved ✓'; }); }); } }), nmsg])]),
          el('div', { class: 'acts' }, [sel,
            el('button', { text: 'Update status', onclick: function () { api('status', { id: r.id, status: sel.value }).then(function (j) { when(j, function () { r.status = sel.value; render(); }); }); } }),
            el('button', { class: 'del', text: 'Delete', onclick: function () { if (confirm('Delete this submission permanently?')) api('delete', { id: r.id }).then(function (j) { when(j, function () { S.rows = S.rows.filter(function (x) { return x.id !== r.id; }); render(); }); }); } })])]));
      });
    }
    renderList();
    return box;
  }

  /* ---------- prices ---------- */
  function pricesView() {
    var P = S.prices, box = el('div'), err = el('p', { class: 'err' });
    box.appendChild(el('h1', { text: 'Health insurance prices' }));
    box.appendChild(el('p', { class: 'mut', text: 'Changes appear on the Health Insurance comparison and quote page as soon as you save. Prices = single student, 12 months, in AUD.' }));
    if (S.flash) box.appendChild(el('p', { class: 'ok', text: S.flash }));
    if (P.updated) box.appendChild(el('p', { class: 'mut', text: 'Last saved ' + new Date(P.updated * 1000).toLocaleString() }));
    var rate = el('input', { type: 'number', step: '0.01', min: '1', value: P.rate, style: 'width:120px' });
    box.appendChild(el('div', { class: 'card' }, [el('h2', { text: 'Exchange rate' }), el('label', { class: 'row' }, ['1 AUD = ', rate, ' NPR'])]));
    var ptb = el('tbody'), fth = el('tr'), ftb = el('tbody');
    function drawP() {
      ptb.innerHTML = '';
      P.providers.forEach(function (p) {
        var n = el('input', { value: p.name, oninput: function () { p.name = n.value; drawFHead(); } }), pl = el('input', { value: p.plan, oninput: function () { p.plan = pl.value; } }),
          pr = el('input', { type: 'number', step: '0.01', min: '0', value: p.annualAUD, oninput: function () { p.annualAUD = pr.value; } });
        ptb.appendChild(el('tr', {}, [el('td', {}, [n]), el('td', {}, [pl]), el('td', {}, [pr])]));
      });
    }
    function drawFHead() { fth.innerHTML = ''; fth.appendChild(el('th', { text: 'Feature' })); P.providers.forEach(function (p) { fth.appendChild(el('th', { text: p.name || '(new)' })); }); }
    function drawF() {
      ftb.innerHTML = '';
      P.features.forEach(function (f) {
        var tr = el('tr'), l = el('input', { value: f[0], oninput: function () { f[0] = l.value; } }); tr.appendChild(el('td', {}, [l]));
        P.providers.forEach(function (p, i) { var c = el('input', { value: f[1][i] || '', oninput: function () { f[1][i] = c.value; } }); tr.appendChild(el('td', {}, [c])); });
        ftb.appendChild(tr);
      });
    }
    drawP(); drawFHead(); drawF();
    box.appendChild(el('div', { class: 'card' }, [el('h2', { text: 'Providers & yearly price (AUD)' }), el('p', { class: 'mut', text: 'Clear a provider’s name to remove it.' }),
      el('div', { class: 'tbl' }, [el('table', {}, [el('thead', {}, [el('tr', {}, [el('th', { text: 'Provider' }), el('th', { text: 'Plan' }), el('th', { text: 'Price / 12 months (A$)' })])]), ptb])]),
      el('div', {}, [el('button', { class: 'ghost', text: '+ Add provider', onclick: function () { P.providers.push({ name: '', plan: '', annualAUD: '' }); P.features.forEach(function (f) { f[1].push(''); }); drawP(); drawFHead(); drawF(); } })])]));
    box.appendChild(el('div', { class: 'card' }, [el('h2', { text: 'Features comparison' }), el('p', { class: 'mut', text: 'One column per provider. Clear a feature name to remove the row.' }),
      el('div', { class: 'tbl' }, [el('table', {}, [el('thead', {}, [fth]), ftb])]),
      el('div', {}, [el('button', { class: 'ghost', text: '+ Add feature row', onclick: function () { P.features.push(['', P.providers.map(function () { return ''; })]); drawF(); } })])]));
    box.appendChild(err);
    box.appendChild(el('div', { class: 'savebar' }, [
      el('button', { text: 'Save changes', onclick: function () {
        err.textContent = '';
        api('savePrices', { prices: { rate: parseFloat(rate.value), providers: P.providers.map(function (p) { return { name: p.name, plan: p.plan, annualAUD: parseFloat(p.annualAUD) }; }), features: P.features.map(function (f) { return { label: f[0], values: f[1] }; }) } }).then(function (j) {
          if (!j.ok) { err.textContent = j.error; return; } S.flash = 'Saved. The website now uses these prices.'; loadPrices();
        });
      } }),
      el('button', { class: 'ghost danger', text: 'Reset to defaults', onclick: function () { if (confirm('Reset all prices and features to the original defaults?')) api('resetPrices').then(function () { S.flash = 'Reset to the original default prices.'; loadPrices(); }); } })]));
    return box;
  }

  /* ---------- content: offices / blog / team ---------- */
  function uploader(item, key) {
    var img = el('img', { class: 'thumb', alt: '' }), msg = el('small', { class: 'mut' });
    function sync() { if (item[key]) { img.src = /^https?:/.test(item[key]) ? item[key] : '../' + item[key]; img.style.display = ''; } else img.style.display = 'none'; }
    var file = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', onchange: function () {
      var f = file.files[0]; if (!f) return; msg.textContent = 'Resizing & uploading…';
      var im = new Image(), url = URL.createObjectURL(f);
      im.onload = function () {
        var sc = Math.min(1, 1100 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        var data = c.toDataURL('image/jpeg', 0.85).split(',')[1];
        api('upload', { mime: 'image/jpeg', data: data }).then(function (j) { if (j.ok) { item[key] = j.path; msg.textContent = 'Uploaded ✓ (press Save)'; sync(); } else msg.textContent = j.error; });
      };
      im.onerror = function () { msg.textContent = 'Could not read that image.'; };
      im.src = url;
    } });
    sync();
    return el('div', { class: 'upl' }, [img, el('div', {}, [file, msg, el('button', { type: 'button', class: 'ghost sm', text: 'Remove image', onclick: function () { item[key] = ''; sync(); } })])]);
  }
  function inp(item, key, label, o) {
    o = o || {}; var i = el(o.area ? 'textarea' : 'input', { rows: o.rows, type: o.type, placeholder: o.ph || '' }); i.value = item[key] || '';
    i.addEventListener('input', function () { item[key] = i.value; }); return field(label, i, o.hint);
  }
  function listEditor(title, intro, items, blank, render1, section, extraTop) {
    var box = el('div'), list = el('div'), err = el('p', { class: 'err' });
    function draw() {
      list.innerHTML = '';
      items.forEach(function (it, idx) {
        var card = el('div', { class: 'card item' }, [el('div', { class: 'row between' }, [el('strong', { text: (idx + 1) + '. ' + (it.title || it.name || it.city || 'New') }),
          el('span', { class: 'row' }, [
            el('button', { type: 'button', class: 'ghost sm', text: '↑', disabled: idx === 0, onclick: function () { items.splice(idx - 1, 0, items.splice(idx, 1)[0]); draw(); } }),
            el('button', { type: 'button', class: 'ghost sm', text: '↓', disabled: idx === items.length - 1, onclick: function () { items.splice(idx + 1, 0, items.splice(idx, 1)[0]); draw(); } }),
            el('button', { type: 'button', class: 'del sm', text: 'Remove', onclick: function () { if (confirm('Remove this entry? (Press Save to apply)')) { items.splice(idx, 1); draw(); } } })])])].concat(render1(it)));
        list.appendChild(card);
      });
      if (!items.length) list.appendChild(el('p', { class: 'mut', text: 'Nothing here yet.' }));
    }
    draw();
    box.appendChild(el('h2', { text: title })); box.appendChild(el('p', { class: 'mut', text: intro }));
    if (S.flash) box.appendChild(el('p', { class: 'ok', text: S.flash }));
    if (extraTop) box.appendChild(extraTop);
    box.appendChild(list);
    box.appendChild(el('button', { type: 'button', class: 'ghost', text: '+ Add', onclick: function () { items.push(JSON.parse(JSON.stringify(blank))); draw(); } }));
    box.appendChild(err);
    box.appendChild(el('div', { class: 'savebar' }, [el('button', { text: 'Save ' + title.toLowerCase(), onclick: function () {
      var payload = {}; payload[section] = items;
      api('saveContent', { content: payload }).then(function (j) { if (!j.ok) { err.textContent = j.error; return; } S.content = j.content; S.flash = 'Saved. The website now shows these changes.'; render(); });
    } })]));
    return box;
  }
  function contentView() {
    var C = S.content, box = el('div');
    var tabs = el('div', { class: 'subtabs' }, [['offices', 'Contact page branches'], ['posts', 'Blog posts'], ['team', 'Counsellors']].map(function (t) {
      return el('button', { class: 'ghost' + (S.ctab === t[0] ? ' act' : ''), text: t[1], onclick: function () { S.ctab = t[0]; S.flash = ''; render(); } });
    }));
    box.appendChild(el('h1', { text: 'Website content' })); box.appendChild(tabs);
    if (S.ctab === 'offices') {
      if (!C.offices) {
        box.appendChild(el('div', { class: 'card' }, [el('h2', { text: 'Branches' }), el('p', { class: 'mut', text: 'The Contact page currently shows the original branch list. Click below to load it here and start editing.' }),
          el('div', {}, [el('button', { text: 'Edit branches', onclick: function () { C.offices = JSON.parse(JSON.stringify(DEFAULT_OFFICES)); render(); } })])]));
      } else {
        var revert = el('button', { class: 'ghost danger sm', text: 'Revert to original page list', onclick: function () { if (confirm('Remove your edits and use the original branch list?')) api('saveContent', { content: { offices: null } }).then(function (j) { when(j, function () { S.content = j.content; render(); }); }); } });
        box.appendChild(listEditor('Branches', 'Each branch appears on the Contact page with its own map. Address for map = what Google Maps should search for.', C.offices, { country: 'Nepal', city: '', call: '', wa: '', email: '', address: '', mapq: '' }, function (o) {
          return [el('div', { class: 'grid2' }, [inp(o, 'country', 'Country'), inp(o, 'city', 'Branch / city'), inp(o, 'call', 'Call numbers'), inp(o, 'wa', 'WhatsApp numbers'), inp(o, 'email', 'Email'), inp(o, 'address', 'Address shown'), inp(o, 'mapq', 'Map search text', { hint: 'e.g. place name + city' })])];
        }, 'offices', el('div', {}, [revert])));
      }
    } else if (S.ctab === 'posts') {
      box.appendChild(listEditor('Blog posts', 'Published posts appear on the Blog page (blog.php) and the latest three on the homepage. Write the body as plain text: a blank line starts a new paragraph, “## Heading” makes a heading, lines starting with “- ” make a bullet list.', C.posts,
        { title: '', slug: '', category: 'News', date: new Date().toISOString().slice(0, 10), excerpt: '', image: '', body: '', published: false }, function (p) {
          var pub = el('input', { type: 'checkbox' }); pub.checked = !!p.published; pub.addEventListener('change', function () { p.published = pub.checked; });
          return [el('div', { class: 'grid2' }, [inp(p, 'title', 'Title'), inp(p, 'category', 'Category'), inp(p, 'date', 'Date', { type: 'date' }), inp(p, 'slug', 'URL slug', { hint: 'Leave empty to create from the title' })]),
            inp(p, 'excerpt', 'Short summary (shown in lists and Google)', { area: true, rows: 2 }), field('Cover image', uploader(p, 'image')), inp(p, 'body', 'Article text', { area: true, rows: 10 }),
            el('label', { class: 'row' }, [pub, 'Published (visible on the website)'])];
        }, 'posts'));
    } else {
      box.appendChild(listEditor('Counsellors', 'Shown as “Our Counsellors” on the Message from Team page once you add at least one person.', C.team, { name: '', role: '', bio: '', photo: '' }, function (m) {
        return [el('div', { class: 'grid2' }, [inp(m, 'name', 'Name'), inp(m, 'role', 'Role / title')]), inp(m, 'bio', 'Short bio', { area: true, rows: 3 }), field('Photo', uploader(m, 'photo'))];
      }, 'team'));
    }
    return box;
  }

  /* ---------- settings: email + password ---------- */
  function settingsView() {
    var s = S.settings, box = el('div'), msg = el('p', { class: 'mut' });
    box.appendChild(el('h1', { text: 'Settings' }));
    var st = S.mail ? el('p', { class: S.mail.ok ? 'ok' : 'err', text: (S.mail.ok ? 'Last email sent OK · ' : 'Last email failed: ' + S.mail.error + ' · ') + new Date(S.mail.time).toLocaleString() }) : null;
    var cb = el('input', { type: 'checkbox' }); cb.checked = !!s.cc_branch; cb.addEventListener('change', function () { s.cc_branch = cb.checked; });
    function save(done) { api('saveSettings', { settings: s }).then(function (j) { if (j.ok) done(); else { msg.className = 'err'; msg.textContent = j.error; } }); }
    box.appendChild(el('div', { class: 'card' }, [el('h2', { text: 'Email notifications' }),
      el('p', { class: 'mut', text: 'Get an email whenever someone submits a form. Emails are sent from your own Google account by the backend script. Leave “Send to” empty to turn notifications off.' }), st,
      inp(s, 'notify_to', 'Send notifications to', { ph: 'admission@welhanabroadstudy.com (separate several with commas)' }), inp(s, 'from_name', 'Sender name'),
      el('label', { class: 'row' }, [cb, 'Also email the branch the visitor selected on the Contact form (uses that branch’s email from Content → Branches)']), msg,
      el('div', { class: 'row' }, [
        el('button', { text: 'Save', onclick: function () { save(function () { msg.className = 'ok'; msg.textContent = 'Saved.'; }); } }),
        el('button', { class: 'ghost', text: 'Save & send test email', onclick: function () { save(function () { msg.className = 'mut'; msg.textContent = 'Sending…'; api('testMail').then(function (j) { msg.className = j.ok ? 'ok' : 'err'; msg.textContent = j.ok ? 'Test email sent. Check the inbox.' : j.error; }); }); } })])]));
    var pw = el('input', { type: 'password', placeholder: 'New password (min 8 characters)', minlength: 8 }), pm = el('p', { class: 'mut' });
    box.appendChild(el('div', { class: 'card' }, [el('h2', { text: 'Change admin password' }), pw, pm,
      el('div', {}, [el('button', { text: 'Change password', onclick: function () { api('passwd', { password: pw.value }).then(function (j) { if (j.ok) { S.key = pw.value; try { sessionStorage.setItem('welhan_admin', S.key); } catch (x) {} pw.value = ''; } pm.textContent = j.ok ? 'Password changed.' : j.error; }); } })])]));
    return box;
  }

  function render() {
    shell(S.tab === 'dash' ? dashboard() : S.tab === 'sub' ? submissions() : S.tab === 'prices' ? pricesView() : S.tab === 'content' ? contentView() : settingsView());
  }
  function defaultPrices() { var d = window.OSHC_DATA; return JSON.parse(JSON.stringify({ rate: d.rate, providers: d.providers, features: d.features, updated: null })); }
  function loadPrices() { api('getPrices').then(function (j) { if (!j.ok && j.error === 'auth') return logout(); S.prices = j.prices || defaultPrices(); render(); }); }
  function loadAll() {
    Promise.all([api('list'), api('getPrices'), api('getContent'), api('getSettings')]).then(function (r) {
      if (!r[0].ok) { if (r[0].error === 'auth') return logout(); app.innerHTML = ''; app.appendChild(el('p', { class: 'loading', text: r[0].error })); return; }
      S.rows = r[0].rows; S.labels = r[0].labels; S.prices = r[1].prices || defaultPrices(); S.content = r[2].content; S.settings = r[3].settings; S.mail = r[3].mail; render();
    });
  }
  function start() {
    if (!API) { app.innerHTML = ''; app.appendChild(el('div', { class: 'card login' }, [el('h1', { text: 'Backend not connected' }), el('p', { class: 'mut', text: 'Paste your Google Apps Script Web app URL into assets/js/config.js (see google-apps-script/SETUP.md), upload it, then reload this page.' })])); return; }
    try { S.key = sessionStorage.getItem('welhan_admin') || ''; } catch (x) {}
    if (S.key) loadAll(); else authScreen();
  }
  start();
})();

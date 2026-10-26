(function () {
  'use strict';
  var D = window.OSHC_DATA, P = D.providers;
  var form = document.getElementById('quote-form');
  if (!form) return;
  var $ = function (id) { return document.getElementById(id); };
  var sel = $('q-provider'), months = $('q-months'), persons = $('q-persons'), body = $('q-body'), sum = $('q-summary');
  var qs = new URLSearchParams(location.search);
  var rate = parseFloat(qs.get('rate')) || D.rate;
  var audN = new Intl.NumberFormat('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var nprN = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  var A = function (v) { return 'A$' + audN.format(v); }, N = function (v) { return 'Rs ' + nprN.format(v); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  sel.innerHTML = P.map(function (p) { return '<option value="' + esc(p.name) + '">' + esc(p.name) + ' – ' + esc(p.plan) + '</option>'; }).join('');
  var pv = qs.get('provider'); if (pv) sel.value = pv;
  var m = qs.get('months'); if (m && months.querySelector('option[value="' + parseInt(m, 10) + '"]')) months.value = parseInt(m, 10);
  var n = parseInt(qs.get('persons'), 10); if (n > 0) persons.value = Math.min(n, 10);
  $('q-rate').textContent = rate;

  function calc(p) {
    var nn = Math.max(1, Math.min(10, parseInt(persons.value, 10) || 1)), mm = parseInt(months.value, 10);
    var total = p.annualAUD / 12 * nn * mm;
    return { total: total, monthly: total / mm, npr: total * rate, nn: nn, mm: mm };
  }
  function current() { return P.filter(function (p) { return p.name === sel.value; })[0] || P[0]; }

  function render() {
    var c = calc(current()), cur = current();
    var all = P.map(function (p) { return { p: p, c: calc(p) }; }).sort(function (a, b) { return a.c.total - b.c.total; });
    var min = all[0].c.total, diff = c.total - min;
    sum.innerHTML = '<div class="qt-big">' + A(c.total) + '<small>' + N(c.npr) + '</small></div>' +
      '<p><strong>' + esc(cur.name) + '</strong> · ' + esc(cur.plan) + '<br>' + c.nn + (c.nn === 1 ? ' person' : ' persons') + ' · ' + c.mm + ' months<br>≈ ' + A(c.monthly) + ' / month (' + N(c.monthly * rate) + ')</p>' +
      (diff < 0.005 ? '<p class="qt-good">This is the lowest-priced option.</p>' : '<p class="qt-hint">' + A(diff) + ' (' + N(diff * rate) + ') more than the cheapest option.</p>');
    body.innerHTML = all.map(function (x, i) {
      return '<tr data-p="' + esc(x.p.name) + '" class="' + (x.p.name === cur.name ? 'sel ' : '') + (i === 0 ? 'best' : '') + '"><td><strong>' + esc(x.p.name) + '</strong>' + (i === 0 ? ' <span class="badge">Lowest</span>' : '') + '<small>' + esc(x.p.plan) + '</small></td><td>' + A(x.c.total) + '</td><td>' + N(x.c.npr) + '</td></tr>';
    }).join('');
  }
  body.addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-p]'); if (tr) { sel.value = tr.getAttribute('data-p'); render(); }
  });
  [sel, months, persons].forEach(function (el) { el.addEventListener('input', render); el.addEventListener('change', render); });
  render();
  if (window.WelhanAPI) WelhanAPI.pub().then(function (d) {   // admin-edited prices (Google Sheets backend)
    if (!d || !d.prices) return;
    var keep = sel.value; D.rate = rate = d.prices.rate; D.providers = P = d.prices.providers; D.features = d.prices.features;
    if (!qs.get('rate')) { /* rate from the comparison link wins; otherwise use the admin rate */ }
    $('q-rate').textContent = rate;
    sel.innerHTML = P.map(function (p) { return '<option value="' + esc(p.name) + '">' + esc(p.name) + ' – ' + esc(p.plan) + '</option>'; }).join('');
    sel.value = keep; if (!sel.value) sel.selectedIndex = 0;
    render();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = $('quote-ok'), err = $('quote-err'); ok.style.display = err.style.display = 'none';
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var c = calc(current()), cur = current(), fields = {};
    Array.prototype.forEach.call(form.elements, function (el) { if (el.name && el.name !== '_hp' && el.value) fields[el.name] = el.value; });
    fields['Plan'] = cur.plan;
    fields['Estimated total (AUD)'] = A(c.total);
    fields['Estimated total (NPR)'] = N(c.npr);
    fields['Exchange rate used'] = '1 AUD = ' + rate + ' NPR';
    var btn = form.querySelector('button'); btn.disabled = true;
    var req = (window.WelhanAPI && WelhanAPI.enabled) ? WelhanAPI.submit({ type: 'quote', subject: 'OSHC quote – ' + cur.name, _hp: form.elements._hp.value, fields: fields }) : Promise.reject(new Error('no backend'));
    req
      .then(function (j) {
        if (!j.ok) { var se = new Error(j.error || 'Failed'); se.server = true; throw se; }
        ok.textContent = 'Thank you! Your quote request (ref ' + j.id + ') has been received. Our team will contact you shortly.';
        ok.style.display = 'block'; form.reset(); sel.value = cur.name; render();
      })
      .catch(function (er) {
        err.textContent = (er.server ? er.message + ' ' : '') + 'Could not send online – you can email your request instead.';
        err.innerHTML += ' <a href="mailto:admission@welhanabroadstudy.com?subject=' + encodeURIComponent('OSHC quote – ' + cur.name) + '&body=' + encodeURIComponent(Object.keys(fields).map(function (k) { return k + ': ' + fields[k]; }).join('\n')) + '">Open email</a>';
        err.style.display = 'block';
      })
      .then(function () { btn.disabled = false; });
  });
})();

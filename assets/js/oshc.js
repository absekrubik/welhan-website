/* OSHC comparison tool.
   >>> EDIT THE DATA BELOW to update prices. <<<
   annualAUD = price of single-student cover for 12 months (AUD).
   Source: student-insurance.com OSHC comparison (2026, updated 30 Sep 2026).
   Prices are indicative; the final price depends on visa dates, state and plan. */
(function () {
  'use strict';
  var D = window.OSHC_DATA, DEFAULT_RATE = D.rate, PROVIDERS = D.providers, FEATURES = D.features;

  var root = document.getElementById('oshc-compare');
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var months = $('#oc-months'), persons = $('#oc-persons'), feat = $('#oc-features'), rate = $('#oc-rate'), body = $('#oc-body'), sort = $('#oc-sort'), note = $('#oc-note');

  var audN = new Intl.NumberFormat('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var aud = { format: function (v) { return 'A$' + audN.format(v); } };
  var npr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }); // lakh/crore grouping used in Nepal

  function render() {
    var m = parseInt(months.value, 10);
    var n = Math.max(1, Math.min(10, parseInt(persons.value, 10) || 1));
    var r = parseFloat(rate.value) || DEFAULT_RATE;
    var rows = PROVIDERS.map(function (p) {
      var monthly = p.annualAUD / 12 * n, total = monthly * m;
      return { p: p, total: total, monthly: monthly, nprTotal: total * r, nprMonthly: monthly * r };
    });
    rows.sort(function (a, b) {
      return sort.value === 'name' ? a.p.name.localeCompare(b.p.name) : a.total - b.total;
    });
    var min = Math.min.apply(null, rows.map(function (x) { return x.total; }));
    var max = Math.max.apply(null, rows.map(function (x) { return x.total; }));
    body.innerHTML = rows.map(function (x) {
      var best = x.total === min;
      return '<tr class="' + (best ? 'best' : '') + '">' +
        '<td data-l="Provider"><strong>' + x.p.name + '</strong>' + (best ? ' <span class="badge">Lowest price</span>' : '') +
        '<small>' + x.p.plan + '</small></td>' +
        '<td data-l="Per month">' + aud.format(x.monthly) + '<small>Rs ' + npr.format(x.nprMonthly) + '</small></td>' +
        '<td data-l="Total (AUD)"><strong>' + aud.format(x.total) + '</strong></td>' +
        '<td data-l="Total (NPR)"><strong>Rs ' + npr.format(x.nprTotal) + '</strong></td>' +
        '<td data-l=""><a class="btn btn-sm" href="quote.html?provider=' + encodeURIComponent(x.p.name) + '&months=' + m + '&persons=' + n + '&rate=' + r + '"><span>Get quote</span></a></td></tr>';
    }).join('');
    note.textContent = 'Choosing the cheapest saves about ' + aud.format(max - min) + ' (Rs ' + npr.format((max - min) * r) +
      ') over ' + m + ' months for ' + n + (n === 1 ? ' person' : ' persons') + ' compared with the most expensive. 1 AUD = ' + r + ' NPR.';
  }

  if (feat) {
    feat.innerHTML = '<thead><tr><th>Feature</th>' + PROVIDERS.map(function (p) { return '<th>' + p.name + '</th>'; }).join('') + '</tr></thead><tbody>' +
      FEATURES.map(function (f) { return '<tr><td><strong>' + f[0] + '</strong></td>' + f[1].map(function (v) { return '<td>' + v + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody>';
  }

  [months, persons, rate, sort].forEach(function (el) { el.addEventListener('input', render); el.addEventListener('change', render); });
  rate.value = DEFAULT_RATE;
  render();
})();

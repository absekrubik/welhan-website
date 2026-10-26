/* Small client for the Google Apps Script backend. Everything is optional: if apiUrl is empty or the call fails,
   the site keeps working with its built-in content and email fallbacks. */
(function () {
  'use strict';
  var URL = ((window.WELHAN_CONFIG || {}).apiUrl || '').trim();
  var W = window.WelhanAPI = { enabled: !!URL, url: URL };
  var memo = null;
  W.pub = function () {
    if (!URL) return Promise.resolve(null);
    if (memo) return memo;
    try { var c = JSON.parse(sessionStorage.getItem('welhan_pub') || 'null'); if (c && Date.now() - c.t < 60000) return (memo = Promise.resolve(c.d)); } catch (e) {}
    memo = fetch(URL + '?action=public').then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) return null;
      try { sessionStorage.setItem('welhan_pub', JSON.stringify({ t: Date.now(), d: d })); } catch (e) {}
      return d;
    }).catch(function () { return null; });
    return memo;
  };
  W.post = function (slug) { return fetch(URL + '?action=post&slug=' + encodeURIComponent(slug)).then(function (r) { return r.json(); }); };
  W.submit = function (payload) {   // text/plain avoids a CORS preflight, which Apps Script cannot answer
    return fetch(URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: 'submit' }, payload)) }).then(function (r) { return r.json(); });
  };
})();

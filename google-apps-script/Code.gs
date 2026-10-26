/**
 * Welhan Abroad Study – backend (Google Apps Script, bound to a Google Sheet).
 * Stores form submissions in the "Submissions" sheet, serves prices/branches/blog/team to the website,
 * and powers the admin page. See SETUP.md for the 10-minute setup.
 *
 * REQUIRED: Project Settings -> Script properties -> add  ADMIN_PASSWORD  (your admin password).
 */
var SUB = 'Submissions', CFG = '_config';
var HEAD = ['ID', 'Date', 'Type', 'Status', 'Note', 'Name', 'Email', 'Phone', 'Branch', 'Details', 'JSON'];
var TYPES = { quote: 'Insurance quote', contact: 'Contact enquiry', pte: 'PTE coaching booking', discount: 'Student discount', refund: 'Refund request', other: 'Form submission' };
var LABELS = { quote: 'Insurance quote', contact: 'Contact', pte: 'PTE coaching', discount: 'Student discount', refund: 'Refund', other: 'Other' };

/* ---------- helpers ---------- */
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function subSheet_() {
  var s = ss_().getSheetByName(SUB);
  if (!s) { s = ss_().insertSheet(SUB); s.appendRow(HEAD); s.setFrozenRows(1); s.getRange('A1:K1').setFontWeight('bold'); s.hideColumns(11); }
  return s;
}
function cfgSheet_() { var s = ss_().getSheetByName(CFG); if (!s) { s = ss_().insertSheet(CFG); s.hideSheet(); } return s; }
function getCfg_(key) {
  var rows = cfgSheet_().getDataRange().getValues(), parts = [];
  rows.forEach(function (r) { if (r[0] === key) parts.push([r[1], r[2]]); });
  if (!parts.length) return null;
  parts.sort(function (a, b) { return a[0] - b[0]; });
  try { return JSON.parse(parts.map(function (p) { return p[1]; }).join('')); } catch (e) { return null; }
}
function setCfg_(key, obj) {
  var s = cfgSheet_(), vals = s.getDataRange().getValues();
  for (var i = vals.length - 1; i >= 0; i--) if (vals[i][0] === key) s.deleteRow(i + 1);
  if (obj === null) { CacheService.getScriptCache().remove('public'); return; }
  var json = JSON.stringify(obj), n = 0;
  for (var p = 0; p < json.length; p += 40000) s.appendRow([key, n++, json.substr(p, 40000)]);
  CacheService.getScriptCache().remove('public');
}
function str_(v, n) { return String(v == null ? '' : v).replace(/^\s+|\s+$/g, '').substr(0, n); }
function imgOk_(v) { v = str_(v, 300); return /^(https:\/\/lh3\.googleusercontent\.com\/d\/[A-Za-z0-9_-]+|assets\/[A-Za-z0-9_\/.-]+)$/.test(v) ? v : ''; }
function slug_(s) { s = String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substr(0, 80); return s || 'post'; }

/* ---------- public GET ---------- */
function doGet(e) {
  var a = (e.parameter && e.parameter.action) || 'public';
  if (a === 'public') {
    var cache = CacheService.getScriptCache(), hit = cache.get('public');
    if (hit) return ContentService.createTextOutput(hit).setMimeType(ContentService.MimeType.JSON);
    var posts = (getCfg_('posts') || []).filter(function (p) { return p.published; })
      .sort(function (x, y) { return x.date < y.date ? 1 : -1; })
      .map(function (p) { return { slug: p.slug, title: p.title, category: p.category, date: p.date, excerpt: p.excerpt, image: p.image }; });
    var res = JSON.stringify({ ok: true, prices: getCfg_('prices'), offices: getCfg_('offices'), team: getCfg_('team') || [], posts: posts });
    if (res.length < 90000) cache.put('public', res, 60);
    return ContentService.createTextOutput(res).setMimeType(ContentService.MimeType.JSON);
  }
  if (a === 'post') {
    var slug = e.parameter.slug, found = null;
    (getCfg_('posts') || []).forEach(function (p) { if (p.published && p.slug === slug) found = p; });
    return out_(found ? { ok: true, post: found } : { ok: false, error: 'Not found' });
  }
  return out_({ ok: true, service: 'welhan-backend' });
}

/* ---------- POST router ---------- */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var d = JSON.parse(e.postData.contents || '{}');
    if (d.action === 'submit') return out_(submit_(d));
    return out_(admin_(d));
  } catch (err) {
    return out_({ ok: false, error: 'Server error: ' + err.message });
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

/* ---------- public: form submission ---------- */
function submit_(d) {
  if (d._hp) return { ok: true };                               // honeypot
  var cache = CacheService.getScriptCache(), hour = 'h' + Math.floor(Date.now() / 3600000);
  var n = parseInt(cache.get(hour) || '0', 10);
  if (n >= 60) return { ok: false, error: 'Too many submissions. Please try again later.' };
  cache.put(hour, String(n + 1), 3700);
  var type = TYPES[d.type] ? d.type : 'other', fields = {}, cnt = 0;
  Object.keys(d.fields || {}).forEach(function (k) {
    var v = d.fields[k]; if (cnt >= 40 || (typeof v !== 'string' && typeof v !== 'number')) return;
    k = str_(k, 60); v = str_(v, 3000); if (k && v) { fields[k] = v; cnt++; }
  });
  if (!cnt) return { ok: false, error: 'Empty form' };
  var email = '';
  Object.keys(fields).forEach(function (k) { if (/email/i.test(k)) email = fields[k]; });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
  var id = Utilities.getUuid().replace(/-/g, '').substr(0, 12), now = new Date();
  var details = Object.keys(fields).map(function (k) { return k + ': ' + fields[k]; }).join('\n');
  var safe = function (v) { return /^[=+\-@]/.test(v) ? "'" + v : v; };       // no spreadsheet formula injection
  subSheet_().appendRow([id, now, TYPES[type], 'new', '', safe(fields['Full name'] || fields['Name'] || ''), safe(email), safe(fields['Phone'] || ''), safe(fields['Branch'] || ''), safe(details), JSON.stringify({ type: type, subject: str_(d.subject, 120), fields: fields })]);
  try { notify_({ type: type, fields: fields, ts: now }); } catch (e) { setCfg_('mailstatus', { ok: false, time: Date.now(), error: String(e.message) }); }
  return { ok: true, id: id };
}
function notify_(row) {
  var s = getCfg_('settings') || {};
  if (!str_(s.notify_to, 300)) return;
  var to = str_(s.notify_to, 300);
  if (s.cc_branch && row.fields['Branch']) {
    (getCfg_('offices') || defaultOffices_()).forEach(function (o) { if (o.city === row.fields['Branch'] && o.email) to += ',' + o.email; });
  }
  var who = row.fields['Full name'] || row.fields['Name'] || '', label = TYPES[row.type];
  var body = 'New ' + label.toLowerCase() + ' on the Welhan website\n' + Utilities.formatDate(row.ts, Session.getScriptTimeZone(), 'dd MMM yyyy, HH:mm') + '\n\n' +
    Object.keys(row.fields).map(function (k) { return k + ': ' + row.fields[k]; }).join('\n') + '\n\nOpen the admin page to follow up.';
  var email = ''; Object.keys(row.fields).forEach(function (k) { if (/email/i.test(k)) email = row.fields[k]; });
  var opt = { name: s.from_name || 'Welhan Abroad Study' }; if (email) opt.replyTo = email;
  MailApp.sendEmail(to.replace(/;/g, ','), 'New ' + label + (who ? ' – ' + who : ''), body, opt);
  setCfg_('mailstatus', { ok: true, time: Date.now(), error: '' });
}
function defaultOffices_() {
  return [{ city: 'Sydney', email: 'sydney@welhanabroadstudy.com' }, { city: 'Kathmandu', email: 'admission@welhanabroadstudy.com' },
    { city: 'Bhanubhakta Chowk, Nepalgunj', email: 'admission@welhanabroadstudy.com' }, { city: 'Tulsipur-5, Galine, Dang', email: 'admission@welhanabroadstudy.com' }];
}

/* ---------- admin ---------- */
function auth_(d) {
  var props = PropertiesService.getScriptProperties(), pw = props.getProperty('ADMIN_PASSWORD'), cache = CacheService.getScriptCache();
  if (!pw) return 'not_configured';
  if (parseInt(cache.get('fails') || '0', 10) >= 10) return 'locked';
  if (String(d.key || '') !== pw) { cache.put('fails', String(parseInt(cache.get('fails') || '0', 10) + 1), 600); Utilities.sleep(500); return 'auth'; }
  cache.remove('fails'); return '';
}
function rows_() {
  var s = subSheet_(), last = s.getLastRow(), out = [];
  if (last < 2) return out;
  s.getRange(2, 1, last - 1, 11).getValues().forEach(function (r) {
    var j = {}; try { j = JSON.parse(r[10]); } catch (e) {}
    var typeKey = j.type || 'other';
    out.push({ id: String(r[0]), ts: Math.floor(new Date(r[1]).getTime() / 1000), type: typeKey, status: r[3] || 'new', note: r[4] || '', fields: j.fields || {} });
  });
  return out.reverse();
}
function rowOf_(id) {
  var f = subSheet_().getRange('A:A').createTextFinder(id).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
}
function admin_(d) {
  var bad = auth_(d);
  if (bad) return { ok: false, error: bad === 'not_configured' ? 'Set ADMIN_PASSWORD in the script properties (see SETUP.md).' : bad === 'locked' ? 'Too many wrong attempts. Try again in 10 minutes.' : 'auth' };
  switch (d.action) {
    case 'ping': return { ok: true };
    case 'list': return { ok: true, rows: rows_(), labels: LABELS };
    case 'status': case 'note': {
      var r = rowOf_(String(d.id)); if (!r) return { ok: false, error: 'Not found' };
      if (d.action === 'status') subSheet_().getRange(r, 4).setValue(['new', 'contacted', 'done'].indexOf(d.status) >= 0 ? d.status : 'new');
      else subSheet_().getRange(r, 5).setValue(str_(d.note, 2000).replace(/^([=+\-@])/, "'$1"));
      return { ok: true };
    }
    case 'delete': { var rr = rowOf_(String(d.id)); if (rr) subSheet_().deleteRow(rr); return { ok: true }; }
    case 'getPrices': { var p = getCfg_('prices'); return { ok: true, prices: p, custom: !!p }; }
    case 'savePrices': return savePrices_(d.prices || {});
    case 'resetPrices': setCfg_('prices', null); return { ok: true };
    case 'getContent': return { ok: true, content: { offices: getCfg_('offices'), posts: getCfg_('posts') || [], team: getCfg_('team') || [] } };
    case 'saveContent': return saveContent_(d.content || {});
    case 'getSettings': return { ok: true, settings: getCfg_('settings') || { notify_to: '', cc_branch: false, from_name: 'Welhan Abroad Study' }, mail: getCfg_('mailstatus') };
    case 'saveSettings': {
      var n = d.settings || {};
      setCfg_('settings', { notify_to: str_(n.notify_to, 300), cc_branch: !!n.cc_branch, from_name: str_(n.from_name, 80) });
      return { ok: true };
    }
    case 'testMail': {
      var s = getCfg_('settings') || {};
      if (!str_(s.notify_to, 300)) return { ok: false, error: 'Enter and save a notification email first.' };
      try { MailApp.sendEmail(s.notify_to.replace(/;/g, ','), 'Test email from Welhan admin', 'This is a test. Form notifications will be sent to this address.', { name: s.from_name || 'Welhan Abroad Study' }); setCfg_('mailstatus', { ok: true, time: Date.now(), error: '' }); return { ok: true }; }
      catch (e) { setCfg_('mailstatus', { ok: false, time: Date.now(), error: String(e.message) }); return { ok: false, error: e.message }; }
    }
    case 'passwd': {
      var np = String(d.password || ''); if (np.length < 8) return { ok: false, error: 'Use at least 8 characters.' };
      PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD', np); return { ok: true };
    }
    case 'upload': return upload_(d);
  }
  return { ok: false, error: 'Unknown action' };
}
function savePrices_(p) {
  var rate = Number(p.rate); if (!(rate >= 1 && rate <= 1000)) return { ok: false, error: 'Exchange rate must be between 1 and 1000.' };
  var prov = [], keep = [];
  (p.providers || []).forEach(function (x, i) { var n = str_(x.name, 60); if (!n) return; var price = Number(x.annualAUD);
    if (!(price > 0 && price < 100000)) throw new Error('Invalid price for ' + n + '.');
    prov.push({ name: n, plan: str_(x.plan, 60), annualAUD: Math.round(price * 100) / 100 }); keep.push(i); });
  if (!prov.length) return { ok: false, error: 'At least one provider is required.' };
  var feat = [];
  (p.features || []).forEach(function (f) { var l = str_(f.label, 80); if (!l) return; feat.push([l, keep.map(function (i) { return str_((f.values || [])[i], 120); })]); });
  setCfg_('prices', { rate: rate, providers: prov, features: feat, updated: Math.floor(Date.now() / 1000) });
  return { ok: true };
}
function saveContent_(c) {
  if (c.hasOwnProperty('offices')) {
    if (c.offices === null) setCfg_('offices', null);
    else setCfg_('offices', (c.offices || []).filter(function (o) { return str_(o.city, 80); }).map(function (o) {
      return { country: str_(o.country, 40), city: str_(o.city, 80), call: str_(o.call, 120), wa: str_(o.wa, 120), email: str_(o.email, 120), address: str_(o.address, 200), mapq: str_(o.mapq, 200) }; }));
  }
  if (c.team) setCfg_('team', c.team.filter(function (m) { return str_(m.name, 80); }).map(function (m) { return { name: str_(m.name, 80), role: str_(m.role, 100), bio: str_(m.bio, 1000), photo: imgOk_(m.photo) }; }));
  if (c.posts) {
    var used = {};
    setCfg_('posts', c.posts.filter(function (p) { return str_(p.title, 150); }).map(function (p) {
      var s = slug_(p.slug || p.title), b = s, k = 2; while (used[s]) s = b + '-' + k++; used[s] = 1;
      return { slug: s, title: str_(p.title, 150), category: str_(p.category || 'News', 40), date: /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd'),
        excerpt: str_(p.excerpt, 300), image: imgOk_(p.image), body: str_(p.body, 30000), published: !!p.published };
    }));
  }
  return { ok: true, content: { offices: getCfg_('offices'), posts: getCfg_('posts') || [], team: getCfg_('team') || [] } };
}
function upload_(d) {
  var mime = String(d.mime || ''), ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime];
  if (!ext) return { ok: false, error: 'Only JPG, PNG or WebP images.' };
  var bytes = Utilities.base64Decode(String(d.data || ''));
  if (bytes.length > 2 * 1024 * 1024) return { ok: false, error: 'Image too large (max 2MB).' };
  var folders = DriveApp.getFoldersByName('Welhan website images'), folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('Welhan website images');
  var file = folder.createFile(Utilities.newBlob(bytes, mime, Utilities.getUuid() + '.' + ext));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { ok: true, path: 'https://lh3.googleusercontent.com/d/' + file.getId() };
}

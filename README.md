# Welhan Abroad Study – website

Static HTML/CSS/JS site for GitHub Pages (no PHP).

- Public pages: `*.html`, assets in `assets/`.
- Admin (leads, dashboard, notes, insurance prices, branches, blog, counsellors, email alerts): `/admin/`.
- Backend: Google Sheets + Apps Script – see `google-apps-script/SETUP.md`. Until `assets/js/config.js` has the Web app URL, forms
  open the visitor's email app and content stays as built.
- OSHC default prices: `assets/js/oshc-data.js` (the admin overrides them once saved).

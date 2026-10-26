# Backend setup (Google Sheets + Apps Script) – about 10 minutes

This makes the website forms, the admin page, price editing, blog, branches and email alerts work on GitHub Pages
without PHP. You only do this once.

1. **Create the Sheet.** Go to https://sheets.new and name it "Welhan Website Data".
2. **Open the script editor.** In the Sheet: *Extensions → Apps Script*. Delete the sample code, paste **all** of `Code.gs`
   from this folder, and click *Save*.
3. **Set the admin password.** In the script editor: gear icon *Project Settings → Script properties → Add script property*:
   name `ADMIN_PASSWORD`, value = your password (use something long). Save.
4. **Deploy.** *Deploy → New deployment → ⚙ Select type: Web app*.
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click *Deploy*, then *Authorize access* (choose your Google account; if it says "Google hasn't verified this app",
   click *Advanced → Go to … (unsafe)* – it is your own script). Allow Sheets, Mail and Drive access.
5. **Copy the Web app URL** (it ends with `/exec`).
6. **Connect the website.** Open `assets/js/config.js`, paste the URL between the quotes after `apiUrl:` and save/commit.
7. **Log in.** Open `https://YOUR-SITE/admin/`, enter the admin password. In *Settings*, enter the email address for lead
   notifications and press *Save & send test email*.

## Good to know
- Every form submission is also a row in the **Submissions** tab of the Sheet, so you can read, filter or export it there too.
- If you edit `Code.gs` later: *Deploy → Manage deployments → ✏ → Version: New version → Deploy*.
- Emails are sent from your Google account (free accounts: about 100 emails per day).
- Prices, branches, blog posts and counsellors you save in the admin appear on the website within about a minute.
- Blog posts are loaded by the page's JavaScript, so Google may index them more slowly than normal pages.
- Photos you upload are stored in a Drive folder called "Welhan website images".
- The admin password is checked by the script on every request; after 10 wrong attempts it locks for 10 minutes.
  To change it: admin → Settings → Change admin password.

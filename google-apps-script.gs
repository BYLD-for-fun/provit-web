/**
 * Shamac waitlist backend.
 *
 * Deploy this as a Google Apps Script Web App bound to a Google Sheet, then put the resulting
 * /exec URL in config.js as WAITLIST_URL.
 *
 * Deploy settings that matter:
 *   Execute as:        Me
 *   Who has access:    Anyone
 *
 * "Anyone" is required because the browser posts without credentials. It also means the endpoint
 * is world-writable, so keep the URL out of git (config.js is gitignored) and treat the sheet as
 * untrusted input: never paste a cell into a shell, a formula, or an HTML page without escaping.
 *
 * The site sends everything as query parameters and sets no custom headers. That keeps the
 * request "simple" in CORS terms, so the browser skips the preflight OPTIONS that Apps Script
 * web apps do not answer.
 */

var SHEET_NAME = 'Waitlist';

function doPost(e) {
  return handle(e);
}

function doGet(e) {
  return handle(e);
}

function handle(e) {
  try {
    var params = (e && e.parameter) || {};
    var email = String(params.email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return json({ status: 'error', message: 'Invalid email' });
    }

    // One writer at a time, or two simultaneous signups can claim the same row.
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sheet = getSheet();
      if (alreadyListed(sheet, email)) {
        // Being on the list twice is not an error worth showing anyone.
        return json({ status: 'success', message: 'Already on the list' });
      }
      sheet.appendRow([
        new Date(),
        email,
        String(params.source || ''),
        String(params.timestamp || ''),
      ]);
    } finally {
      lock.releaseLock();
    }

    return json({ status: 'success' });
  } catch (error) {
    // Never echo the exception: it can contain sheet contents.
    console.error(error);
    return json({ status: 'error', message: 'Could not save that right now' });
  }
}

function getSheet() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(['Received', 'Email', 'Source', 'Client timestamp']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function alreadyListed(sheet, email) {
  var rows = sheet.getLastRow();
  if (rows < 2) return false;
  var existing = sheet.getRange(2, 2, rows - 1, 1).getValues();
  for (var i = 0; i < existing.length; i++) {
    if (String(existing[i][0]).trim().toLowerCase() === email) return true;
  }
  return false;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

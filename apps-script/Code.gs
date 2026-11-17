/**
 * @OnlyCurrentDoc
 */

const REQUESTS_SHEET_NAME = "Requests";
const EVENTS_SHEET_NAME = "Events";
const SESSIONS_SHEET_NAME = "Sessions";

const LEGACY_REQUEST_HEADERS = [
  "Timestamp",
  "Name",
  "Email",
  "LinkedIn URL",
  "Company Name",
  "Role",
  "Offer / Business Summary",
  "Deal Size",
  "Commercial Focus",
  "Current Gaps",
  "Readiness",
  "LinkedIn Current State",
  "Specific Notes",
  "Fit Outcome",
  "Source"
];

// Requests loses four retired columns; Events and Sessions keep their schemas.
const REQUEST_HEADERS = LEGACY_REQUEST_HEADERS.filter(function (header) {
  return ["Deal Size", "Current Gaps", "Readiness", "Fit Outcome"].indexOf(header) === -1;
});

const REQUEST_FIELD_KEYS = [
  "", "name", "email", "linkedin_url", "company_name", "role",
  "offer_summary", "deal_size", "commercial_focus", "current_gaps",
  "readiness", "linkedin_current_state", "specific_notes", "fit_outcome", "source"
];

const EVENT_HEADERS = [
  "Timestamp",
  "Event Name",
  "Session ID",
  "Page URL",
  "Referrer",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "Step Number",
  "Step Name",
  "Fit Outcome",
  "Duration Seconds",
  "Max Step Reached",
  "Form Started",
  "Submitted",
  "Viewport Width",
  "Source"
];

const SESSION_HEADERS = [
  "Session ID",
  "First Seen",
  "Last Seen",
  "Page URL",
  "Referrer",
  "UTM Source",
  "UTM Medium",
  "UTM Campaign",
  "Max Step Reached",
  "Form Started",
  "Submitted",
  "Fit Outcome",
  "Duration Seconds",
  "Viewport Width",
  "Last Event",
  "Source"
];

function doPost(e) {
  try {
    const data = e.parameter || {};
    const recordType = data.record_type || "request";

    if (recordType === "event") {
      return handleEvent_(data);
    }

    return handleRequest_(data);

  } catch (error) {
    return jsonResponse_({
      status: "error",
      message: error.message
    });
  }
}

// Deploy this version BEFORE running migrateRequestsColumns(). It supports both
// layouts so requests can still be saved while Make is paused for remapping.
function handleRequest_(data) {
  return withRequestsLock_(function () {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet_(ss, REQUESTS_SHEET_NAME);
    const headers = getRequestHeaders_(sheet);
    const timestamp = getUkTimestamp_();
    const row = headers.map(function (header) {
      if (header === "Timestamp") return timestamp;
      const key = REQUEST_FIELD_KEYS[LEGACY_REQUEST_HEADERS.indexOf(header)];
      return data[key] || (key === "source" ? "trust-audit-page" : "");
    });
    sheet.appendRow(row);
    return jsonResponse_({status: "success", record_type: "request"});
  });
}

function withRequestsLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return callback();
  } finally {
    try {
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }
  }
}

function getRequestHeaders_(sheet) {
  const existing = sheet.getRange(1, 1, 1, LEGACY_REQUEST_HEADERS.length).getValues()[0];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, REQUEST_HEADERS.length).setValues([REQUEST_HEADERS]);
    sheet.setFrozenRows(1);
    return REQUEST_HEADERS;
  }
  const matches = function (headers) {
    return headers.every(function (header, index) { return existing[index] === header; });
  };
  if (matches(LEGACY_REQUEST_HEADERS)) return LEGACY_REQUEST_HEADERS;
  if (matches(REQUEST_HEADERS)) return REQUEST_HEADERS;
  throw new Error("Requests headers do not match either supported layout. No row was written; inspect the sheet before retrying.");
}

// Run once from the bound editor, AFTER updating the existing web-app deployment
// and pausing Make. This preserves the Requests tab ID and backs up its data.
function migrateRequestsColumns() {
  return withRequestsLock_(function () {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(REQUESTS_SHEET_NAME);
    if (!sheet) throw new Error("Requests sheet is missing. No migration was performed.");
    const headers = getRequestHeaders_(sheet);
    if (headers.length === REQUEST_HEADERS.length) {
      return {status: "already_migrated"};
    }
    const backupName = "Requests backup " + Utilities.formatDate(new Date(), "Europe/London", "yyyyMMdd_HHmmss_SSS");
    sheet.copyTo(ss).setName(backupName);
    // Delete right to left so the remaining indexes do not move prematurely.
    sheet.deleteColumns(14, 1); // N: Fit Outcome
    sheet.deleteColumns(10, 2); // J: Current Gaps, K: Readiness
    sheet.deleteColumns(8, 1);  // H: Deal Size
    const migrated = getRequestHeaders_(sheet);
    if (migrated.length !== REQUEST_HEADERS.length) throw new Error("Migration verification failed; inspect " + backupName);
    sheet.setFrozenRows(1);
    return {status: "migrated", backup_sheet: backupName};
  });
}

function handleEvent_(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const eventsSheet = getOrCreateSheet_(ss, EVENTS_SHEET_NAME);
  ensureHeaders_(eventsSheet, EVENT_HEADERS);

  const timestamp = getUkTimestamp_();

  const eventRow = [
    timestamp,
    data.event_name || "",
    data.session_id || "",
    data.page_url || "",
    data.referrer || "",
    data.utm_source || "",
    data.utm_medium || "",
    data.utm_campaign || "",
    data.step_number || "",
    data.step_name || "",
    data.fit_outcome || "",
    data.duration_seconds || "",
    data.max_step_reached || "",
    data.form_started || "",
    data.submitted || "",
    data.viewport_width || "",
    data.source || "trust-audit-page"
  ];

  eventsSheet.appendRow(eventRow);

  updateSession_(ss, data, timestamp);

  return jsonResponse_({
    status: "success",
    record_type: "event"
  });
}

function updateSession_(spreadsheet, data, timestamp) {
  const sessionId = data.session_id || "";

  if (!sessionId) {
    return;
  }

  const sheet = getOrCreateSheet_(spreadsheet, SESSIONS_SHEET_NAME);
  ensureHeaders_(sheet, SESSION_HEADERS);

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    appendNewSession_(sheet, data, timestamp);
    return;
  }

  const sessionIds = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues()
    .map(function (row) {
      return String(row[0]);
    });

  const existingIndex = sessionIds.indexOf(String(sessionId));

  if (existingIndex === -1) {
    appendNewSession_(sheet, data, timestamp);
    return;
  }

  const rowNumber = existingIndex + 2;
  updateExistingSession_(sheet, rowNumber, data, timestamp);
}

function appendNewSession_(sheet, data, timestamp) {
  const maxStepReached = normaliseNumber_(data.max_step_reached || data.step_number || "");
  const durationSeconds = normaliseNumber_(data.duration_seconds || "");

  const row = [
    data.session_id || "",
    timestamp,
    timestamp,
    data.page_url || "",
    data.referrer || "",
    data.utm_source || "",
    data.utm_medium || "",
    data.utm_campaign || "",
    maxStepReached,
    normaliseBoolean_(data.form_started),
    normaliseSubmitted_(data),
    data.fit_outcome || "",
    durationSeconds,
    data.viewport_width || "",
    data.event_name || "",
    data.source || "trust-audit-page"
  ];

  sheet.appendRow(row);
}

function updateExistingSession_(sheet, rowNumber, data, timestamp) {
  const currentValues = sheet
    .getRange(rowNumber, 1, 1, SESSION_HEADERS.length)
    .getValues()[0];

  const currentMaxStep = normaliseNumber_(currentValues[8]);
  const incomingMaxStep = normaliseNumber_(data.max_step_reached || data.step_number || "");
  const newMaxStep = Math.max(currentMaxStep, incomingMaxStep);

  const currentDuration = normaliseNumber_(currentValues[12]);
  const incomingDuration = normaliseNumber_(data.duration_seconds || "");
  const newDuration = Math.max(currentDuration, incomingDuration);

  const currentFormStarted = normaliseBoolean_(currentValues[9]);
  const incomingFormStarted = normaliseBoolean_(data.form_started) || data.event_name === "form_started";
  const newFormStarted = currentFormStarted || incomingFormStarted;

  const currentSubmitted = normaliseBoolean_(currentValues[10]);
  const incomingSubmitted = normaliseSubmitted_(data);
  const newSubmitted = currentSubmitted || incomingSubmitted;

  const currentFitOutcome = currentValues[11] || "";
  const newFitOutcome = data.fit_outcome || currentFitOutcome;

  const currentPageUrl = currentValues[3] || "";
  const currentReferrer = currentValues[4] || "";
  const currentUtmSource = currentValues[5] || "";
  const currentUtmMedium = currentValues[6] || "";
  const currentUtmCampaign = currentValues[7] || "";
  const currentViewportWidth = currentValues[13] || "";
  const currentSource = currentValues[15] || "";

  const updatedRow = [
    currentValues[0],
    currentValues[1],
    timestamp,
    currentPageUrl || data.page_url || "",
    currentReferrer || data.referrer || "",
    currentUtmSource || data.utm_source || "",
    currentUtmMedium || data.utm_medium || "",
    currentUtmCampaign || data.utm_campaign || "",
    newMaxStep,
    newFormStarted,
    newSubmitted,
    newFitOutcome,
    newDuration,
    currentViewportWidth || data.viewport_width || "",
    data.event_name || currentValues[14] || "",
    currentSource || data.source || "trust-audit-page"
  ];

  sheet
    .getRange(rowNumber, 1, 1, SESSION_HEADERS.length)
    .setValues([updatedRow]);
}

function normaliseNumber_(value) {
  const numberValue = Number(value);

  if (isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function normaliseBoolean_(value) {
  if (value === true) {
    return true;
  }

  const stringValue = String(value).toLowerCase();

  return stringValue === "true" || stringValue === "yes" || stringValue === "1";
}

function normaliseSubmitted_(data) {
  return normaliseBoolean_(data.submitted) || data.event_name === "form_submitted";
}

function getOrCreateSheet_(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  return sheet;
}

function ensureHeaders_(sheet, headers) {
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  const existingHeaders = headerRange.getValues()[0];

  const hasAnyHeaders = existingHeaders.some(function (value) {
    return String(value).trim() !== "";
  });

  if (!hasAnyHeaders) {
    headerRange.setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  const headersAreDifferent = headers.some(function (header, index) {
    return existingHeaders[index] !== header;
  });

  if (headersAreDifferent) {
    headerRange.setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function getUkTimestamp_() {
  return Utilities.formatDate(
    new Date(),
    "Europe/London",
    "yyyy-MM-dd HH:mm:ss"
  );
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

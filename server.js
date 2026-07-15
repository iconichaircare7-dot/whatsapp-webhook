// Iconic Message Log Apps Script - WAITING_NOTE_FIX
// Adds employee note tag: Close to clear Waiting.

const MESSAGE_HEADERS = [
  "time",
  "phone",
  "customerName",
  "branch",
  "sender",
  "body",
  "status",
  "messageType",
  "phoneNumberId",
  "opt_in",
  "opt_in_date",
  "opt_in_source",
  "opt_out",
  "opt_out_date"
];

const MESSAGE_SHEET_NAME = "Messages";

const ARCHIVED_MESSAGES_SHEET_NAME = "ArchivedMessages";

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeDigits_(value) {
  return String(value || "").replace(/\D/g, "");
}

function phonesMatchForClean_(left, right) {
  const a = normalizeDigits_(left);
  const b = normalizeDigits_(right);

  if (!a || !b) {
    return String(left || "").trim() === String(right || "").trim();
  }

  return a === b || a.endsWith(b) || b.endsWith(a);
}

function getArchiveSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ARCHIVED_MESSAGES_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(ARCHIVED_MESSAGES_SHEET_NAME);
  }

  ensureArchiveHeaders_(sheet);
  return sheet;
}

function ensureArchiveHeaders_(sheet) {
  const archiveHeaders = [
    "archived_at",
    "archived_by",
    "archive_reason"
  ].concat(MESSAGE_HEADERS);

  const firstRow = sheet.getRange(1, 1, 1, archiveHeaders.length).getDisplayValues()[0];
  const hasAnyHeader = firstRow.some(function(cell) {
    return String(cell || "").trim() !== "";
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, archiveHeaders.length).setValues([archiveHeaders]);
    return;
  }

  sheet.getRange(1, 1, 1, archiveHeaders.length).setValues([archiveHeaders]);
}

function cleanChat_(payload) {
  const phone = cleanText_(payload.phone || "");
  const phoneNumberId = cleanText_(payload.phoneNumberId || "");
  const requestedBy = String(payload.requestedBy || "Team Inbox").trim();

  if (!phone) {
    return jsonOutput_({
      ok: false,
      code: "MISSING_PHONE",
      error: "Missing customer phone."
    });
  }

  const activeSheet = getMessageSheet_();
  ensureMessageHeaders_(activeSheet);

  const archiveSheet = getArchiveSheet_();
  ensureArchiveHeaders_(archiveSheet);

  const lastRow = activeSheet.getLastRow();
  const lastColumn = MESSAGE_HEADERS.length;

  if (lastRow <= 1) {
    return jsonOutput_({
      ok: true,
      archivedCount: 0,
      deletedCount: 0,
      message: "No active messages to clean."
    });
  }

  const values = activeSheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const headers = values[0].map(function(header) {
    return String(header || "").trim();
  });

  const phoneCol = headers.indexOf("phone");
  const phoneNumberIdCol = headers.indexOf("phoneNumberId");

  if (phoneCol === -1) {
    return jsonOutput_({
      ok: false,
      code: "PHONE_COLUMN_MISSING",
      error: "The active sheet does not contain a phone column."
    });
  }

  const rowsToArchive = [];
  const rowsToDelete = [];
  const archivedAt = getDubaiTimestamp_();

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const rowPhone = cleanText_(row[phoneCol] || "");
    const rowPhoneNumberId = phoneNumberIdCol >= 0 ? cleanText_(row[phoneNumberIdCol] || "") : "";

    const phoneMatches = phonesMatchForClean_(rowPhone, phone);
    const lineMatches = !phoneNumberId || !rowPhoneNumberId || rowPhoneNumberId === phoneNumberId;

    if (phoneMatches && lineMatches) {
      rowsToArchive.push([
        archivedAt,
        requestedBy,
        "Clean Chat from Team Inbox"
      ].concat(row.slice(0, MESSAGE_HEADERS.length)));

      rowsToDelete.push(rowIndex + 1);
    }
  }

  if (!rowsToArchive.length) {
    return jsonOutput_({
      ok: true,
      archivedCount: 0,
      deletedCount: 0,
      message: "No matching active messages found."
    });
  }

  archiveSheet
    .getRange(archiveSheet.getLastRow() + 1, 1, rowsToArchive.length, rowsToArchive[0].length)
    .setValues(rowsToArchive);

  rowsToDelete
    .sort(function(a, b) { return b - a; })
    .forEach(function(rowNumber) {
      activeSheet.deleteRow(rowNumber);
    });

  return jsonOutput_({
    ok: true,
    archivedCount: rowsToArchive.length,
    deletedCount: rowsToDelete.length,
    phone: phone,
    phoneNumberId: phoneNumberId
  });
}


const STATE_SHEET_NAME = "Conversation State";

const STATE_HEADERS = [
  "phone",
  "phoneNumberId",
  "branch",
  "conversation_status",
  "assigned_to",
  "tags",
  "last_updated_by",
  "last_updated_at"
];

const BOOKING_SHEET_NAME = "Iconic WhatsApp Booking Requests";

const BOOKING_HEADERS = [
  "Date",
  "Customer Name",
  "Phone",
  "Branch",
  "Phone Number ID",
  "Request Type",
  "Message",
  "Status",
  "Notes",
  "Last Updated"
];

function getMessageSheet_() {
  // Fixed:
  // Always use the dedicated messages sheet by name instead of the active/first sheet.
  // This prevents Team Inbox from showing only a few conversations if sheet order changes.
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(MESSAGE_SHEET_NAME);

  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(MESSAGE_SHEET_NAME);
  }

  ensureMessageHeaders_(sheet);
  return sheet;
}

function getStateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(STATE_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(STATE_SHEET_NAME);
  }

  ensureStateHeaders_(sheet);
  return sheet;
}

function getBookingSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(BOOKING_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(BOOKING_SHEET_NAME);
  }

  ensureBookingHeaders_(sheet);
  return sheet;
}

function forceText_(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const text = String(value);

  if (text.startsWith("'")) {
    return text;
  }

  return "'" + text;
}

function cleanText_(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).replace(/^'/, "");
}


function normalizeStateTagList_(value) {
  return String(value || "")
    .split(",")
    .map(function(tag) {
      return String(tag || "").trim();
    })
    .filter(function(tag) {
      return tag !== "";
    });
}

function mergeStateTags_() {
  const seen = {};
  const merged = [];

  for (let i = 0; i < arguments.length; i += 1) {
    normalizeStateTagList_(arguments[i]).forEach(function(tag) {
      const key = tag.toLowerCase();

      if (!seen[key]) {
        seen[key] = true;
        merged.push(tag);
      }
    });
  }

  return merged.join(", ");
}

function isInboundCustomerMessage_(data) {
  const sender = String(data.sender || "").trim().toLowerCase();
  const messageType = String(data.messageType || "").trim().toLowerCase();

  if (sender === "customer") {
    return true;
  }

  return messageType.indexOf("customer message") !== -1;
}

function getExistingConversationState_(phone, phoneNumberId) {
  const sheet = getStateSheet_();
  ensureStateHeaders_(sheet);

  const cleanPhone = cleanText_(phone || "");
  const cleanPhoneNumberId = cleanText_(phoneNumberId || "");

  if (!cleanPhone) {
    return null;
  }

  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return null;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, STATE_HEADERS.length).getDisplayValues();
  const targetKey = getStateKey_(cleanPhone, cleanPhoneNumberId);
  let phoneOnlyMatch = null;

  for (let i = 0; i < values.length; i += 1) {
    const row = values[i];
    const rowState = {
      rowNumber: i + 2,
      phone: cleanText_(row[0] || ""),
      phoneNumberId: cleanText_(row[1] || ""),
      branch: row[2] ? String(row[2]) : "",
      conversation_status: row[3] ? String(row[3]) : "",
      assigned_to: row[4] ? String(row[4]) : "",
      tags: row[5] ? String(row[5]) : "",
      last_updated_by: row[6] ? String(row[6]) : "",
      last_updated_at: row[7] ? String(row[7]) : ""
    };

    const rowKey = getStateKey_(rowState.phone, rowState.phoneNumberId);

    if (cleanPhoneNumberId && rowKey === targetKey) {
      return rowState;
    }

    if (!phoneOnlyMatch && phonesMatchForClean_(rowState.phone, cleanPhone)) {
      phoneOnlyMatch = rowState;
    }
  }

  return phoneOnlyMatch;
}

function setInboundCustomerWaitingState_(data) {
  if (!isInboundCustomerMessage_(data)) {
    return {
      ok: true,
      skipped: true,
      reason: "not_customer_message"
    };
  }

  const phone = cleanText_(data.phone || "");
  const phoneNumberId = cleanText_(data.phoneNumberId || "");

  if (!phone || !phoneNumberId) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_phone_or_phoneNumberId"
    };
  }

  const existingState = getExistingConversationState_(phone, phoneNumberId) || {};

  return saveConversationState_({
    phone: phone,
    phoneNumberId: phoneNumberId,
    branch: data.branch || existingState.branch || "",
    conversation_status: "Waiting",
    assigned_to: existingState.assigned_to || data.assigned_to || data.assignedTo || "",
    tags: mergeStateTags_(existingState.tags || "", data.tags || "", "Waiting", "Close to clear Waiting"),
    last_updated_by: "Customer Message",
    last_updated_at: data.time || getDubaiTimestamp_()
  });
}


function ensureMessageHeaders_(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, MESSAGE_HEADERS.length).getDisplayValues()[0];
  const hasAnyHeader = firstRow.some(function(cell) {
    return String(cell || "").trim() !== "";
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, MESSAGE_HEADERS.length).setValues([MESSAGE_HEADERS]);
    return;
  }

  sheet.getRange(1, 1, 1, MESSAGE_HEADERS.length).setValues([MESSAGE_HEADERS]);
}

function ensureStateHeaders_(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, STATE_HEADERS.length).getDisplayValues()[0];
  const hasAnyHeader = firstRow.some(function(cell) {
    return String(cell || "").trim() !== "";
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, STATE_HEADERS.length).setValues([STATE_HEADERS]);
    return;
  }

  sheet.getRange(1, 1, 1, STATE_HEADERS.length).setValues([STATE_HEADERS]);
}

function ensureBookingHeaders_(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, BOOKING_HEADERS.length).getDisplayValues()[0];
  const hasAnyHeader = firstRow.some(function(cell) {
    return String(cell || "").trim() !== "";
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]);
    return;
  }

  sheet.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]);
}

function getDubaiTimestamp_() {
  return new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" });
}

function getStateKey_(phone, phoneNumberId) {
  return cleanText_(phone) + "|" + cleanText_(phoneNumberId);
}

function saveConversationState_(data) {
  const sheet = getStateSheet_();
  ensureStateHeaders_(sheet);

  const phone = cleanText_(data.phone || "");
  const phoneNumberId = cleanText_(data.phoneNumberId || "");

  if (!phone || !phoneNumberId) {
    return {
      ok: false,
      error: "Missing phone or phoneNumberId"
    };
  }

  const branch = data.branch || "";
  const conversationStatus = data.conversation_status || data.status || "";
  const assignedTo = data.assigned_to || data.assignedTo || "";
  const tags = Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags || "");
  const lastUpdatedBy = data.last_updated_by || data.updatedBy || "Team Inbox";
  const lastUpdatedAt = data.last_updated_at || getDubaiTimestamp_();

  const lastRow = sheet.getLastRow();
  const values = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, STATE_HEADERS.length).getDisplayValues()
    : [];

  const targetKey = getStateKey_(phone, phoneNumberId);
  let targetRow = -1;

  for (let i = 0; i < values.length; i++) {
    const rowPhone = cleanText_(values[i][0] || "");
    const rowPhoneNumberId = cleanText_(values[i][1] || "");
    const rowKey = getStateKey_(rowPhone, rowPhoneNumberId);

    if (rowKey === targetKey) {
      targetRow = i + 2;
      break;
    }
  }

  const row = [
    forceText_(phone),
    forceText_(phoneNumberId),
    branch,
    conversationStatus,
    assignedTo,
    tags,
    lastUpdatedBy,
    lastUpdatedAt
  ];

  if (targetRow > -1) {
    sheet.getRange(targetRow, 1, 1, STATE_HEADERS.length).setValues([row]);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, STATE_HEADERS.length).setValues([row]);
  }

  return {
    ok: true,
    phone: phone,
    phoneNumberId: phoneNumberId,
    conversation_status: conversationStatus,
    assigned_to: assignedTo,
    tags: tags
  };
}

function saveBookingRequest_(data) {
  const sheet = getBookingSheet_();
  ensureBookingHeaders_(sheet);

  const phone = cleanText_(data.phone || "");
  const phoneNumberId = cleanText_(data.phoneNumberId || "");

  if (!phone || !phoneNumberId) {
    return {
      ok: false,
      error: "Missing phone or phoneNumberId"
    };
  }

  const now = getDubaiTimestamp_();
  const todayKey = String(now).split(",")[0].trim();
  const requestType = data.requestType || "Booking Request";
  const bookingStatus = data.bookingStatus || data.status || "Pending";

  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, BOOKING_HEADERS.length).getDisplayValues();

    for (let i = 0; i < values.length; i++) {
      const row = values[i];

      const rowDateKey = String(row[0] || "").split(",")[0].trim();
      const rowPhone = cleanText_(row[2] || "");
      const rowPhoneNumberId = cleanText_(row[4] || "");
      const rowRequestType = String(row[5] || "").trim();
      const rowStatus = String(row[7] || "").trim().toLowerCase();

      const isSameCustomer = rowPhone === phone;
      const isSameLine = rowPhoneNumberId === phoneNumberId;
      const isSameDay = rowDateKey === todayKey;
      const isPendingBooking = rowRequestType === "Booking Request" && rowStatus === "pending";

      if (isSameCustomer && isSameLine && isSameDay && isPendingBooking) {
        return {
          ok: true,
          duplicate: true,
          skipped: true,
          reason: "Existing pending booking request for same customer and same branch today",
          existingRow: i + 2,
          phone: phone,
          phoneNumberId: phoneNumberId,
          requestType: requestType,
          status: "Pending"
        };
      }
    }
  }

  const row = [
    data.date || data.time || now,
    data.customerName || "",
    forceText_(phone),
    data.branch || "",
    forceText_(phoneNumberId),
    requestType,
    data.message || data.body || "",
    bookingStatus,
    data.notes || "",
    data.lastUpdated || now
  ];

  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 1, 1, BOOKING_HEADERS.length).setValues([row]);

  return {
    ok: true,
    duplicate: false,
    phone: phone,
    phoneNumberId: phoneNumberId,
    requestType: requestType,
    status: bookingStatus
  };
}

function loadBookingRequests_() {
  const sheet = getBookingSheet_();
  ensureBookingHeaders_(sheet);

  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, BOOKING_HEADERS.length).getDisplayValues();

  return values
    .filter(function(row) {
      return cleanText_(row[2] || "") !== "";
    })
    .map(function(row, index) {
      return {
        rowNumber: index + 2,
        date: row[0] ? String(row[0]) : "",
        customerName: row[1] ? String(row[1]) : "",
        phone: row[2] ? cleanText_(row[2]) : "",
        branch: row[3] ? String(row[3]) : "",
        phoneNumberId: row[4] ? cleanText_(row[4]) : "",
        requestType: row[5] ? String(row[5]) : "",
        message: row[6] ? String(row[6]) : "",
        status: row[7] ? String(row[7]) : "",
        notes: row[8] ? String(row[8]) : "",
        lastUpdated: row[9] ? String(row[9]) : ""
      };
    })
    .reverse();
}

function updateBookingRequestStatus_(data) {
  const sheet = getBookingSheet_();
  ensureBookingHeaders_(sheet);

  const lastRow = sheet.getLastRow();
  const requestedRowNumber = Number(data.rowNumber || data.row || 0);
  const phone = cleanText_(data.phone || "");
  const phoneNumberId = cleanText_(data.phoneNumberId || "");
  const newStatus = String(data.status || data.bookingStatus || "").trim();
  const notes = data.notes !== undefined && data.notes !== null ? String(data.notes) : "";
  const now = getDubaiTimestamp_();

  if (!newStatus) {
    return {
      ok: false,
      error: "Missing status"
    };
  }

  if (lastRow <= 1) {
    return {
      ok: false,
      error: "No booking requests found"
    };
  }

  let targetRow = -1;

  if (requestedRowNumber > 1 && requestedRowNumber <= lastRow) {
    targetRow = requestedRowNumber;
  }

  if (targetRow === -1 && phone && phoneNumberId) {
    const values = sheet.getRange(2, 1, lastRow - 1, BOOKING_HEADERS.length).getDisplayValues();

    for (let i = values.length - 1; i >= 0; i--) {
      const row = values[i];
      const rowPhone = cleanText_(row[2] || "");
      const rowPhoneNumberId = cleanText_(row[4] || "");

      if (rowPhone === phone && rowPhoneNumberId === phoneNumberId) {
        targetRow = i + 2;
        break;
      }
    }
  }

  if (targetRow === -1) {
    return {
      ok: false,
      error: "Booking request not found"
    };
  }

  sheet.getRange(targetRow, 8).setValue(newStatus);

  if (data.notes !== undefined) {
    sheet.getRange(targetRow, 9).setValue(notes);
  }

  sheet.getRange(targetRow, 10).setValue(now);

  return {
    ok: true,
    rowNumber: targetRow,
    status: newStatus,
    notes: notes,
    lastUpdated: now
  };
}

function loadConversationStates_() {
  const sheet = getStateSheet_();
  ensureStateHeaders_(sheet);

  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, STATE_HEADERS.length).getDisplayValues();

  return values
    .filter(function(row) {
      return cleanText_(row[0] || "") !== "";
    })
    .map(function(row) {
      return {
        phone: cleanText_(row[0] || ""),
        phoneNumberId: cleanText_(row[1] || ""),
        branch: row[2] ? String(row[2]) : "",
        conversation_status: row[3] ? String(row[3]) : "",
        assigned_to: row[4] ? String(row[4]) : "",
        tags: row[5] ? String(row[5]) : "",
        last_updated_by: row[6] ? String(row[6]) : "",
        last_updated_at: row[7] ? String(row[7]) : ""
      };
    });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === "clean_chat") {
      return cleanChat_(data);
    }

    if (data.action === "saveConversationState") {
      const result = saveConversationState_(data);

      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "saveBookingRequest") {
      const result = saveBookingRequest_(data);

      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "loadBookingRequests") {
      const result = {
        ok: true,
        bookingRequests: loadBookingRequests_()
      };

      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "updateBookingRequestStatus") {
      const result = updateBookingRequestStatus_(data);

      return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = getMessageSheet_();

    const row = [
      data.time || "",
      forceText_(data.phone || ""),
      data.customerName || "",
      data.branch || "",
      data.sender || "",
      data.body || "",
      data.status || "",
      data.messageType || "",
      forceText_(data.phoneNumberId || ""),
      data.opt_in || "",
      data.opt_in_date || "",
      data.opt_in_source || "",
      data.opt_out || "",
      data.opt_out_date || ""
    ];

    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, MESSAGE_HEADERS.length).setValues([row]);

    const waitingStateResult = setInboundCustomerWaitingState_(data);

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        waitingState: waitingStateResult
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const sheet = getMessageSheet_();

    const lastRow = sheet.getLastRow();
    const lastColumn = MESSAGE_HEADERS.length;

    let messages = [];

    if (lastRow > 1) {
      const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getDisplayValues();

      messages = values
        .map(function(row) {
          return {
            time: row[0] ? String(row[0]) : "",
            phone: row[1] ? cleanText_(row[1]) : "",
            customerName: row[2] ? String(row[2]) : "",
            branch: row[3] ? String(row[3]) : "",
            sender: row[4] ? String(row[4]) : "",
            body: row[5] ? String(row[5]).slice(0, 3000) : "",
            status: row[6] ? String(row[6]) : "",
            messageType: row[7] ? String(row[7]) : "",
            phoneNumberId: row[8] ? cleanText_(row[8]) : "",
            opt_in: row[9] ? String(row[9]) : "",
            opt_in_date: row[10] ? String(row[10]) : "",
            opt_in_source: row[11] ? String(row[11]) : "",
            opt_out: row[12] ? String(row[12]) : "",
            opt_out_date: row[13] ? String(row[13]) : ""
          };
        })
        .filter(function(message) {
          return message.phone !== "";
        })
        .sort(function(a, b) {
          const dateA = new Date(a.time).getTime() || 0;
          const dateB = new Date(b.time).getTime() || 0;
          return dateB - dateA;
        })
        .slice(0, 7000);
    }

    const conversationStates = loadConversationStates_();
    const bookingRequests = loadBookingRequests_();

    return ContentService
      .createTextOutput(JSON.stringify({
        ok: true,
        messages: messages,
        conversationStates: conversationStates,
        bookingRequests: bookingRequests,
        debug: {
          messageSheetName: sheet.getName(),
          messageLastRow: lastRow,
          returnedMessagesCount: messages.length,
          sorting: "newest_first_by_time"
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

# 811 Passive Logger Diagnostic

Source-only diagnostic. No environment-variable values are resolved or printed.

## Hit lines
1355
1396
1399
1419
1425
1428
3242
3538
4995
5008
5049
5870
5879
5889
5899
5928
6611
6637
6659
6688
6696
6752
6952
6958
7122
7134
7146
7159
7171
7189
7201
7216
7230
7240
7252
7309
7336
7367
7397
7404
7756
7782
7799
7818
7832
7846
7860
7870
7896
8691
8709
8817
8818
8821
8869
8872
8938
8941
8942
8983
8986
9372
9468
9526
9585
9798
10271
10282
10358
10389
10399
10433
10436
10564
10578
10586
10743
10762
10773
10871
10890
10901
40393
40446
40538
40563
40587
40623
40634
40644
40648
40660
40670
40674
40686
40697
40723
40737
40768
40776
40803
40812
40841
40932
40945
40958
40977
40990
41009
41029
41066
41079
41093
41139
41203
41239
41261
41293
41315
41359
41375
41395
41580
41619
41622
41630

## Source lines 1320-1483
```javascript
1320:     const buttonBlock = originalBody.slice(markerStart + markerText.length);
1321:     const localizedMessage = cleanLocalizedReplyBody(messagePart, replyLanguage);
1322:     const localizedButtons = localizeInboxLogButtonBlock(buttonBlock, replyLanguage);
1323: 
1324:     return [
1325:       localizedMessage,
1326:       localizedButtons ? `${markerLabel}:\n${localizedButtons}` : ""
1327:     ].filter(Boolean).join("\n\n").trim();
1328:   }
1329: 
1330:   return cleanLocalizedReplyBody(originalBody, replyLanguage);
1331: }
1332: 
1333: function fixLoadedEmptyCustomerBody(message = {}) {
1334:   const sender = (message.sender || "").toString().trim();
1335:   const body = (message.body || "").toString();
1336:   const customerName = (message.customerName || "").toString().trim();
1337: 
1338:   if (sender !== "customer") {
1339:     return body;
1340:   }
1341: 
1342:   const cleanBody = body.trim();
1343: 
1344:   if (!cleanBody) {
1345:     return "Customer interaction received (details not saved)";
1346:   }
1347: 
1348:   if (customerName && cleanBody === `${customerName}:`) {
1349:     return `${customerName}: Customer interaction received (details not saved)`;
1350:   }
1351: 
1352:   return body;
1353: }
1354: 
1355: function addInboxMessage(phone, sender, body, status = "Bot", phoneNumberId = null, options = {}) {
1356:   const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || conversationPhoneNumberId[phone] || DUBAI_PHONE_NUMBER_ID);
1357:   const lineConfig = getLineConfig(finalPhoneNumberId);
1358: 
1359:   const inboxBody = sender === "bot"
1360:     ? localizeInboxBotLogBody(phone, body, options)
1361:     : body;
1362: 
1363:   const item = {
1364:     time: new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" }),
1365:     phone,
1366:     customerName: options.customerName || "",
1367:     branch: lineConfig.branch,
1368:     sender,
1369:     body: inboxBody,
1370:     status: options.statusOverride || conversationStatus[phone] || status,
1371:     messageType: options.messageType || getDefaultMessageType(sender, status),
1372:     phoneNumberId: finalPhoneNumberId
1373:   };
1374: 
1375:   // Extra fields are used for opt-in / opt-out rows.
1376:   // Existing Google Sheet logging still receives the normal message fields.
1377:   if (options.extraFields && typeof options.extraFields === "object") {
1378:     Object.assign(item, options.extraFields);
1379:   }
1380: 
1381:   inboxMessages.unshift(item);
1382: 
1383:   if (inboxMessages.length > 300) {
1384:     inboxMessages.pop();
1385:   }
1386: 
1387:   saveMessageToGoogleSheet(item).catch((error) => {
1388:     console.log("Google Sheet log failed:");
1389:     console.log(error);
1390:   });
1391: 
1392:   return item;
1393: }
1394: 
1395: async function saveMessageToGoogleSheet(item) {
1396:   const sheetUrl = process.env.SHEET_WEBHOOK_URL;
1397: 
1398:   if (!sheetUrl) {
1399:     console.log("SHEET_WEBHOOK_URL is missing. Google Sheet log skipped.");
1400:     return;
1401:   }
1402: 
1403:   const response = await fetch(sheetUrl, {
1404:     method: "POST",
1405:     headers: {
1406:       "Content-Type": "application/json"
1407:     },
1408:     body: JSON.stringify(item)
1409:   });
1410: 
1411:   const text = await response.text();
1412: 
1413:   if (!response.ok) {
1414:     console.log("Google Sheet log HTTP failed:");
1415:     console.log(response.status, text);
1416:     return;
1417:   }
1418: 
1419:   console.log("Google Sheet log saved:");
1420:   console.log(text);
1421:   clearMessagesApiSheetCache("message saved");
1422: }
1423: 
1424: async function loadMessagesFromGoogleSheet() {
1425:   const sheetUrl = process.env.SHEET_WEBHOOK_URL;
1426: 
1427:   if (!sheetUrl) {
1428:     console.log("SHEET_WEBHOOK_URL is missing. Loading messages from memory only.");
1429:     return { messages: [], conversationStates: [], bookingRequests: [] };
1430:   }
1431: 
1432:   try {
1433:     const response = await fetch(sheetUrl, { method: "GET" });
1434:     const text = await response.text();
1435: 
1436:     if (!response.ok) {
1437:       console.log("Google Sheet load HTTP failed:");
1438:       console.log(response.status, text);
1439:       return { messages: [], conversationStates: [], bookingRequests: [] };
1440:     }
1441: 
1442:     const data = JSON.parse(text);
1443: 
1444:     if (!data.ok || !Array.isArray(data.messages)) {
1445:       console.log("Google Sheet load returned unexpected data:");
1446:       console.log(text);
1447:       return { messages: [], conversationStates: [], bookingRequests: [] };
1448:     }
1449: 
1450:     const messages = data.messages.map((message) => ({
1451:       time: message.time || "",
1452:       phone: message.phone || "",
1453:       customerName: message.customerName || "",
1454:       branch: message.branch || "",
1455:       sender: message.sender || "",
1456:       body: fixLoadedEmptyCustomerBody(message),
1457:       status: message.status || "",
1458:       messageType: message.messageType || "",
1459:       phoneNumberId: message.phoneNumberId || "",
1460:       opt_in: message.opt_in || "",
1461:       opt_in_date: message.opt_in_date || "",
1462:       opt_in_source: message.opt_in_source || "",
1463:       opt_out: message.opt_out || "",
1464:       opt_out_date: message.opt_out_date || ""
1465:     }));
1466: 
1467:     const conversationStates = Array.isArray(data.conversationStates)
1468:       ? data.conversationStates.map((state) => ({
1469:           phone: state.phone || "",
1470:           phoneNumberId: state.phoneNumberId || "",
1471:           branch: state.branch || "",
1472:           conversation_status: state.conversation_status || "",
1473:           assigned_to: state.assigned_to || "",
1474:           tags: state.tags || "",
1475:           last_updated_by: state.last_updated_by || "",
1476:           last_updated_at: state.last_updated_at || ""
1477:         }))
1478:       : [];
1479: 
1480:     const bookingRequests = Array.isArray(data.bookingRequests)
1481:       ? data.bookingRequests.map((booking) => ({
1482:           rowNumber: booking.rowNumber || "",
1483:           date: booking.date || "",
```

## Source lines 3207-3297
```javascript
3207:         if (preferredDay) parts.push(`Preferred day: ${humanizeActionId(preferredDay)}`);
3208:         if (preferredTime) parts.push(`Preferred time: ${humanizeActionId(preferredTime)}`);
3209:         if (teamMember) parts.push(`Team member: ${humanizeActionId(teamMember)}`);
3210:         if (serviceType) parts.push(`Service type: ${humanizeActionId(serviceType)}`);
3211:         if (notes) parts.push(`Notes: ${notes}`);
3212: 
3213:         return parts.join("\n");
3214:       }
3215: 
3216:       return "WhatsApp Flow response received";
3217:     }
3218:   }
3219: 
3220:   return "";
3221: }
3222: 
3223: function buildCustomerActionBody(profileName = "", actionText = "") {
3224:   const cleanAction = (actionText || "").toString().trim();
3225:   const cleanName = cleanCustomerName(profileName || "");
3226: 
3227:   if (!cleanAction) {
3228:     return "";
3229:   }
3230: 
3231:   return cleanName ? `${cleanName}: ${cleanAction}` : cleanAction;
3232: }
3233: 
3234: function logCustomerActionForInbox({ from, message, profileName = "", rawText = "", fallbackAction = "", status = "Bot", phoneNumberId = DUBAI_PHONE_NUMBER_ID, messageType = "Customer Message" }) {
3235:   const actionText = getSmartCustomerActionText(message, rawText) || fallbackAction;
3236:   const customerBody = buildCustomerActionBody(profileName, actionText);
3237: 
3238:   if (!customerBody || !customerBody.toString().trim()) {
3239:     return;
3240:   }
3241: 
3242:   addInboxMessage(from, "customer", customerBody, status, phoneNumberId, {
3243:     customerName: profileName,
3244:     messageType
3245:   });
3246: }
3247: 
3248: function getCustomerChatLink(customerNumber) {
3249:   return `https://wa.me/${customerNumber}`;
3250: }
3251: 
3252: // V31.5.8.60.3.9.38 - Bot typing indicator internal-test fix:
3253: // Show WhatsApp "typing..." briefly before bot replies to customer messages.
3254: // This is intentionally used only for inbound customer webhook messages, not staff sends,
3255: // staff notifications, templates, reminders, or follow-up cron jobs.
3256: // Internal/staff test numbers are now allowed to see typing too, because they are often used for bot testing.
3257: const BOT_TYPING_INDICATOR_ENABLED = (process.env.BOT_TYPING_INDICATOR_ENABLED || "true").toString().toLowerCase() !== "false";
3258: const BOT_TYPING_DELAY_MS = Math.max(0, Math.min(2500, Number(process.env.BOT_TYPING_DELAY_MS || 1400)));
3259: 
3260: function sleep(ms = 0) {
3261:   const delay = Number(ms || 0);
3262:   if (!delay || delay <= 0) return Promise.resolve();
3263:   return new Promise((resolve) => setTimeout(resolve, delay));
3264: }
3265: 
3266: async function sendWhatsAppTypingIndicator(to, incomingMessageId = "", phoneNumberId = DUBAI_PHONE_NUMBER_ID) {
3267:   const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || DUBAI_PHONE_NUMBER_ID);
3268:   const cleanMessageId = (incomingMessageId || "").toString().trim();
3269: 
3270:   if (!BOT_TYPING_INDICATOR_ENABLED || !ACCESS_TOKEN || !finalPhoneNumberId || !cleanMessageId) {
3271:     return { ok: false, skipped: true };
3272:   }
3273: 
3274:   const url = `https://graph.facebook.com/v18.0/${finalPhoneNumberId}/messages`;
3275:   const payload = {
3276:     messaging_product: "whatsapp",
3277:     status: "read",
3278:     message_id: cleanMessageId,
3279:     typing_indicator: { type: "text" }
3280:   };
3281: 
3282:   try {
3283:     const response = await fetch(url, {
3284:       method: "POST",
3285:       headers: {
3286:         Authorization: `Bearer ${ACCESS_TOKEN}`,
3287:         "Content-Type": "application/json"
3288:       },
3289:       body: JSON.stringify(payload)
3290:     });
3291: 
3292:     const result = await response.json().catch(() => ({}));
3293: 
3294:     if (!response.ok) {
3295:       console.log("WhatsApp typing indicator failed:");
3296:       console.log(JSON.stringify(result, null, 2));
3297:       return { ok: false, status: response.status, result };
```

## Source lines 3503-3593
```javascript
3503: 
3504:     const now = getDubaiNowPseudoDate();
3505:     const ageMs = now.getTime() - latestCustomer.date.getTime();
3506:     const windowMs = 24 * 60 * 60 * 1000;
3507: 
3508:     if (ageMs > windowMs) {
3509:       return {
3510:         ok: false,
3511:         sendResult: buildStaffSendBlockedResult("outside_24h", {
3512:           optedOut,
3513:           lastCustomerTime: latestCustomer.message.time || ""
3514:         })
3515:       };
3516:     }
3517: 
3518:     return {
3519:       ok: true,
3520:       optedOut,
3521:       lastCustomerTime: latestCustomer.message.time || ""
3522:     };
3523:   } catch (error) {
3524:     console.error("Staff free-text guard failed:");
3525:     console.error(error);
3526:     return { ok: true, warning: "guard_failed" };
3527:   }
3528: }
3529: 
3530: async function blockStaffSendIfNeeded({ to, phoneNumberId, originalBody = "" }) {
3531:   const guard = await getStaffFreeTextSendGuard(to, phoneNumberId);
3532: 
3533:   if (guard.ok) {
3534:     return { ok: true };
3535:   }
3536: 
3537:   const sendResult = guard.sendResult || buildStaffSendBlockedResult("blocked");
3538:   addInboxMessage(to, "staff", buildStaffSendFailureLogBody(originalBody, sendResult), "Failed / Not delivered", phoneNumberId, {
3539:     messageType: "Failed / Not delivered",
3540:     statusOverride: "Failed / Not delivered"
3541:   });
3542: 
3543:   return {
3544:     ok: false,
3545:     statusCode: 409,
3546:     response: {
3547:       ok: false,
3548:       status: "Failed / Not delivered",
3549:       error: getStaffSendFailureResponseMessage(sendResult),
3550:       result: sendResult
3551:     }
3552:   };
3553: }
3554: 
3555: 
3556: function parseImageDataUrl(imageDataUrl) {
3557:   const value = (imageDataUrl || "").toString().trim();
3558:   const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
3559: 
3560:   if (!match) {
3561:     return null;
3562:   }
3563: 
3564:   const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
3565:   const buffer = Buffer.from(match[2], "base64");
3566: 
3567:   return { mimeType, buffer };
3568: }
3569: 
3570: // V31.5.8.60.3.4 - Voice button fix:
3571: // Supports staff-sent WhatsApp audio from Team Inbox while keeping the raw file input hidden.
3572: function parseAudioDataUrl(audioDataUrl) {
3573:   const value = (audioDataUrl || "").toString().trim();
3574:   const match = value.match(/^data:(audio\/(?:aac|mp4|mpeg|amr|ogg|x-m4a|m4a));base64,([A-Za-z0-9+/=]+)$/);
3575: 
3576:   if (!match) {
3577:     return null;
3578:   }
3579: 
3580:   const originalMimeType = match[1].toLowerCase();
3581:   const mimeType = (originalMimeType === "audio/x-m4a" || originalMimeType === "audio/m4a")
3582:     ? "audio/mp4"
3583:     : originalMimeType;
3584:   const buffer = Buffer.from(match[2], "base64");
3585: 
3586:   return { mimeType, buffer };
3587: }
3588: 
3589: function sanitizeMediaFilename(filename, mimeType) {
3590:   const safeBase = (filename || "iconic-image")
3591:     .toString()
3592:     .replace(/[^a-zA-Z0-9._-]/g, "_")
3593:     .replace(/_+/g, "_")
```

## Source lines 4960-5104
```javascript
4960: }
4961: 
4962: function buildAppointmentReminderDeclinedBody(customerName = "", language = "en") {
4963:   const cleanName = cleanCustomerName(customerName);
4964: 
4965:   if (language === "ar") {
4966:     return cleanName
4967:       ? `تمام ${cleanName}، لن نرسل تذكير لهذا الموعد.`
4968:       : "تمام، لن نرسل تذكير لهذا الموعد.";
4969:   }
4970: 
4971:   return "No problem. We will not send a reminder for this appointment.";
4972: }
4973: 
4974: async function handleWhatsAppFlowBookingSubmit({
4975:   from,
4976:   message,
4977:   incomingPhoneNumberId,
4978:   lineConfig,
4979:   profileName,
4980:   displayPhoneNumber = ""
4981: }) {
4982:   if (!isWhatsAppFlowReply(message)) {
4983:     return false;
4984:   }
4985: 
4986:   const flowData = getWhatsAppFlowBookingData(message, { ...lineConfig, customerName: profileName, phone: from });
4987: 
4988:   if (!flowData) {
4989:     return false;
4990:   }
4991: 
4992:   const selectedBranch = flowData.branch || lineConfig.branch || "Dubai";
4993:   const requestMessage = buildWhatsAppFlowBookingRequestMessage(flowData);
4994: 
4995:   addInboxMessage(
4996:     from,
4997:     "customer",
4998:     requestMessage,
4999:     "Booking Request",
5000:     incomingPhoneNumberId,
5001:     {
5002:       customerName: profileName,
5003:       messageType: "WhatsApp Flow Submit"
5004:     }
5005:   );
5006: 
5007:   setConversationStatus(from, "Booking Request");
5008:   await saveConversationStateToGoogleSheetFromServer({
5009:     phone: from,
5010:     phoneNumberId: incomingPhoneNumberId,
5011:     branch: selectedBranch,
5012:     status: "Booking Request",
5013:     assignee: getBranchTeamAssignee(selectedBranch),
5014:     tags: ["Booking", "WhatsApp Flow", "Need Confirmation"],
5015:     updatedBy: "WhatsApp Flow"
5016:   });
5017: 
5018:   await saveBookingRequestToGoogleSheetFromServer({
5019:     phone: from,
5020:     phoneNumberId: incomingPhoneNumberId,
5021:     customerName: flowData.customerName || profileName,
5022:     branch: selectedBranch,
5023:     message: requestMessage,
5024:     requestType: flowData.serviceInterest || "WhatsApp Flow",
5025:     bookingStatus: "Pending"
5026:   });
5027: 
5028:   console.log("[Staff Booking Notify] preparing", {
5029:     branch: selectedBranch,
5030:     phoneNumberId: incomingPhoneNumberId,
5031:     displayPhoneNumber,
5032:     customerPhone: from,
5033:     customerName: flowData.customerName || profileName || ""
5034:   });
5035: 
5036:   notifyStaffAboutFlowBooking(flowData, from, incomingPhoneNumberId, displayPhoneNumber || "").catch((error) => {
5037:     console.log("Staff booking notification failed:");
5038:     console.log(error);
5039:   });
5040: 
5041:   const flowReplyLanguage = getConversationLanguage(from);
5042:   const confirmationBody = buildWhatsAppFlowConfirmationBody(flowData, flowReplyLanguage);
5043: 
5044:   // V31.5.8.60.3.3:
5045:   // Flow submit is only a booking request. Do not ask for or activate a 1-hour
5046:   // appointment reminder here because the appointment is still Pending.
5047:   // The appointment reminder question is sent only after the team confirms the booking.
5048:   await sendWhatsAppMessage(from, confirmationBody, incomingPhoneNumberId);
5049:   addInboxMessage(
5050:     from,
5051:     "bot",
5052:     confirmationBody,
5053:     "Booking Request",
5054:     incomingPhoneNumberId,
5055:     {
5056:       customerName: profileName,
5057:       messageType: "WhatsApp Flow Confirmation - Pending"
5058:     }
5059:   );
5060: 
5061:   return true;
5062: }
5063: 
5064: /* V31.5.8.31 - Legendary WhatsApp Fast Booking Buttons
5065:    Safe independent flow: creates a Booking Request only.
5066:    Does not connect to Flyksoft and does not touch reminder/cron logic. */
5067: const fastBookingDrafts = {};
5068: 
5069: const smartBookingDrafts = {};
5070: 
5071: function normalizeSmartBookingSearchText(value = "") {
5072:   return compactText(value)
5073:     .normalize("NFD")
5074:     .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
5075:     .replace(/[\u0300-\u036f]/g, "")
5076:     .replace(/[أإآٱ]/g, "ا")
5077:     .replace(/ى/g, "ي")
5078:     .replace(/ة/g, "ه")
5079:     .replace(/ؤ/g, "و")
5080:     .replace(/ئ/g, "ي")
5081:     .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
5082:     .replace(/\s+/g, " ")
5083:     .trim();
5084: }
5085: 
5086: function getSmartBookingStaffCatalog() {
5087:   return [
5088:     { name: "Osama", branch: "Abu Dhabi", keys: ["osama", "اسامة", "أسامة"] },
5089:     { name: "Adham", branch: "Abu Dhabi", keys: ["adham", "ادهم", "أدهم"] },
5090:     { name: "Ahmed", branch: "Dubai", keys: ["ahmed", "ahmad", "mr ahmed", "أحمد", "احمد"] },
5091:     { name: "Tamer", branch: "Dubai", keys: ["tamer", "tamir", "تامر"] },
5092:     { name: "Wael", branch: "Dubai", keys: ["wael", "wa'il", "وائل"] },
5093:     { name: "Bashir", branch: "Dubai", keys: ["bashir", "basheer", "بشير"] },
5094:     { name: "Omar", branch: "Dubai", keys: ["omar", "omer", "عمر"] },
5095:     { name: "Emad", branch: "Dubai", keys: ["emad", "imad", "عماد", "اماد"] },
5096:     { name: "Ani", branch: "Dubai", keys: ["ani", "annie", "اني", "آني"] },
5097:     { name: "Hamouda", branch: "Dubai", keys: ["hamouda", "hamoda", "حمودة", "حموده"] },
5098:     { name: "Hudhaifa", branch: "Dubai", keys: ["hudhaifa", "huthaifa", "huzayfa", "حذيفة", "حذيفه"] }
5099:   ];
5100: }
5101: 
5102: function detectSmartBookingStaff(text = "") {
5103:   const value = normalizeSmartBookingSearchText(text);
5104:   if (!value) return null;
```

## Source lines 5835-5983
```javascript
5835: 
5836: function detectSmartBookingServiceType(text = "") {
5837:   const value = normalizeSmartBookingSearchText(text);
5838:   if (!value) return "";
5839: 
5840:   if (value.includes("hair fixing") || value.includes("fixing") || value.includes("fitting") || value.includes("new system") || value.includes("service") || value.includes("adjustment") || value.includes("تركيب") || value.includes("تعديل") || value.includes("سيرفس") || value.includes("متابعة")) {
5841:     return "Hair fixing / fitting";
5842:   }
5843: 
5844:   return "";
5845: }
5846: 
5847: async function handleRealCustomerIntentUpgrade({ from, message, originalText, text, incomingPhoneNumberId, lineConfig, profileName, replyLanguage = "en" }) {
5848:   const input = originalText || text || "";
5849:   if (!input) return false;
5850: 
5851:   const logRealCustomerIntent = (status = "Customer Message", messageType = "Customer Message", fallbackAction = "") => {
5852:     logCustomerActionForInbox({
5853:       from,
5854:       message,
5855:       profileName,
5856:       rawText: input,
5857:       fallbackAction: fallbackAction || input,
5858:       status,
5859:       phoneNumberId: incomingPhoneNumberId,
5860:       messageType
5861:     });
5862:   };
5863: 
5864:   if (isSharjahBranchIntentText(input)) {
5865:     logRealCustomerIntent("Location Requested", "Customer Sharjah Branch Request");
5866:     setConversationStatus(from, "Location Requested");
5867:     const body = buildSharjahBranchIntentBody(profileName, replyLanguage);
5868:     const buttons = getBranchChoiceButtons(replyLanguage);
5869:     await sendWhatsAppButtonMessage(from, body, buttons, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
5870:     addInboxMessage(from, "bot", formatButtonLog(body, buttons), "Location Requested", incomingPhoneNumberId, { customerName: profileName, messageType: "Real Customer Intent - Sharjah Branch" });
5871:     return true;
5872:   }
5873: 
5874:   if (isSmartBookingEarlierTimeText(input)) {
5875:     logRealCustomerIntent("Need Follow-up", "Customer Earlier Time Request");
5876:     setConversationStatus(from, "Need Follow-up");
5877:     const body = buildEarlierTimeBody(profileName, replyLanguage);
5878:     await sendWhatsAppMessage(from, body, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
5879:     addInboxMessage(from, "bot", body, "Need Follow-up", incomingPhoneNumberId, { customerName: profileName, messageType: "Real Customer Intent - Earlier Time" });
5880:     return true;
5881:   }
5882: 
5883:   if (isSpecialistExclusionText(input)) {
5884:     logRealCustomerIntent("Smart Booking - Specialist Preference", "Customer Specialist Exclusion Request");
5885:     setConversationStatus(from, "Smart Booking - Specialist Preference");
5886:     const body = buildSpecialistExclusionBody(input, profileName, replyLanguage);
5887:     const buttons = getSmartBookingStaffPreferenceButtons(replyLanguage);
5888:     await sendWhatsAppButtonMessage(from, body, buttons, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
5889:     addInboxMessage(from, "bot", formatButtonLog(body, buttons), "Smart Booking - Specialist Preference", incomingPhoneNumberId, { customerName: profileName, messageType: "Real Customer Intent - Specialist Exclusion" });
5890:     return true;
5891:   }
5892: 
5893:   if (isSmartBookingUrgentText(input) && !isSmartBookingNaturalRequest(input)) {
5894:     logRealCustomerIntent("Need Follow-up", "Customer Urgent Request");
5895:     setConversationStatus(from, "Need Follow-up");
5896:     const body = buildUrgentIntentBody(profileName, replyLanguage);
5897:     const buttons = getSmartBookingStaffPreferenceButtons(replyLanguage);
5898:     await sendWhatsAppButtonMessage(from, body, buttons, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
5899:     addInboxMessage(from, "bot", formatButtonLog(body, buttons), "Need Follow-up", incomingPhoneNumberId, { customerName: profileName, messageType: "Real Customer Intent - Urgent" });
5900:     return true;
5901:   }
5902: 
5903:   if (isSmartBookingAvailabilityQuestionText(input)) {
5904:     logRealCustomerIntent("Availability Question", "Customer Availability Question");
5905:     const staff = detectSmartBookingStaff(input);
5906:     const explicitWeekday = detectSmartBookingExplicitWeekday(input);
5907:     const naturalDay = detectSmartBookingDay(input);
5908:     const inputTime = getSmartBookingTimeFromText(input);
5909:     const draft = {
5910:       branch: staff?.branch || lineConfig.branch || "Dubai",
5911:       preferredDay: explicitWeekday || naturalDay || "",
5912:       preferredTime: inputTime.ok ? inputTime.time : "",
5913:       teamMember: staff?.name || "",
5914:       serviceType: detectSmartBookingServiceType(input),
5915:       rawRequest: input,
5916:       startedAt: getDubaiTimestamp(),
5917:       phoneNumberId: incomingPhoneNumberId,
5918:       waitingForBookingConfirm: true,
5919:       waitingForTime: false,
5920:       waitingForWeekday: false,
5921:       waitingForStaff: false
5922:     };
5923:     smartBookingDrafts[from] = draft;
5924:     setConversationStatus(from, "Availability Question");
5925:     const body = buildSmartAvailabilityConfirmBody(draft, profileName, replyLanguage);
5926:     const buttons = getAvailabilityConfirmButtons(replyLanguage);
5927:     await sendWhatsAppButtonMessage(from, body, buttons, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
5928:     addInboxMessage(from, "bot", formatButtonLog(body, buttons), "Availability Question", incomingPhoneNumberId, { customerName: profileName, messageType: "Real Customer Intent - Availability" });
5929:     return true;
5930:   }
5931: 
5932:   return false;
5933: }
5934: 
5935: 
5936: function getStaffActionNumbersForBranch(branch = "Dubai") {
5937:   const isAbuDhabi = compactText(branch).includes("abu");
5938:   const envName = isAbuDhabi ? "ABU_DHABI_STAFF_NUMBER" : "DUBAI_STAFF_NUMBER";
5939:   const fallback = isAbuDhabi ? DEFAULT_ABU_DHABI_STAFF_NUMBER : DEFAULT_DUBAI_STAFF_NUMBER;
5940:   const raw = (process.env[envName] || fallback || "").toString();
5941:   return raw
5942:     .split(",")
5943:     .map((item) => normalizeWhatsAppRecipientDigits(item))
5944:     .filter(Boolean);
5945: }
5946: 
5947: function getStaffActionRouteFromNumber(staffPhone = "", incomingPhoneNumberId = DUBAI_PHONE_NUMBER_ID) {
5948:   const cleanStaffPhone = normalizeWhatsAppRecipientDigits(staffPhone);
5949:   const dubaiNumbers = getStaffActionNumbersForBranch("Dubai");
5950:   const abuDhabiNumbers = getStaffActionNumbersForBranch("Abu Dhabi");
5951: 
5952:   if (abuDhabiNumbers.includes(cleanStaffPhone)) {
5953:     return {
5954:       isStaff: true,
5955:       staffNumber: cleanStaffPhone,
5956:       branch: "Abu Dhabi",
5957:       phoneNumberId: ABU_DHABI_PHONE_NUMBER_ID,
5958:       envName: "ABU_DHABI_STAFF_NUMBER"
5959:     };
5960:   }
5961: 
5962:   if (dubaiNumbers.includes(cleanStaffPhone)) {
5963:     return {
5964:       isStaff: true,
5965:       staffNumber: cleanStaffPhone,
5966:       branch: "Dubai",
5967:       phoneNumberId: DUBAI_PHONE_NUMBER_ID,
5968:       envName: "DUBAI_STAFF_NUMBER"
5969:     };
5970:   }
5971: 
5972:   return {
5973:     isStaff: false,
5974:     staffNumber: cleanStaffPhone,
5975:     branch: getLineConfig(incomingPhoneNumberId).branch,
5976:     phoneNumberId: incomingPhoneNumberId,
5977:     envName: "NONE"
5978:   };
5979: }
5980: 
5981: function getStaffBookingActionFromText(text = "") {
5982:   const value = compactText(text);
5983:   if (!value) return "";
```

## Source lines 6576-6807
```javascript
6576:   if (!booking) return false;
6577: 
6578:   const rememberedContext = getRememberedCustomerSuggestedTimeAction(from);
6579:   const suggestedTime = getSuggestedTimeFromBooking(booking, rememberedContext);
6580:   const action = isDecline ? "declined" : "accepted_confirmed";
6581:   const status = isDecline ? "Customer Rejected Suggested Time" : "Confirmed Appointment";
6582:   const notePrefix = isDecline ? "Customer rejected suggested time" : "Customer accepted suggested time and booking auto-confirmed";
6583:   const updateNotes = [
6584:     suggestedTime ? `Suggested time: ${suggestedTime}` : "",
6585:     `${notePrefix}: ${input}`
6586:   ].filter(Boolean).join("\n");
6587: 
6588:   logCustomerActionForInbox({
6589:     from,
6590:     message,
6591:     profileName,
6592:     rawText: input,
6593:     fallbackAction: input,
6594:     status: isDecline ? "Customer Rejected Suggested Time" : "Customer Accepted Suggested Time",
6595:     phoneNumberId: incomingPhoneNumberId,
6596:     messageType: isDecline ? "Customer Suggested Time Rejected" : "Customer Suggested Time Accepted"
6597:   });
6598: 
6599:   if (isDecline) {
6600:     if (booking.rowNumber) {
6601:       await updateBookingRequestStatusInGoogleSheetFromServer({
6602:         rowNumber: booking.rowNumber,
6603:         phone: from,
6604:         phoneNumberId: incomingPhoneNumberId,
6605:         status: "Customer Rejected Suggested Time",
6606:         notes: updateNotes
6607:       });
6608:     }
6609: 
6610:     setConversationStatus(from, "Customer Rejected Suggested Time");
6611:     await saveConversationStateToGoogleSheetFromServer({
6612:       phone: from,
6613:       phoneNumberId: incomingPhoneNumberId,
6614:       branch: booking.branch || lineConfig.branch,
6615:       status: "Customer Rejected Suggested Time",
6616:       assignee: getBranchTeamAssignee(booking.branch || lineConfig.branch),
6617:       tags: ["Booking", "Suggested Time Rejected"],
6618:       updatedBy: "Customer Suggested Time Reply"
6619:     });
6620:   } else {
6621:     const confirmationNotes = buildSuggestedTimeConfirmedNotesForCustomer(booking, suggestedTime, replyLanguage) || updateNotes;
6622:     const confirmResult = await sendBookingActionUpdateToCustomer({
6623:       booking,
6624:       status: "Confirmed",
6625:       notes: confirmationNotes,
6626:       phoneNumberId: incomingPhoneNumberId,
6627:       updatedBy: "Customer Accepted Suggested Time - Auto Confirm"
6628:     });
6629: 
6630:     if (!confirmResult.ok) {
6631:       const failedLogBody = [
6632:         "Customer accepted suggested time, but confirmation send failed ⚠️",
6633:         `Branch: ${booking.branch || lineConfig.branch}`,
6634:         `Suggested time: ${suggestedTime || ""}`,
6635:         `Reason: ${confirmResult.error || "Unknown error"}`
6636:       ].filter(Boolean).join("\n");
6637:       addInboxMessage(from, "bot", failedLogBody, "Customer Confirmation Failed", incomingPhoneNumberId, {
6638:         customerName: profileName,
6639:         messageType: "Suggested Time Accepted - Confirmation Failed"
6640:       });
6641: 
6642:       await notifyStaffAboutSuggestedTimeCustomerReply({
6643:         booking,
6644:         customerPhone: from,
6645:         profileName,
6646:         suggestedTime,
6647:         customerReply: `${input} / confirmation failed: ${confirmResult.error || "Unknown error"}`,
6648:         phoneNumberId: incomingPhoneNumberId,
6649:         rememberedContext,
6650:         action: "accepted"
6651:       });
6652: 
6653:       const cleanPhone = normalizePhoneDigits(from);
6654:       if (cleanPhone) pendingCustomerSuggestedTimeActionsByPhone.delete(cleanPhone);
6655:       return true;
6656:     }
6657: 
6658:     setConversationStatus(from, "Confirmed Appointment");
6659:     await saveConversationStateToGoogleSheetFromServer({
6660:       phone: from,
6661:       phoneNumberId: incomingPhoneNumberId,
6662:       branch: booking.branch || lineConfig.branch,
6663:       status: "Confirmed Appointment",
6664:       assignee: getBranchTeamAssignee(booking.branch || lineConfig.branch),
6665:       tags: ["Booking", "Confirmed", "Suggested Time Accepted"],
6666:       updatedBy: "Customer Accepted Suggested Time - Auto Confirm"
6667:     });
6668:   }
6669: 
6670:   const staffNotifyResult = await notifyStaffAboutSuggestedTimeCustomerReply({
6671:     booking,
6672:     customerPhone: from,
6673:     profileName,
6674:     suggestedTime,
6675:     customerReply: input,
6676:     phoneNumberId: incomingPhoneNumberId,
6677:     rememberedContext,
6678:     action
6679:   });
6680: 
6681:   const staffLogBody = [
6682:     isDecline ? "Suggested time rejection staff notify sent" : "Suggested time accepted and booking auto-confirm staff notify sent",
6683:     staffNotifyResult?.ok ? "✅" : "⚠️",
6684:     `Branch: ${booking.branch || lineConfig.branch}`,
6685:     `Suggested time: ${suggestedTime || ""}`,
6686:     staffNotifyResult?.reason ? `Reason: ${staffNotifyResult.reason}` : ""
6687:   ].filter(Boolean).join("\n");
6688:   addInboxMessage(from, "bot", staffLogBody, staffNotifyResult?.ok ? "Staff Notify Sent" : "Staff Notify Failed", incomingPhoneNumberId, {
6689:     customerName: profileName,
6690:     messageType: isDecline ? "Suggested Time Rejection Staff Notify" : "Suggested Time Accepted Auto Confirm Staff Notify"
6691:   });
6692: 
6693:   if (isDecline) {
6694:     const customerAckBody = buildSuggestedTimeCustomerDeclineBody(suggestedTime, profileName, replyLanguage);
6695:     await sendWhatsAppMessage(from, customerAckBody, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
6696:     addInboxMessage(from, "bot", customerAckBody, "Customer Rejected Suggested Time", incomingPhoneNumberId, {
6697:       customerName: profileName,
6698:       messageType: "Suggested Time Rejection Customer Ack"
6699:     });
6700:   }
6701: 
6702:   const cleanPhone = normalizePhoneDigits(from);
6703:   if (cleanPhone) pendingCustomerSuggestedTimeActionsByPhone.delete(cleanPhone);
6704: 
6705:   return true;
6706: }
6707: 
6708: async function sendBookingActionUpdateToCustomer({ booking = {}, status = "", notes = "", phoneNumberId = DUBAI_PHONE_NUMBER_ID, updatedBy = "Staff Booking Action" }) {
6709:   const customerPhone = normalizePhoneDigits(booking.phone || "");
6710:   if (!customerPhone) {
6711:     return { ok: false, error: "missing_customer_phone" };
6712:   }
6713: 
6714:   const customerLanguage = await getCustomerLanguageFromHistory(customerPhone, "en");
6715:   const messageBuild = buildBookingCustomerUpdateBody(status, notes, customerLanguage);
6716: 
6717:   if (!messageBuild.ok) {
6718:     return { ok: false, error: messageBuild.error || "message_build_failed" };
6719:   }
6720: 
6721:   const buttons = Array.isArray(messageBuild.buttons) ? messageBuild.buttons : [];
6722:   const sendResult = buttons.length
6723:     ? await sendWhatsAppButtonMessage(customerPhone, messageBuild.body, buttons, phoneNumberId, {
6724:         headerImageUrl: BOT_HEADER_IMAGE_URL,
6725:         replyLanguage: customerLanguage,
6726:         skipAutoLanguage: true
6727:       })
6728:     : await sendWhatsAppMessage(customerPhone, messageBuild.body, phoneNumberId, {
6729:         replyLanguage: customerLanguage,
6730:         skipAutoLanguage: true
6731:       });
6732: 
6733:   if (sendResult?.error) {
6734:     return {
6735:       ok: false,
6736:       error: sendResult.error?.message || "customer_update_send_failed",
6737:       result: sendResult
6738:     };
6739:   }
6740: 
6741:   if (booking.rowNumber) {
6742:     await updateBookingRequestStatusInGoogleSheetFromServer({
6743:       rowNumber: booking.rowNumber,
6744:       phone: customerPhone,
6745:       phoneNumberId,
6746:       status,
6747:       notes
6748:     });
6749:   }
6750: 
6751:   const loggedBody = buttons.length ? formatButtonLog(messageBuild.body, buttons) : messageBuild.body;
6752:   addInboxMessage(
6753:     customerPhone,
6754:     "staff",
6755:     loggedBody,
6756:     isApprovedBookingStatus(status) ? "Confirmed Appointment" : "Human Reply",
6757:     phoneNumberId,
6758:     {
6759:       customerName: booking.customerName || "",
6760:       messageType: "Staff Button Action - Customer Update"
6761:     }
6762:   );
6763: 
6764:   if (isApprovedBookingStatus(status)) {
6765:     setConversationStatus(customerPhone, "Confirmed Appointment");
6766:     await activateAppointmentReminderAfterConfirmation({
6767:       booking: { ...booking, phone: customerPhone, phoneNumberId },
6768:       phoneNumberId,
6769:       notes,
6770:       updatedBy
6771:     });
6772:   }
6773: 
6774:   return { ok: true, customerPhone, result: sendResult };
6775: }
6776: 
6777: async function handleStaffBookingAction({ from, message = null, originalText = "", incomingPhoneNumberId = DUBAI_PHONE_NUMBER_ID }) {
6778:   const route = getStaffActionRouteFromNumber(from, incomingPhoneNumberId);
6779:   if (!route.isStaff) return false;
6780: 
6781:   const text = (originalText || "").toString().trim();
6782:   const action = getStaffBookingActionFromText(text);
6783:   const pendingAction = pendingStaffBookingActionsByStaffNumber.get(route.staffNumber);
6784: 
6785:   if (pendingAction?.action === "suggest_time" && !action) {
6786:     const booking = pendingAction.booking || {};
6787:     const customerPhone = normalizePhoneDigits(booking.phone || "");
6788:     const phoneNumberId = normalizePhoneNumberId(booking.phoneNumberId || pendingAction.phoneNumberId || route.phoneNumberId);
6789:     const suggestedTime = text;
6790: 
6791:     if (!suggestedTime) {
6792:       await sendStaffActionAck(route.staffNumber, "Please type the suggested time. Example: Tomorrow 5:00 PM", route);
6793:       return true;
6794:     }
6795: 
6796:     const sendResult = await sendBookingActionUpdateToCustomer({
6797:       booking,
6798:       status: "Suggested Time",
6799:       notes: suggestedTime,
6800:       phoneNumberId,
6801:       updatedBy: "Staff Suggested Time Button"
6802:     });
6803: 
6804:     pendingStaffBookingActionsByStaffNumber.delete(route.staffNumber);
6805: 
6806:     if (!sendResult.ok) {
6807:       await sendStaffActionAck(route.staffNumber, `Suggested time failed ⚠️\n${sendResult.error || "Unknown error"}`, route);
```

## Source lines 6917-7013
```javascript
6917:       updatedBy: "Staff Flow Confirm Button - Direct Customer Confirmation"
6918:     });
6919: 
6920:     if (!sendResult.ok) {
6921:       await sendStaffActionAck(route.staffNumber, `Confirm failed ⚠️\n${sendResult.error || "Unknown error"}`, route);
6922:       return true;
6923:     }
6924: 
6925:     await sendStaffActionAck(route.staffNumber, buildStaffActionAckBody("confirm", booking), route);
6926:     return true;
6927:   }
6928: 
6929:   if (action === "team_will_call") {
6930:     const customerLanguage = await getCustomerLanguageFromHistory(customerPhone, "en");
6931:     const body = buildTeamWillCallCustomerBody(booking.customerName || "", customerLanguage);
6932:     const sendResult = await sendWhatsAppMessage(customerPhone, body, phoneNumberId, {
6933:       replyLanguage: customerLanguage,
6934:       skipAutoLanguage: true
6935:     });
6936: 
6937:     if (sendResult?.error) {
6938:       await sendStaffActionAck(route.staffNumber, `Team Will Call failed ⚠️\n${sendResult.error?.message || "Unknown error"}`, route);
6939:       return true;
6940:     }
6941: 
6942:     if (booking.rowNumber) {
6943:       await updateBookingRequestStatusInGoogleSheetFromServer({
6944:         rowNumber: booking.rowNumber,
6945:         phone: customerPhone,
6946:         phoneNumberId,
6947:         status: "Team Will Call",
6948:         notes: "Team will contact customer shortly"
6949:       });
6950:     }
6951: 
6952:     addInboxMessage(customerPhone, "staff", body, "Team Will Call", phoneNumberId, {
6953:       customerName: booking.customerName || "",
6954:       messageType: "Staff Button Action - Team Will Call"
6955:     });
6956: 
6957:     setConversationStatus(customerPhone, "Need Follow-up");
6958:     await saveConversationStateToGoogleSheetFromServer({
6959:       phone: customerPhone,
6960:       phoneNumberId,
6961:       branch: booking.branch || route.branch,
6962:       status: "Need Follow-up",
6963:       assignee: getBranchTeamAssignee(booking.branch || route.branch),
6964:       tags: ["Booking", "Team Will Call"],
6965:       updatedBy: "Staff Team Will Call Button"
6966:     });
6967: 
6968:     await sendStaffActionAck(route.staffNumber, buildStaffActionAckBody("team_will_call", booking), route);
6969:     return true;
6970:   }
6971: 
6972:   return false;
6973: }
6974: 
6975: async function notifyStaffAboutSmartBooking(draft = {}, customerPhone = "", profileName = "", preferredTime = "") {
6976:   const finalDraft = mergeSmartBookingStaffIntoDraft(draft, draft.rawRequest || "");
6977:   const isAbuDhabi = finalDraft.branch === "Abu Dhabi";
6978:   const routingPhoneNumberId = isAbuDhabi ? ABU_DHABI_PHONE_NUMBER_ID : DUBAI_PHONE_NUMBER_ID;
6979:   const envName = isAbuDhabi ? "ABU_DHABI_STAFF_NUMBER" : "DUBAI_STAFF_NUMBER";
6980:   const rawStaffNumber = isAbuDhabi
6981:     ? (process.env.ABU_DHABI_STAFF_NUMBER || ABU_DHABI_STAFF_NUMBER || DEFAULT_ABU_DHABI_STAFF_NUMBER || "")
6982:     : (process.env.DUBAI_STAFF_NUMBER || DUBAI_STAFF_NUMBER || DEFAULT_DUBAI_STAFF_NUMBER || "");
6983:   const staffNumber = normalizeWhatsAppRecipientDigits(rawStaffNumber);
6984: 
6985:   const smartRequestType = finalDraft.requestType || (finalDraft.serviceType ? "Service Appointment" : "WhatsApp Smart Natural Booking V3.9.14");
6986:   const smartSource = finalDraft.directConsultationChatBooking
6987:     ? "Source: WhatsApp Direct Consultation Chat Booking V3.9.34"
6988:     : "Source: WhatsApp Smart Natural Booking V3.9.14";
6989: 
6990:   const flowData = {
6991:     branch: finalDraft.branch || getLineConfig(routingPhoneNumberId).branch,
6992:     customerName: profileName || "",
6993:     phone: customerPhone || "",
6994:     requestType: smartRequestType,
6995:     serviceInterest: smartRequestType,
6996:     preferredDay: finalDraft.preferredDay || "",
6997:     preferredTime: preferredTime || "",
6998:     teamMember: (finalDraft.skipStaffQuestion ? "" : (finalDraft.teamMember || "")),
6999:     serviceType: finalDraft.serviceType || "",
7000:     notes: finalDraft.urgent ? `${smartSource} - Urgent request` : smartSource
7001:   };
7002: 
7003:   console.log(`[Smart Booking Direct Staff Notify] preparing branch=${flowData.branch} fromPhoneNumberId=${routingPhoneNumberId} to=${staffNumber || "MISSING"} env=${envName} raw=${rawStaffNumber || "MISSING"} teamMember=${flowData.teamMember || ""}`);
7004: 
7005:   if (!staffNumber) {
7006:     console.log(`[Smart Booking Direct Staff Notify] skipped branch=${flowData.branch} reason=missing_staff_number env=${envName}`);
7007:     return {
7008:       ok: false,
7009:       skipped: true,
7010:       reason: "missing_staff_number",
7011:       routingPhoneNumberId,
7012:       flowData,
7013:       results: []
```

## Source lines 7087-7459
```javascript
7087: 
7088:     // V31.5.8.60.3.9.32:
7089:     // Keep direct consultation chat booking branch locked to the WhatsApp line.
7090:     // This makes Abu Dhabi run the same chat-booking cycle as Dubai, but routed to Abu Dhabi.
7091:     if (existingDraft.directConsultationChatBooking || existingDraft.skipStaffQuestion) {
7092:       existingDraft.branch = lineConfig.branch || existingDraft.branch || "Dubai";
7093:       existingDraft.phoneNumberId = incomingPhoneNumberId;
7094:       existingDraft.teamMember = "";
7095:       existingDraft.requestType = "Consultation Booking";
7096:       existingDraft.directConsultationChatBooking = true;
7097:       existingDraft.skipStaffQuestion = true;
7098:     }
7099: 
7100:     smartBookingDrafts[from] = existingDraft;
7101:   }
7102: 
7103:   // A plain staff name such as "Ahmed" / "احمد" should only answer an active
7104:   // specialist question. It must not start a brand-new booking after the previous
7105:   // booking was already submitted, because that creates the extra "choose day" loop.
7106:   if (!existingDraft && isSmartBookingStandaloneStaffOnly(input)) {
7107:     console.log(`[Smart Booking Router] ignored standalone staff name without active draft: ${JSON.stringify(input)}`);
7108:     return false;
7109:   }
7110: 
7111:   if (!existingDraft && !forceConsultationChatBooking && !isSmartBookingNaturalRequest(input)) return false;
7112: 
7113:   const askForDay = async (draft) => {
7114:     draft.waitingForWeekday = false;
7115:     draft.waitingForTime = false;
7116:     draft.waitingForStaff = false;
7117:     smartBookingDrafts[from] = draft;
7118:     setConversationStatus(from, "Smart Booking - Choose Day");
7119:     const askDayBody = buildSmartBookingAskDayBody(draft, profileName, replyLanguage);
7120:     const dayButtons = getSmartBookingWeekdayButtons(replyLanguage);
7121:     await sendWhatsAppButtonMessage(from, askDayBody, dayButtons, incomingPhoneNumberId, { replyLanguage });
7122:     addInboxMessage(from, "bot", formatButtonLog(askDayBody, dayButtons), "Smart Booking - Choose Day", incomingPhoneNumberId, { customerName: profileName, messageType: "Smart Booking Ask Day" });
7123:     return true;
7124:   };
7125: 
7126:   const askForWeekday = async (draft) => {
7127:     draft.waitingForWeekday = true;
7128:     draft.waitingForTime = false;
7129:     draft.waitingForStaff = false;
7130:     smartBookingDrafts[from] = draft;
7131:     setConversationStatus(from, "Smart Booking - Choose Weekday");
7132:     const weekdayBody = buildSmartBookingAskWeekdayBody(draft, profileName, replyLanguage);
7133:     await sendWhatsAppMessage(from, weekdayBody, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
7134:     addInboxMessage(from, "bot", weekdayBody, "Smart Booking - Choose Weekday", incomingPhoneNumberId, { customerName: profileName, messageType: "Smart Booking Ask Weekday" });
7135:     return true;
7136:   };
7137: 
7138:   const askForTime = async (draft) => {
7139:     draft.waitingForWeekday = false;
7140:     draft.waitingForStaff = false;
7141:     draft.waitingForTime = true;
7142:     smartBookingDrafts[from] = draft;
7143:     setConversationStatus(from, "Smart Booking - Choose Time");
7144:     const askTimeBody = buildSmartBookingAskTimeBody(draft, profileName, replyLanguage);
7145:     await sendWhatsAppMessage(from, askTimeBody, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
7146:     addInboxMessage(from, "bot", askTimeBody, "Smart Booking - Choose Time", incomingPhoneNumberId, { customerName: profileName, messageType: "Smart Booking Ask Time" });
7147:     return true;
7148:   };
7149: 
7150:   const askForStaff = async (draft) => {
7151:     draft.waitingForWeekday = false;
7152:     draft.waitingForTime = false;
7153:     draft.waitingForStaff = true;
7154:     smartBookingDrafts[from] = draft;
7155:     setConversationStatus(from, "Smart Booking - Choose Specialist");
7156:     const staffBody = buildSmartBookingAskStaffBody(draft, profileName, draft.preferredTime || "", replyLanguage);
7157:     const staffButtons = getSmartBookingStaffPreferenceButtons(replyLanguage);
7158:     await sendWhatsAppButtonMessage(from, staffBody, staffButtons, incomingPhoneNumberId, { replyLanguage });
7159:     addInboxMessage(from, "bot", formatButtonLog(staffBody, staffButtons), "Smart Booking - Choose Specialist", incomingPhoneNumberId, { customerName: profileName, messageType: "Smart Booking Ask Specialist" });
7160:     return true;
7161:   };
7162: 
7163:   const submitSmartBooking = async (draft, selectedTime, originalSelection = "") => {
7164:     const finalDraft = mergeSmartBookingStaffIntoDraft(draft, `${draft.rawRequest || ""} ${originalSelection || ""}`.trim());
7165:     const selectedBranch = finalDraft.branch || lineConfig.branch || "Dubai";
7166:     finalDraft.branch = selectedBranch;
7167:     finalDraft.preferredTime = selectedTime;
7168: 
7169:     const requestMessage = buildSmartBookingRequestMessage(finalDraft, selectedTime, finalDraft.rawRequest || originalSelection || input);
7170:     setConversationStatus(from, "Booking Request");
7171:     await saveConversationStateToGoogleSheetFromServer({
7172:       phone: from,
7173:       phoneNumberId: incomingPhoneNumberId,
7174:       branch: selectedBranch,
7175:       status: "Booking Request",
7176:       assignee: getBranchTeamAssignee(selectedBranch),
7177:       tags: ["Booking", finalDraft.requestType || "Smart Natural Booking V3.14", "Need Confirmation"],
7178:       updatedBy: finalDraft.directConsultationChatBooking ? "WhatsApp Direct Consultation Chat Booking V3.9.34" : "WhatsApp Smart Natural Booking V3.14"
7179:     });
7180:     await saveBookingRequestToGoogleSheetFromServer({
7181:       phone: from,
7182:       phoneNumberId: incomingPhoneNumberId,
7183:       customerName: profileName,
7184:       branch: selectedBranch,
7185:       message: requestMessage,
7186:       requestType: finalDraft.requestType || "WhatsApp Smart Natural Booking V3.14",
7187:       bookingStatus: "Pending"
7188:     });
7189:     addInboxMessage(from, "customer", requestMessage, "Booking Request", incomingPhoneNumberId, { customerName: profileName, messageType: "WhatsApp Smart Natural Booking Submit" });
7190: 
7191:     let staffNotifyResult = null;
7192:     try {
7193:       staffNotifyResult = await notifyStaffAboutSmartBooking(finalDraft, from, profileName, selectedTime);
7194:     } catch (error) {
7195:       staffNotifyResult = { ok: false, error: error?.message || String(error), routingPhoneNumberId: finalDraft.branch === "Abu Dhabi" ? ABU_DHABI_PHONE_NUMBER_ID : DUBAI_PHONE_NUMBER_ID };
7196:       console.log("Smart booking staff notification failed:");
7197:       console.log(error);
7198:     }
7199: 
7200:     const staffNotifyLogBody = buildSmartBookingStaffNotifyLogBody(staffNotifyResult, finalDraft, staffNotifyResult?.routingPhoneNumberId || "");
7201:     addInboxMessage(
7202:       from,
7203:       "bot",
7204:       staffNotifyLogBody,
7205:       staffNotifyResult?.ok ? "Staff Notify Sent" : "Staff Notify Failed",
7206:       incomingPhoneNumberId,
7207:       {
7208:         customerName: profileName,
7209:         messageType: staffNotifyResult?.ok ? "Smart Booking Staff Notify Sent" : "Smart Booking Staff Notify Failed"
7210:       }
7211:     );
7212: 
7213:     delete smartBookingDrafts[from];
7214:     const confirmationBody = buildSmartBookingConfirmationBody(finalDraft, selectedTime, replyLanguage);
7215:     await sendWhatsAppMessage(from, confirmationBody, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
7216:     addInboxMessage(from, "bot", confirmationBody, "Booking Request", incomingPhoneNumberId, { customerName: profileName, messageType: "Smart Booking Confirmation" });
7217:     return true;
7218:   };
7219: 
7220: 
7221:   if (existingDraft && existingDraft.waitingForBookingConfirm) {
7222:     logSmartCustomerReply("Availability Reply", "Customer Availability Reply");
7223:     existingDraft = mergeSmartBookingStaffIntoDraft(existingDraft, input || existingDraft.rawRequest || "");
7224: 
7225:     if (isSmartBookingNegativeConfirmationText(input)) {
7226:       delete smartBookingDrafts[from];
7227:       setConversationStatus(from, "Availability - Booking Declined");
7228:       const noBookingBody = buildSmartBookingNoBookingBody(profileName, replyLanguage);
7229:       await sendWhatsAppMessage(from, noBookingBody, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
7230:       addInboxMessage(from, "bot", noBookingBody, "Availability - Booking Declined", incomingPhoneNumberId, { customerName: profileName, messageType: "Availability Booking Declined Reply" });
7231:       return true;
7232:     }
7233: 
7234:     if (isSmartBookingAskTeamText(input)) {
7235:       delete smartBookingDrafts[from];
7236:       setConversationStatus(from, "Talk to Team");
7237:       const teamBody = buildTeamHandoffBody(profileName);
7238:       const localizedTeamBody = cleanLocalizedReplyBody(teamBody, replyLanguage);
7239:       await sendWhatsAppMessage(from, localizedTeamBody, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
7240:       addInboxMessage(from, "bot", localizedTeamBody, "Talk to Team", incomingPhoneNumberId, { customerName: profileName, messageType: "Availability Ask Team Handoff" });
7241:       return true;
7242:     }
7243: 
7244:     if (isSmartBookingChangeTimeText(input)) {
7245:       return askForTime(existingDraft);
7246:     }
7247: 
7248:     if (!isSmartBookingBookNowText(input)) {
7249:       const body = buildSmartAvailabilityConfirmBody(existingDraft, profileName, replyLanguage);
7250:       const buttons = getAvailabilityConfirmButtons(replyLanguage);
7251:       await sendWhatsAppButtonMessage(from, body, buttons, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
7252:       addInboxMessage(from, "bot", formatButtonLog(body, buttons), "Availability Question", incomingPhoneNumberId, { customerName: profileName, messageType: "Availability Confirm Retry" });
7253:       return true;
7254:     }
7255: 
7256:     existingDraft.waitingForBookingConfirm = false;
7257:     smartBookingDrafts[from] = existingDraft;
7258: 
7259:     if (!existingDraft.preferredDay) {
7260:       return askForDay(existingDraft);
7261:     }
7262: 
7263:     if (existingDraft.preferredDay === "This Week") {
7264:       return askForWeekday(existingDraft);
7265:     }
7266: 
7267:     if (!existingDraft.teamMember && !existingDraft.skipStaffQuestion) {
7268:       return askForStaff(existingDraft);
7269:     }
7270: 
7271:     if (existingDraft.preferredTime) {
7272:       return submitSmartBooking(existingDraft, existingDraft.preferredTime, input);
7273:     }
7274: 
7275:     return askForTime(existingDraft);
7276:   }
7277: 
7278:   if (existingDraft && detectedDay) {
7279:     logSmartCustomerReply("Smart Booking - Day Reply", "Customer Smart Booking Day Reply");
7280:     existingDraft = mergeSmartBookingStaffIntoDraft(existingDraft, input || existingDraft.rawRequest || "");
7281:     existingDraft.preferredDay = detectedDay;
7282:     existingDraft.rawRequest = existingDraft.rawRequest || input;
7283:     if (inputTime.ok) existingDraft.preferredTime = inputTime.time;
7284: 
7285:     if (existingDraft.preferredDay === "This Week") {
7286:       return askForWeekday(existingDraft);
7287:     }
7288: 
7289:     if (!existingDraft.teamMember && !existingDraft.skipStaffQuestion) {
7290:       return askForStaff(existingDraft);
7291:     }
7292: 
7293:     if (existingDraft.preferredTime) {
7294:       return submitSmartBooking(existingDraft, existingDraft.preferredTime, input);
7295:     }
7296: 
7297:     return askForTime(existingDraft);
7298:   }
7299: 
7300:   if (existingDraft && existingDraft.waitingForWeekday) {
7301:     logSmartCustomerReply("Smart Booking - Weekday Reply", "Customer Smart Booking Weekday Reply");
7302:     existingDraft = mergeSmartBookingStaffIntoDraft(existingDraft, input || existingDraft.rawRequest || "");
7303:     const weekday = detectedDay;
7304:     if (!weekday) {
7305:       const retryDay = replyLanguage === "ar"
7306:         ? "اكتب اليوم المناسب مثل: الاثنين أو الثلاثاء."
7307:         : "Please type the suitable day, like Monday or Tuesday.";
7308:       await sendWhatsAppMessage(from, retryDay, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
7309:       addInboxMessage(from, "bot", retryDay, "Smart Booking - Choose Weekday", incomingPhoneNumberId, { customerName: profileName, messageType: "Smart Booking Retry Weekday" });
7310:       return true;
7311:     }
7312: 
7313:     existingDraft.preferredDay = weekday;
7314:     if (inputTime.ok) existingDraft.preferredTime = inputTime.time;
7315: 
7316:     if (!existingDraft.teamMember && !existingDraft.skipStaffQuestion) {
7317:       return askForStaff(existingDraft);
7318:     }
7319: 
7320:     if (existingDraft.preferredTime) {
7321:       return submitSmartBooking(existingDraft, existingDraft.preferredTime, input);
7322:     }
7323: 
7324:     return askForTime(existingDraft);
7325:   }
7326: 
7327:   if (existingDraft && existingDraft.waitingForStaff) {
7328:     logSmartCustomerReply("Smart Booking - Specialist Reply", "Customer Smart Booking Specialist Reply");
7329:     const detectedStaff = detectSmartBookingStaff(input || "");
7330:     const noPreference = isSmartBookingAnySpecialistText(input || "");
7331: 
7332:     if (!detectedStaff && !noPreference) {
7333:       const retryStaff = buildSmartBookingAskStaffBody(existingDraft, profileName, existingDraft.preferredTime || "", replyLanguage);
7334:       const retryButtons = getSmartBookingStaffPreferenceButtons(replyLanguage);
7335:       await sendWhatsAppButtonMessage(from, retryStaff, retryButtons, incomingPhoneNumberId, { replyLanguage });
7336:       addInboxMessage(from, "bot", formatButtonLog(retryStaff, retryButtons), "Smart Booking - Choose Specialist", incomingPhoneNumberId, { customerName: profileName, messageType: "Smart Booking Retry Specialist" });
7337:       return true;
7338:     }
7339: 
7340:     if (detectedStaff) {
7341:       existingDraft.branch = detectedStaff.branch || existingDraft.branch || lineConfig.branch || "Dubai";
7342:       existingDraft.teamMember = detectedStaff.name || "";
7343:     } else {
7344:       existingDraft.teamMember = "Any Available";
7345:       existingDraft.branch = existingDraft.branch || lineConfig.branch || "Dubai";
7346:     }
7347: 
7348:     existingDraft.waitingForStaff = false;
7349:     if (inputTime.ok) existingDraft.preferredTime = inputTime.time;
7350:     smartBookingDrafts[from] = existingDraft;
7351: 
7352:     if (existingDraft.preferredTime) {
7353:       return submitSmartBooking(existingDraft, existingDraft.preferredTime, input);
7354:     }
7355: 
7356:     return askForTime(existingDraft);
7357:   }
7358: 
7359:   if (existingDraft && existingDraft.waitingForTime) {
7360:     logSmartCustomerReply("Smart Booking - Time Reply", "Customer Smart Booking Time Reply");
7361:     existingDraft = mergeSmartBookingStaffIntoDraft(existingDraft, input || existingDraft.rawRequest || "");
7362:     smartBookingDrafts[from] = existingDraft;
7363:     const parsedTime = getSmartBookingTimeFromText(input);
7364:     if (!parsedTime.ok) {
7365:       const invalidBody = buildSmartBookingInvalidTimeBody(parsedTime.reason, replyLanguage);
7366:       await sendWhatsAppMessage(from, invalidBody, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
7367:       addInboxMessage(from, "bot", invalidBody, "Smart Booking - Choose Time", incomingPhoneNumberId, { customerName: profileName, messageType: "Smart Booking Invalid Time" });
7368:       return true;
7369:     }
7370: 
7371:     return submitSmartBooking(existingDraft, parsedTime.time, input);
7372:   }
7373: 
7374:   const staff = detectSmartBookingStaff(input);
7375:   const detectedDayForNewDraft = detectedDay;
7376:   const directConsultationChatBooking = Boolean(forceConsultationChatBooking || isDirectConsultationChatBookingText(input));
7377:   const branch = directConsultationChatBooking ? (lineConfig.branch || "Dubai") : (staff?.branch || lineConfig.branch || "Dubai");
7378:   const draft = {
7379:     branch,
7380:     preferredDay: detectedDayForNewDraft || "",
7381:     preferredTime: inputTime.ok ? inputTime.time : "",
7382:     teamMember: directConsultationChatBooking ? "" : (staff?.name || ""),
7383:     serviceType: directConsultationChatBooking ? "" : detectSmartBookingServiceType(input),
7384:     requestType: directConsultationChatBooking ? "Consultation Booking" : "",
7385:     directConsultationChatBooking,
7386:     skipStaffQuestion: directConsultationChatBooking,
7387:     urgent: isSmartBookingUrgentText(input),
7388:     rawRequest: input,
7389:     startedAt: getDubaiTimestamp(),
7390:     phoneNumberId: incomingPhoneNumberId,
7391:     waitingForTime: false,
7392:     waitingForWeekday: false,
7393:     waitingForStaff: false
7394:   };
7395:   smartBookingDrafts[from] = draft;
7396: 
7397:   addInboxMessage(from, "customer", buildCustomerActionBody(profileName, input), "Smart Booking", incomingPhoneNumberId, { customerName: profileName, messageType: "Customer Smart Natural Booking Request" });
7398: 
7399:   if (!draft.preferredDay) {
7400:     setConversationStatus(from, "Smart Booking - Choose Day");
7401:     const askDayBody = buildSmartBookingAskDayBody(draft, profileName, replyLanguage);
7402:     const dayButtons = getSmartBookingWeekdayButtons(replyLanguage);
7403:     await sendWhatsAppButtonMessage(from, askDayBody, dayButtons, incomingPhoneNumberId, { replyLanguage });
7404:     addInboxMessage(from, "bot", formatButtonLog(askDayBody, dayButtons), "Smart Booking - Choose Day", incomingPhoneNumberId, { customerName: profileName, messageType: "Smart Booking Ask Day" });
7405:     return true;
7406:   }
7407: 
7408:   if (draft.preferredDay === "This Week") {
7409:     return askForWeekday(draft);
7410:   }
7411: 
7412:   if (!draft.teamMember && !draft.skipStaffQuestion) {
7413:     return askForStaff(draft);
7414:   }
7415: 
7416:   if (draft.preferredTime) {
7417:     return submitSmartBooking(draft, draft.preferredTime, input);
7418:   }
7419: 
7420:   return askForTime(draft);
7421: }
7422: 
7423: function getFastBookingBranchButtons() {
7424:   return [
7425:     { id: "fast_book_dubai", title: "Dubai" },
7426:     { id: "fast_book_abudhabi", title: "Abu Dhabi" },
7427:     { id: "talk_to_team", title: "Team" }
7428:   ];
7429: }
7430: 
7431: function getFastBookingTimeButtons() {
7432:   return [
7433:     { id: "fast_time_today", title: "Today" },
7434:     { id: "fast_time_tomorrow", title: "Tomorrow" },
7435:     { id: "fast_time_week", title: "This Week" }
7436:   ];
7437: }
7438: 
7439: function isFastBookingStartText(text) {
7440:   const value = compactText(text);
7441: 
7442:   return value === "1" ||
7443:     value === "١" ||
7444:     value === "book_appointment" ||
7445:     value.includes("حجز موعد") ||
7446:     value.includes("احجز") ||
7447:     value.includes("موعد") ||
7448:     value.includes("appointment") ||
7449:     value.includes("book consultation") ||
7450:     value.includes("book appointment") ||
7451:     value === "book" ||
7452:     value.includes(" book");
7453: }
7454: 
7455: function isServiceMenuText(text) {
7456:   const value = compactText(text);
7457: 
7458:   return value === "service | سيرفس" ||
7459:     value === "service_menu" ||
```

## Source lines 7721-7951
```javascript
7721:     "If you have a name or exact preferred time, send it here in this chat.";
7722: }
7723: 
7724: function buildFastBookingRequestMessage(branch, preferredTime, originalText = "") {
7725:   return [
7726:     "Source: WhatsApp Fast Booking Buttons",
7727:     `Preferred branch: ${branch}`,
7728:     `Preferred time: ${preferredTime}`,
7729:     "Flyksoft Status: Not added",
7730:     originalText ? `Customer selection: ${originalText}` : "Customer selection: Fast booking button"
7731:   ].join("\n");
7732: }
7733: 
7734: async function handleFastBookingButtons({
7735:   from,
7736:   message,
7737:   originalText,
7738:   text,
7739:   incomingPhoneNumberId,
7740:   lineConfig,
7741:   profileName,
7742:   replyLanguage = "en"
7743: }) {
7744:   const startedFastBooking = isFastBookingStartText(originalText || text);
7745:   const chosenBranch = getFastBookingBranchChoice(originalText || text);
7746:   const preferredTime = getFastBookingPreferredTime(originalText || text);
7747: 
7748:   if (!startedFastBooking && !chosenBranch && !preferredTime) {
7749:     return false;
7750:   }
7751: 
7752:   const customerActionText = getSmartCustomerActionText(message, originalText || text) || "Fast booking button";
7753:   const customerBody = buildCustomerActionBody(profileName, customerActionText);
7754: 
7755:   if (customerBody) {
7756:     addInboxMessage(
7757:       from,
7758:       "customer",
7759:       customerBody,
7760:     "Fast Booking",
7761:     incomingPhoneNumberId,
7762:     {
7763:       customerName: profileName,
7764:       messageType: "Customer Fast Booking Step"
7765:       }
7766:     );
7767:   }
7768: 
7769:   if (startedFastBooking) {
7770:     fastBookingDrafts[from] = {
7771:       branch: "",
7772:       startedAt: getDubaiTimestamp(),
7773:       phoneNumberId: incomingPhoneNumberId
7774:     };
7775: 
7776:     const selectedBookingFlowConfig = getBookingFlowConfigForLine(incomingPhoneNumberId, lineConfig.displayNumber || "");
7777: 
7778:     console.log(`[WhatsApp Flow Route] branch=${selectedBookingFlowConfig.branch} phoneNumberId=${incomingPhoneNumberId} env=${selectedBookingFlowConfig.envName} flowId=${selectedBookingFlowConfig.flowId}`);
7779: 
7780:     if (ICONIC_BOOKING_FLOW_ENABLED && selectedBookingFlowConfig.flowId) {
7781:       setConversationStatus(from, "WhatsApp Flow - Opened");
7782:       await saveConversationStateToGoogleSheetFromServer({
7783:         phone: from,
7784:         phoneNumberId: incomingPhoneNumberId,
7785:         branch: lineConfig.branch,
7786:         status: "WhatsApp Flow - Opened",
7787:         assignee: getBranchTeamAssignee(lineConfig.branch),
7788:         tags: ["Booking", "WhatsApp Flow"],
7789:         updatedBy: "WhatsApp Flow"
7790:       });
7791: 
7792:       const flowSendResult = await sendWhatsAppFlowMessage(from, incomingPhoneNumberId, {
7793:         branch: lineConfig.branch,
7794:         customerName: profileName,
7795:         replyLanguage
7796:       });
7797: 
7798:       if (flowSendResult.ok) {
7799:         addInboxMessage(
7800:           from,
7801:           "bot",
7802:           `WhatsApp Flow sent from ${selectedBookingFlowConfig.branch}: ${selectedBookingFlowConfig.flowId}`,
7803:           "WhatsApp Flow - Opened",
7804:           incomingPhoneNumberId,
7805:           {
7806:             customerName: profileName,
7807:             messageType: "WhatsApp Flow Sent"
7808:           }
7809:         );
7810: 
7811:         return true;
7812:       }
7813: 
7814:       console.log("WhatsApp Flow send failed, falling back to Fast Booking Buttons.");
7815:     }
7816: 
7817:     setConversationStatus(from, "Fast Booking - Choose Branch");
7818:     await saveConversationStateToGoogleSheetFromServer({
7819:       phone: from,
7820:       phoneNumberId: incomingPhoneNumberId,
7821:       branch: lineConfig.branch,
7822:       status: "Fast Booking - Choose Branch",
7823:       assignee: getBranchTeamAssignee(lineConfig.branch),
7824:       tags: ["Booking", "Fast Booking"],
7825:       updatedBy: "WhatsApp Fast Booking"
7826:     });
7827: 
7828:     const branchBody = buildFastBookingBranchBody();
7829:     const branchButtons = getFastBookingBranchButtons();
7830: 
7831:     await sendWhatsAppButtonMessage(from, branchBody, branchButtons, incomingPhoneNumberId, { headerImageUrl: MAIN_MENU_HEADER_IMAGE_URL });
7832:     addInboxMessage(from, "bot", formatButtonLog(branchBody, branchButtons), "Fast Booking - Choose Branch", incomingPhoneNumberId, { customerName: profileName, messageType: "Fast Booking Bot Reply" });
7833: 
7834:     return true;
7835:   }
7836: 
7837:   if (chosenBranch) {
7838:     fastBookingDrafts[from] = {
7839:       ...(fastBookingDrafts[from] || {}),
7840:       branch: chosenBranch,
7841:       startedAt: fastBookingDrafts[from]?.startedAt || getDubaiTimestamp(),
7842:       phoneNumberId: incomingPhoneNumberId
7843:     };
7844: 
7845:     setConversationStatus(from, "Fast Booking - Choose Time");
7846:     await saveConversationStateToGoogleSheetFromServer({
7847:       phone: from,
7848:       phoneNumberId: incomingPhoneNumberId,
7849:       branch: chosenBranch,
7850:       status: "Fast Booking - Choose Time",
7851:       assignee: getBranchTeamAssignee(chosenBranch),
7852:       tags: ["Booking", "Fast Booking"],
7853:       updatedBy: "WhatsApp Fast Booking"
7854:     });
7855: 
7856:     const timeBody = buildFastBookingTimeBody(chosenBranch);
7857:     const timeButtons = getFastBookingTimeButtons();
7858: 
7859:     await sendWhatsAppButtonMessage(from, timeBody, timeButtons, incomingPhoneNumberId);
7860:     addInboxMessage(from, "bot", formatButtonLog(timeBody, timeButtons), "Fast Booking - Choose Time", incomingPhoneNumberId, { customerName: profileName, messageType: "Fast Booking Bot Reply" });
7861: 
7862:     return true;
7863:   }
7864: 
7865:   if (preferredTime) {
7866:     const draft = fastBookingDrafts[from] || {};
7867:     const selectedBranch = draft.branch || lineConfig.branch || "Dubai";
7868: 
7869:     setConversationStatus(from, "Booking Request");
7870:     await saveConversationStateToGoogleSheetFromServer({
7871:       phone: from,
7872:       phoneNumberId: incomingPhoneNumberId,
7873:       branch: selectedBranch,
7874:       status: "Booking Request",
7875:       assignee: getBranchTeamAssignee(selectedBranch),
7876:       tags: ["Booking", "Fast Booking", "Need Confirmation"],
7877:       updatedBy: "WhatsApp Fast Booking"
7878:     });
7879: 
7880:     await saveBookingRequestToGoogleSheetFromServer({
7881:       phone: from,
7882:       phoneNumberId: incomingPhoneNumberId,
7883:       customerName: profileName,
7884:       branch: selectedBranch,
7885:       message: buildFastBookingRequestMessage(selectedBranch, preferredTime, originalText),
7886:       requestType: "WhatsApp Fast Booking",
7887:       bookingStatus: "Pending"
7888:     });
7889: 
7890:     delete fastBookingDrafts[from];
7891: 
7892:     const confirmationBody = buildFastBookingConfirmationBody(selectedBranch, preferredTime);
7893:     const confirmationButtons = getConsultActionButtons();
7894: 
7895:     await sendWhatsAppButtonMessage(from, confirmationBody, confirmationButtons, incomingPhoneNumberId);
7896:     addInboxMessage(from, "bot", formatButtonLog(confirmationBody, confirmationButtons), "Booking Request", incomingPhoneNumberId, { customerName: profileName, messageType: "Fast Booking Confirmation" });
7897: 
7898:     return true;
7899:   }
7900: 
7901:   return false;
7902: }
7903: 
7904: function getServicesDeepMenuButtons() {
7905:   return [
7906:     { id: "natural_look", title: "طبيعي / Natural" },
7907:     { id: "price_info", title: "السعر / Price" },
7908:     { id: "private_consult", title: "استشارة/Consultation" }
7909:   ];
7910: }
7911: 
7912: function getActionButtons() {
7913:   return [
7914:     { id: "book_appointment", title: "احجز / Book" },
7915:     { id: "call_branch", title: "اتصل / Call" },
7916:     { id: "location_branch", title: "الموقع / Location" }
7917:   ];
7918: }
7919: 
7920: function getConsultActionButtons() {
7921:   return [
7922:     { id: "call_branch", title: "اتصل / Call" },
7923:     { id: "location_branch", title: "الموقع / Location" },
7924:     { id: "talk_to_team", title: "الفريق / Team" }
7925:   ];
7926: }
7927: 
7928: 
7929: function getReminderOptInButtons() {
7930:   return [
7931:     { id: "reminder_opt_in_yes", title: "أوافق" },
7932:     { id: "reminder_opt_in_no", title: "لا أوافق" },
7933:     { id: "talk_to_team", title: "الفريق / Team" }
7934:   ];
7935: }
7936: 
7937: function buildReminderOptInBody() {
7938:   return `${BUSINESS_NAME_SPACED} ✨\n\n` +
7939:     "هل توافق على استلام تذكير / متابعة من Iconic Hair Care؟\n\n" +
7940:     "هذا التذكير خاص بمتابعة الخدمة كل 20 يوم تقريباً.\n\n" +
7941:     "الموافقة اختيارية، وتقدر توقف التذكير بأي وقت بإرسال STOP أو إيقاف.\n\n" +
7942:     "------------------------------\n\n" +
7943:     `${BUSINESS_NAME_SPACED} ✨\n\n` +
7944:     "Do you agree to receive service follow-up reminders from Iconic Hair Care?\n\n" +
7945:     "This reminder is for service follow-up around every 20 days.\n\n" +
7946:     "This is optional. You can stop reminders anytime by sending STOP.";
7947: }
7948: 
7949: function formatButtonLog(body, buttons) {
7950:   const buttonText = buttons.map((button) => `• ${button.title}`).join("\n");
7951:   return `${body}\n\nButtons:\n${buttonText}`;
```

## Source lines 8656-8764
```javascript
8656: 
8657:     return {
8658:       booking,
8659:       phone,
8660:       customerName: booking.customerName || "",
8661:       branch: booking.branch || getLineConfig(phoneNumberId).branch,
8662:       phoneNumberId,
8663:       appointmentAt,
8664:       reminderAt,
8665:       template: getAppointmentReminderTemplateName(phoneNumberId)
8666:     };
8667:   }).filter((record) => {
8668:     const status = compactText(record.booking.status || "");
8669:     if (!record.phone || !record.appointmentAt || !record.reminderAt) return false;
8670:     if (!isConfirmedAppointmentStatus(status) && !status.includes("confirmed")) return false;
8671:     if (isCustomerOptedOutForFollowUps(messages, record.phone, record.phoneNumberId)) return false;
8672:     if (hasAppointmentReminderBeenSent(messages, record.phone, record.phoneNumberId, record.appointmentAt)) return false;
8673: 
8674:     const nowMs = now.getTime();
8675:     const reminderMs = record.reminderAt.getTime();
8676:     const appointmentMs = record.appointmentAt.getTime();
8677: 
8678:     return nowMs >= reminderMs && nowMs <= Math.min(appointmentMs, reminderMs + dueWindowMs);
8679:   });
8680: }
8681: 
8682: async function activateAppointmentReminderAfterConfirmation({ booking = {}, phoneNumberId = DUBAI_PHONE_NUMBER_ID, notes = "", updatedBy = "Booking Confirmation" } = {}) {
8683:   const customerPhone = normalizePhoneDigits(booking.phone || "");
8684:   const finalPhoneNumberId = normalizePhoneNumberId(phoneNumberId || booking.phoneNumberId || DUBAI_PHONE_NUMBER_ID);
8685:   if (!customerPhone) return { ok: false, skipped: true, reason: "missing_customer_phone" };
8686: 
8687:   const bookingWithNotes = { ...booking, notes: notes || booking.notes || "" };
8688:   const appointmentAt = parseAppointmentDateTimeFromBooking(bookingWithNotes);
8689:   const lineConfig = getLineConfig(finalPhoneNumberId);
8690: 
8691:   await saveConversationStateToGoogleSheetFromServer({
8692:     phone: customerPhone,
8693:     phoneNumberId: finalPhoneNumberId,
8694:     branch: booking.branch || lineConfig.branch,
8695:     status: "Confirmed Appointment",
8696:     assignee: getBranchTeamAssignee(booking.branch || lineConfig.branch),
8697:     tags: ["Booking", "Confirmed", "Appointment Reminder Auto Scheduled", `${APPOINTMENT_REMINDER_LEAD_MINUTES} Minutes Before`],
8698:     updatedBy
8699:   });
8700: 
8701:   const logBody = [
8702:     "Appointment reminder auto scheduled ✅",
8703:     `Branch: ${booking.branch || lineConfig.branch}`,
8704:     `Template: ${getAppointmentReminderTemplateName(finalPhoneNumberId)}`,
8705:     appointmentAt ? `Appointment at: ${appointmentAt.toISOString()}` : "Appointment time could not be parsed yet",
8706:     `Reminder lead: ${APPOINTMENT_REMINDER_LEAD_MINUTES} minutes before`
8707:   ].filter(Boolean).join("\n");
8708: 
8709:   addInboxMessage(customerPhone, "bot", logBody, "Appointment Reminder Scheduled", finalPhoneNumberId, {
8710:     customerName: booking.customerName || "",
8711:     messageType: "Appointment Reminder Auto Scheduled"
8712:   });
8713: 
8714:   return { ok: Boolean(appointmentAt), appointmentAt, template: getAppointmentReminderTemplateName(finalPhoneNumberId) };
8715: }
8716: 
8717: function normalizeIntentTags(tags) {
8718:   const seen = new Set();
8719:   return (Array.isArray(tags) ? tags : []).map((tag) => (tag || "").toString().trim()).filter((tag) => {
8720:     if (!tag || seen.has(tag)) return false;
8721:     seen.add(tag);
8722:     return true;
8723:   });
8724: }
8725: 
8726: function getAutoIntentWorkflow(text) {
8727:   const value = compactText(text);
8728: 
8729:   if (!value) return null;
8730: 
8731:   const hasAny = (items) => items.some((item) => value.includes(item));
8732: 
8733:   if (isBookingIntentText(value)) {
8734:     return {
8735:       status: "Booking Request",
8736:       tags: ["Booking", "Need Details"],
8737:       assignee: "Consultation Team",
8738:       notifyStaff: false
8739:     };
8740:   }
8741: 
8742:   if (isConsultationIntentText(value)) {
8743:     return {
8744:       status: "Consultation Request",
8745:       tags: ["Consultation", "Need Details"],
8746:       assignee: "Consultation Team",
8747:       notifyStaff: true
8748:     };
8749:   }
8750: 
8751:   if (isTalkToTeamText(value)) {
8752:     return {
8753:       status: "Talk to Team",
8754:       tags: ["Human Support", "Need Details"],
8755:       assignee: "Consultation Team",
8756:       notifyStaff: false
8757:     };
8758:   }
8759: 
8760:   if (isCallIntentText(value)) {
8761:     return {
8762:       status: "Call Requested",
8763:       tags: ["Call Requested", "Need Details"],
8764:       assignee: "Consultation Team",
```

## Source lines 8782-9041
```javascript
8782:       assignee: "Unassigned",
8783:       notifyStaff: false
8784:     };
8785:   }
8786: 
8787:   if (isNaturalLookIntentText(value)) {
8788:     return {
8789:       status: "Service Interest",
8790:       tags: ["Service Interest", "Natural Look"],
8791:       assignee: "Unassigned",
8792:       notifyStaff: false
8793:     };
8794:   }
8795: 
8796:   if (isServicesIntentText(value)) {
8797:     return {
8798:       status: "Service Interest",
8799:       tags: ["Service Interest"],
8800:       assignee: "Unassigned",
8801:       notifyStaff: false
8802:     };
8803:   }
8804: 
8805:   if (isAutoVideoRequestText(value)) {
8806:     return {
8807:       status: "Media Requested",
8808:       tags: ["Media Requested", "Service Interest"],
8809:       assignee: "Unassigned",
8810:       notifyStaff: false
8811:     };
8812:   }
8813: 
8814:   return null;
8815: }
8816: 
8817: async function saveConversationStateToGoogleSheetFromServer({ phone, phoneNumberId, branch, status, assignee, tags, updatedBy = "Auto Intent Tags" }) {
8818:   const sheetUrl = process.env.SHEET_WEBHOOK_URL;
8819: 
8820:   if (!sheetUrl) {
8821:     console.log("SHEET_WEBHOOK_URL is missing. Auto intent state save skipped.");
8822:     return;
8823:   }
8824: 
8825:   const cleanPhone = (phone || "").toString().trim();
8826:   const cleanPhoneNumberId = normalizePhoneNumberId(phoneNumberId || "");
8827: 
8828:   if (!cleanPhone || !cleanPhoneNumberId) {
8829:     console.log("Auto intent state save skipped: missing phone or phoneNumberId.");
8830:     return;
8831:   }
8832: 
8833:   const payload = {
8834:     action: "saveConversationState",
8835:     phone: cleanPhone,
8836:     phoneNumberId: cleanPhoneNumberId,
8837:     branch: (branch || getLineConfig(cleanPhoneNumberId).branch || "").toString().trim(),
8838:     conversation_status: (status || "Open").toString().trim(),
8839:     assigned_to: getBranchTeamAssignee(branch || getLineConfig(cleanPhoneNumberId).branch),
8840:     tags: normalizeIntentTags(tags || []),
8841:     last_updated_by: updatedBy
8842:   };
8843: 
8844:   try {
8845:     const response = await fetch(sheetUrl, {
8846:       method: "POST",
8847:       headers: { "Content-Type": "application/json" },
8848:       body: JSON.stringify(payload)
8849:     });
8850: 
8851:     const responseText = await response.text();
8852: 
8853:     if (!response.ok) {
8854:       console.log("Auto intent state save HTTP failed:");
8855:       console.log(response.status, responseText);
8856:       return;
8857:     }
8858: 
8859:     console.log("Auto intent state saved:");
8860:     console.log(responseText);
8861:     clearMessagesApiSheetCache("conversation state saved");
8862:   } catch (error) {
8863:     console.log("Auto intent state save failed:");
8864:     console.log(error);
8865:   }
8866: }
8867: 
8868: async function saveBookingRequestToGoogleSheetFromServer({ phone, phoneNumberId, customerName = "", branch = "", message = "", requestType = "Booking Request", bookingStatus = "Pending" }) {
8869:   const sheetUrl = process.env.SHEET_WEBHOOK_URL;
8870: 
8871:   if (!sheetUrl) {
8872:     console.log("SHEET_WEBHOOK_URL is missing. Booking request save skipped.");
8873:     return;
8874:   }
8875: 
8876:   const cleanPhone = (phone || "").toString().trim();
8877:   const cleanPhoneNumberId = normalizePhoneNumberId(phoneNumberId || "");
8878: 
8879:   if (!cleanPhone || !cleanPhoneNumberId) {
8880:     console.log("Booking request save skipped: missing phone or phoneNumberId.");
8881:     return;
8882:   }
8883: 
8884:   const now = getDubaiTimestamp();
8885:   const payload = {
8886:     action: "saveBookingRequest",
8887:     date: now,
8888:     phone: cleanPhone,
8889:     phoneNumberId: cleanPhoneNumberId,
8890:     customerName: (customerName || "").toString().trim(),
8891:     branch: (branch || getLineConfig(cleanPhoneNumberId).branch || "").toString().trim(),
8892:     requestType: requestType || "Booking Request",
8893:     message: (message || "").toString().trim() || "Customer selected Book / Booking Request",
8894:     bookingStatus: bookingStatus || "Pending",
8895:     notes: "",
8896:     lastUpdated: now
8897:   };
8898: 
8899:   try {
8900:     const response = await fetch(sheetUrl, {
8901:       method: "POST",
8902:       headers: { "Content-Type": "application/json" },
8903:       body: JSON.stringify(payload)
8904:     });
8905: 
8906:     const responseText = await response.text();
8907: 
8908:     if (!response.ok) {
8909:       console.log("Booking request save HTTP failed:");
8910:       console.log(response.status, responseText);
8911:       return;
8912:     }
8913: 
8914:     let result;
8915:     try {
8916:       result = JSON.parse(responseText);
8917:     } catch (error) {
8918:       result = { ok: false, raw: responseText };
8919:     }
8920: 
8921:     if (!result.ok) {
8922:       console.log("Booking request save returned failure:");
8923:       console.log(responseText);
8924:       return;
8925:     }
8926: 
8927:     console.log("Booking request saved:");
8928:     console.log(responseText);
8929:     clearMessagesApiSheetCache("booking request saved");
8930:   } catch (error) {
8931:     console.log("Booking request save failed:");
8932:     console.log(error);
8933:   }
8934: }
8935: 
8936: 
8937: async function loadBookingRequestsFromGoogleSheetFromServer() {
8938:   const sheetUrl = process.env.SHEET_WEBHOOK_URL;
8939: 
8940:   if (!sheetUrl) {
8941:     console.log("SHEET_WEBHOOK_URL is missing. Booking requests load skipped.");
8942:     return { ok: false, bookingRequests: [], error: "SHEET_WEBHOOK_URL is missing" };
8943:   }
8944: 
8945:   try {
8946:     const response = await fetch(sheetUrl, {
8947:       method: "POST",
8948:       headers: { "Content-Type": "application/json" },
8949:       body: JSON.stringify({ action: "loadBookingRequests" })
8950:     });
8951: 
8952:     const responseText = await response.text();
8953:     let result;
8954: 
8955:     try {
8956:       result = JSON.parse(responseText);
8957:     } catch (error) {
8958:       result = { ok: false, error: responseText || "Invalid Apps Script response" };
8959:     }
8960: 
8961:     if (!response.ok || !result.ok) {
8962:       console.log("Booking requests load failed:");
8963:       console.log(response.status, responseText);
8964:       return {
8965:         ok: false,
8966:         bookingRequests: [],
8967:         error: result.error || "Booking requests load failed"
8968:       };
8969:     }
8970: 
8971:     return {
8972:       ok: true,
8973:       bookingRequests: Array.isArray(result.bookingRequests) ? result.bookingRequests : []
8974:     };
8975:   } catch (error) {
8976:     console.log("Booking requests load error:");
8977:     console.log(error);
8978:     return { ok: false, bookingRequests: [], error: "Booking requests load error" };
8979:   }
8980: }
8981: 
8982: async function updateBookingRequestStatusInGoogleSheetFromServer({ rowNumber, phone, phoneNumberId, status, notes = "" }) {
8983:   const sheetUrl = process.env.SHEET_WEBHOOK_URL;
8984: 
8985:   if (!sheetUrl) {
8986:     return { ok: false, error: "SHEET_WEBHOOK_URL is missing" };
8987:   }
8988: 
8989:   const payload = {
8990:     action: "updateBookingRequestStatus",
8991:     rowNumber,
8992:     phone: (phone || "").toString().trim(),
8993:     phoneNumberId: normalizePhoneNumberId(phoneNumberId || ""),
8994:     status: (status || "").toString().trim(),
8995:     notes: (notes || "").toString().trim()
8996:   };
8997: 
8998:   if (!payload.status) {
8999:     return { ok: false, error: "Missing status" };
9000:   }
9001: 
9002:   try {
9003:     const response = await fetch(sheetUrl, {
9004:       method: "POST",
9005:       headers: { "Content-Type": "application/json" },
9006:       body: JSON.stringify(payload)
9007:     });
9008: 
9009:     const responseText = await response.text();
9010:     let result;
9011: 
9012:     try {
9013:       result = JSON.parse(responseText);
9014:     } catch (error) {
9015:       result = { ok: false, error: responseText || "Invalid Apps Script response" };
9016:     }
9017: 
9018:     if (!response.ok || !result.ok) {
9019:       console.log("Booking status update failed:");
9020:       console.log(response.status, responseText);
9021:       return result;
9022:     }
9023: 
9024:     console.log("Booking status updated:");
9025:     console.log(responseText);
9026:     clearMessagesApiSheetCache("booking request updated");
9027:     return result;
9028:   } catch (error) {
9029:     console.log("Booking status update error:");
9030:     console.log(error);
9031:     return { ok: false, error: "Booking status update error" };
9032:   }
9033: }
9034: 
9035: function buildBookingCustomerUpdateBody(status, notes = "", language = "en") {
9036:   const cleanStatus = (status || "").toString().trim();
9037:   const statusValue = cleanStatus.toLowerCase();
9038:   const cleanNotes = (notes || "").toString().trim();
9039:   const isArabic = language === "ar";
9040: 
9041:   if (!cleanStatus) {
```

## Source lines 9337-9427
```javascript
9337: });
9338: 
9339: app.get("/api/appointment-reminders/send-due", protectInbox, async (req, res) => {
9340:   try {
9341:     const confirm = (req.query.confirm || "").toString().trim();
9342: 
9343:     if (confirm !== "SEND") {
9344:       return res.status(400).json({
9345:         ok: false,
9346:         error: "Safety check: add ?confirm=SEND to send due appointment reminders.",
9347:         preview_url: "/api/appointment-reminders/preview"
9348:       });
9349:     }
9350: 
9351:     const sheetData = await loadMessagesFromGoogleSheet();
9352:     const messages = sheetData.messages || [];
9353:     const bookingData = await loadBookingRequestsFromGoogleSheetFromServer();
9354:     const appointmentDue = getDueAppointmentReminders(bookingData.bookingRequests || [], messages);
9355:     const sent = [];
9356:     const failed = [];
9357: 
9358:     for (const record of appointmentDue) {
9359:       const templateName = getAppointmentReminderTemplateName(record.phoneNumberId);
9360:       const sendResult = await sendWhatsAppTemplate(
9361:         record.phone,
9362:         templateName,
9363:         record.phoneNumberId,
9364:         APPOINTMENT_REMINDER_TEMPLATE_LANGUAGE,
9365:         {
9366:           includeHeaderImage: Boolean(APPOINTMENT_REMINDER_HEADER_IMAGE_URL),
9367:           headerImageUrl: APPOINTMENT_REMINDER_HEADER_IMAGE_URL
9368:         }
9369:       );
9370: 
9371:       if (sendResult.ok) {
9372:         addInboxMessage(
9373:           record.phone,
9374:           "bot",
9375:           getAppointmentReminderBodyForLog(record.phoneNumberId, record.appointmentAt),
9376:           "Appointment Reminder Sent",
9377:           record.phoneNumberId,
9378:           {
9379:             customerName: record.customerName || "",
9380:             messageType: "Appointment 1-hour Reminder"
9381:           }
9382:         );
9383: 
9384:         sent.push({
9385:           phone: record.phone,
9386:           customerName: record.customerName || "",
9387:           branch: record.branch,
9388:           phoneNumberId: record.phoneNumberId,
9389:           appointmentAt: record.appointmentAt?.toISOString?.() || "",
9390:           reminderAt: record.reminderAt?.toISOString?.() || "",
9391:           template: templateName
9392:         });
9393:       } else {
9394:         failed.push({
9395:           phone: record.phone,
9396:           customerName: record.customerName || "",
9397:           branch: record.branch,
9398:           phoneNumberId: record.phoneNumberId,
9399:           appointmentAt: record.appointmentAt?.toISOString?.() || "",
9400:           reminderAt: record.reminderAt?.toISOString?.() || "",
9401:           template: templateName,
9402:           result: sendResult.result
9403:         });
9404:       }
9405:     }
9406: 
9407:     return res.json({
9408:       ok: failed.length === 0,
9409:       mode: "appointment_reminder_send_due_only",
9410:       appointmentReminder: {
9411:         enabled: APPOINTMENT_REMINDER_ENABLED,
9412:         templates: getAppointmentReminderTemplateMap(),
9413:         language: APPOINTMENT_REMINDER_TEMPLATE_LANGUAGE,
9414:         leadMinutes: APPOINTMENT_REMINDER_LEAD_MINUTES,
9415:         dueWindowMinutes: APPOINTMENT_REMINDER_DUE_WINDOW_MINUTES,
9416:         scannedBookings: (bookingData.bookingRequests || []).length,
9417:         scannedMessages: messages.length,
9418:         dueCount: appointmentDue.length,
9419:         sentCount: sent.length,
9420:         failedCount: failed.length,
9421:         sent,
9422:         failed
9423:       }
9424:     });
9425:   } catch (error) {
9426:     console.error("Sending due appointment reminders failed:");
9427:     console.error(error);
```

## Source lines 9433-9640
```javascript
9433:   }
9434: });
9435: 
9436: app.get("/api/reminders/test", protectInbox, async (req, res) => {
9437:   try {
9438:     const to = normalizePhoneDigits(req.query.to || "");
9439:     const branch = normalizeText(req.query.branch || "dubai");
9440:     const requestedPhoneNumberId = normalizePhoneNumberId(req.query.phoneNumberId || "");
9441: 
9442:     if (!to) {
9443:       return res.status(400).json({
9444:         ok: false,
9445:         error: "Missing to query parameter. Example: /api/reminders/test?to=9715XXXXXXX&branch=dubai"
9446:       });
9447:     }
9448: 
9449:     const phoneNumberId = requestedPhoneNumberId ||
9450:       (branch.includes("abu") ? ABU_DHABI_PHONE_NUMBER_ID : DUBAI_PHONE_NUMBER_ID);
9451: 
9452:     const sheetData = await loadMessagesFromGoogleSheet();
9453:     const messages = sheetData.messages || [];
9454: 
9455:     if (isCustomerOptedOutForFollowUps(messages, to, phoneNumberId)) {
9456:       return res.status(403).json({
9457:         ok: false,
9458:         blocked: true,
9459:         reason: "opted_out",
9460:         error: "This customer sent STOP. Follow-up/reminder templates are blocked for this number."
9461:       });
9462:     }
9463: 
9464:     const templateName = getFollowUpTemplateName(phoneNumberId);
9465:     const sendResult = await sendWhatsAppTemplate(to, templateName, phoneNumberId, FOLLOW_UP_TEMPLATE_LANGUAGE);
9466: 
9467:     if (sendResult.ok) {
9468:       addInboxMessage(
9469:         to,
9470:         "bot",
9471:         getReminderBodyForLog(phoneNumberId),
9472:         "Follow-up Test",
9473:         phoneNumberId,
9474:         {
9475:           messageType: "Service Follow-up Template Test"
9476:         }
9477:       );
9478:     }
9479: 
9480:     return res.json({
9481:       ok: sendResult.ok,
9482:       template: templateName,
9483:       language: FOLLOW_UP_TEMPLATE_LANGUAGE,
9484:       to,
9485:       phoneNumberId,
9486:       branch: getLineConfig(phoneNumberId).branch,
9487:       result: sendResult.result
9488:     });
9489:   } catch (error) {
9490:     console.error("Reminder test failed:");
9491:     console.error(error);
9492: 
9493:     return res.status(500).json({
9494:       ok: false,
9495:       error: "Reminder test failed"
9496:     });
9497:   }
9498: });
9499: 
9500: app.get("/api/call-now/test", protectInbox, async (req, res) => {
9501:   try {
9502:     const to = normalizePhoneDigits(req.query.to || "");
9503:     const branch = normalizeText(req.query.branch || "dubai");
9504:     const requestedPhoneNumberId = normalizePhoneNumberId(req.query.phoneNumberId || "");
9505: 
9506:     if (!to) {
9507:       return res.status(400).json({
9508:         ok: false,
9509:         error: "Missing to query parameter. Example: /api/call-now/test?to=9715XXXXXXX&branch=dubai"
9510:       });
9511:     }
9512: 
9513:     const phoneNumberId = requestedPhoneNumberId ||
9514:       (branch.includes("abu") ? ABU_DHABI_PHONE_NUMBER_ID : DUBAI_PHONE_NUMBER_ID);
9515: 
9516:     const templateName = getCallNowTemplateName(phoneNumberId);
9517:     const sendResult = await sendWhatsAppTemplate(
9518:       to,
9519:       templateName,
9520:       phoneNumberId,
9521:       CALL_NOW_TEMPLATE_LANGUAGE,
9522:       { includeHeaderImage: false }
9523:     );
9524: 
9525:     if (sendResult.ok) {
9526:       addInboxMessage(
9527:         to,
9528:         "bot",
9529:         getCallNowBodyForLog(phoneNumberId),
9530:         "Call Now Test",
9531:         phoneNumberId,
9532:         {
9533:           messageType: "Call Now Template Test"
9534:         }
9535:       );
9536:     }
9537: 
9538:     return res.json({
9539:       ok: sendResult.ok,
9540:       template: templateName,
9541:       language: CALL_NOW_TEMPLATE_LANGUAGE,
9542:       templates: getCallNowTemplateMap(),
9543:       to,
9544:       phoneNumberId,
9545:       branch: getLineConfig(phoneNumberId).branch,
9546:       result: sendResult.result
9547:     });
9548:   } catch (error) {
9549:     console.error("Call Now test failed:");
9550:     console.error(error);
9551: 
9552:     return res.status(500).json({
9553:       ok: false,
9554:       error: "Call Now test failed"
9555:     });
9556:   }
9557: });
9558: 
9559: app.get("/api/location/test", protectInbox, async (req, res) => {
9560:   try {
9561:     const to = normalizePhoneDigits(req.query.to || "");
9562:     const branch = normalizeText(req.query.branch || "dubai");
9563:     const requestedPhoneNumberId = normalizePhoneNumberId(req.query.phoneNumberId || "");
9564: 
9565:     if (!to) {
9566:       return res.status(400).json({
9567:         ok: false,
9568:         error: "Missing to query parameter. Example: /api/location/test?to=9715XXXXXXX&branch=dubai"
9569:       });
9570:     }
9571: 
9572:     const phoneNumberId = requestedPhoneNumberId ||
9573:       (branch.includes("abu") ? ABU_DHABI_PHONE_NUMBER_ID : DUBAI_PHONE_NUMBER_ID);
9574:     const lineConfig = getLineConfig(phoneNumberId);
9575:     const locationBody = buildLocationMessageBody(phoneNumberId);
9576:     const sendResult = await sendWhatsAppCtaUrlMessage(
9577:       to,
9578:       locationBody,
9579:       "Open Location",
9580:       lineConfig.locationUrl,
9581:       phoneNumberId
9582:     );
9583: 
9584:     if (sendResult.ok) {
9585:       addInboxMessage(
9586:         to,
9587:         "bot",
9588:         formatCtaLog(locationBody, "Open Location"),
9589:         "Location Test",
9590:         phoneNumberId,
9591:         {
9592:           messageType: "Location CTA Test"
9593:         }
9594:       );
9595:     }
9596: 
9597:     return res.json({
9598:       ok: sendResult.ok,
9599:       to,
9600:       phoneNumberId,
9601:       branch: lineConfig.branch,
9602:       locationUrl: lineConfig.locationUrl,
9603:       result: sendResult.result
9604:     });
9605:   } catch (error) {
9606:     console.error("Location test failed:");
9607:     console.error(error);
9608: 
9609:     return res.status(500).json({
9610:       ok: false,
9611:       error: "Location test failed"
9612:     });
9613:   }
9614: });
9615: 
9616: 
9617: app.get("/api/staff-notify/test", protectInbox, async (req, res) => {
9618:   try {
9619:     const branchInput = compactText(req.query.branch || "dubai");
9620:     const isAbuDhabi = branchInput.includes("abu") || branchInput.includes("abudhabi") || branchInput.includes("ابو");
9621:     const phoneNumberId = isAbuDhabi ? ABU_DHABI_PHONE_NUMBER_ID : DUBAI_PHONE_NUMBER_ID;
9622:     const envName = isAbuDhabi ? "ABU_DHABI_STAFF_NUMBER" : "DUBAI_STAFF_NUMBER";
9623:     const rawStaffNumber = isAbuDhabi
9624:       ? (process.env.ABU_DHABI_STAFF_NUMBER || ABU_DHABI_STAFF_NUMBER || DEFAULT_ABU_DHABI_STAFF_NUMBER || "")
9625:       : (process.env.DUBAI_STAFF_NUMBER || DUBAI_STAFF_NUMBER || DEFAULT_DUBAI_STAFF_NUMBER || "");
9626:     const staffNumber = normalizeWhatsAppRecipientDigits(rawStaffNumber);
9627:     const branch = isAbuDhabi ? "Abu Dhabi" : "Dubai";
9628: 
9629:     console.log(`[Staff Notify Test] preparing branch=${branch} fromPhoneNumberId=${phoneNumberId} to=${staffNumber || "MISSING"} env=${envName} raw=${rawStaffNumber || "MISSING"}`);
9630: 
9631:     if (!staffNumber) {
9632:       return res.status(400).json({
9633:         ok: false,
9634:         error: "Missing staff number",
9635:         branch,
9636:         envName,
9637:         rawStaffNumber,
9638:         phoneNumberId
9639:       });
9640:     }
```

## Source lines 9763-9853
```javascript
9763: 
9764: app.get("/api/reminders/send-due", protectInbox, async (req, res) => {
9765:   try {
9766:     const confirm = (req.query.confirm || "").toString().trim();
9767: 
9768:     if (confirm !== "SEND") {
9769:       return res.status(400).json({
9770:         ok: false,
9771:         error: "Safety check: add ?confirm=SEND to send due reminders.",
9772:         preview_url: "/api/reminders/preview"
9773:       });
9774:     }
9775: 
9776:     const sheetData = await loadMessagesFromGoogleSheet();
9777:     const messages = sheetData.messages || [];
9778:     const due = getDueFollowUpReminders(messages);
9779:     const sent = [];
9780:     const failed = [];
9781:     const skippedOptOut = [];
9782: 
9783:     for (const record of due) {
9784:       if (isCustomerOptedOutForFollowUps(messages, record.phone, record.phoneNumberId)) {
9785:         skippedOptOut.push({
9786:           phone: record.phone,
9787:           branch: record.branch,
9788:           phoneNumberId: record.phoneNumberId,
9789:           reason: "Customer sent STOP"
9790:         });
9791:         continue;
9792:       }
9793: 
9794:       const templateName = getFollowUpTemplateName(record.phoneNumberId);
9795:       const sendResult = await sendWhatsAppTemplate(record.phone, templateName, record.phoneNumberId, FOLLOW_UP_TEMPLATE_LANGUAGE);
9796: 
9797:       if (sendResult.ok) {
9798:         addInboxMessage(
9799:           record.phone,
9800:           "bot",
9801:           getReminderBodyForLog(record.phoneNumberId),
9802:           "Follow-up Sent",
9803:           record.phoneNumberId,
9804:           {
9805:             customerName: record.customerName || "",
9806:             messageType: "Service Follow-up Reminder"
9807:           }
9808:         );
9809: 
9810:         sent.push({
9811:           phone: record.phone,
9812:           branch: record.branch,
9813:           phoneNumberId: record.phoneNumberId,
9814:           template: templateName
9815:         });
9816:       } else {
9817:         failed.push({
9818:           phone: record.phone,
9819:           branch: record.branch,
9820:           phoneNumberId: record.phoneNumberId,
9821:           template: templateName,
9822:           result: sendResult.result
9823:         });
9824:       }
9825:     }
9826: 
9827:     return res.json({
9828:       ok: failed.length === 0,
9829:       mode: "follow_up_send_due_only",
9830:       templateMode: "branch_specific",
9831:       templates: getFollowUpTemplateMap(),
9832:       appointmentReminder: {
9833:         separated: true,
9834:         previewUrl: "/api/appointment-reminders/preview",
9835:         sendDueUrl: "/api/appointment-reminders/send-due?confirm=SEND"
9836:       },
9837:       headerImageConfigured: Boolean(FOLLOW_UP_HEADER_IMAGE_URL),
9838:       delayDays: FOLLOW_UP_DELAY_DAYS,
9839:       dueCount: due.length,
9840:       sentCount: sent.length,
9841:       failedCount: failed.length,
9842:       skippedOptOutCount: skippedOptOut.length,
9843:       sent,
9844:       failed,
9845:       skippedOptOut
9846:     });
9847:   } catch (error) {
9848:     console.error("Sending due reminders failed:");
9849:     console.error(error);
9850: 
9851:     return res.status(500).json({
9852:       ok: false,
9853:       error: "Sending due reminders failed"
```

## Source lines 10236-10491
```javascript
10236: 
10237:       return res.status(remoteResult.status || (remoteResult.ok ? 200 : 502)).json(remoteResult.data || {
10238:         ok: false,
10239:         error: "303 booking update request failed"
10240:       });
10241:     }
10242: 
10243:     const replyLanguage = getConversationLanguage(to);
10244:     const messageBuild = buildBookingCustomerUpdateBody(status, notes, replyLanguage);
10245: 
10246:     if (!messageBuild.ok) {
10247:       return res.status(400).json(messageBuild);
10248:     }
10249: 
10250:     const updateButtons = Array.isArray(messageBuild.buttons) ? messageBuild.buttons : [];
10251:     const localizedUpdateBody = cleanLocalizedReplyBody(messageBuild.body, replyLanguage);
10252:     const localizedUpdateButtons = localizeReplyButtons(updateButtons, replyLanguage);
10253:     const sendResult = localizedUpdateButtons.length > 0
10254:       ? await sendWhatsAppButtonMessage(to, localizedUpdateBody, localizedUpdateButtons, phoneNumberId, { headerImageUrl: BOT_HEADER_IMAGE_URL, replyLanguage, skipAutoLanguage: true })
10255:       : await sendWhatsAppMessage(to, localizedUpdateBody, phoneNumberId, { replyLanguage, skipAutoLanguage: true });
10256: 
10257:     if (sendResult?.error) {
10258:       return res.status(500).json({
10259:         ok: false,
10260:         error: sendResult.error?.message || "WhatsApp booking update send failed",
10261:         result: sendResult
10262:       });
10263:     }
10264: 
10265:     const loggedUpdateBody = updateButtons.length > 0
10266:       ? formatButtonLog(messageBuild.body, updateButtons)
10267:       : messageBuild.body;
10268: 
10269:     if (isApprovedBookingStatus(status)) {
10270:       setConversationStatus(to, "Confirmed Appointment");
10271:       await saveConversationStateToGoogleSheetFromServer({
10272:         phone: to,
10273:         phoneNumberId,
10274:         branch: getLineConfig(phoneNumberId).branch,
10275:         status: "Confirmed Appointment",
10276:         assignee: getBranchTeamAssignee(getLineConfig(phoneNumberId).branch),
10277:         tags: ["Booking", "Confirmed"],
10278:         updatedBy: "Team Confirmed Booking"
10279:       });
10280:     }
10281: 
10282:     addInboxMessage(
10283:       to,
10284:       "staff",
10285:       loggedUpdateBody,
10286:       isApprovedBookingStatus(status) ? "Confirmed Appointment" : "Human Reply",
10287:       phoneNumberId,
10288:       {
10289:         messageType: "Booking Customer Update"
10290:       }
10291:     );
10292: 
10293:     return res.json({
10294:       ok: true,
10295:       to,
10296:       phoneNumberId,
10297:       status,
10298:       result: sendResult
10299:     });
10300:   } catch (error) {
10301:     console.error("Booking customer update send failed:");
10302:     console.error(error);
10303:     return res.status(500).json({ ok: false, error: "Booking customer update send failed" });
10304:   }
10305: });
10306: 
10307: 
10308: // V31.5.8.60.3.7.3 - Manual booking Flow link:
10309: // Safe internal endpoint for staff to resend Service/Consultation WhatsApp Flows
10310: // by opening a protected URL with phone, type, and branch query parameters.
10311: app.get("/api/send-booking-flow", protectInbox, async (req, res) => {
10312:   try {
10313:     const to = normalizePhoneDigits(req.query?.phone || req.query?.to || "");
10314:     const requestedType = (req.query?.type || "service").toString().toLowerCase().trim();
10315:     const requestedBranch = (req.query?.branch || "dubai").toString().toLowerCase().trim();
10316:     const customerName = cleanCustomerName(req.query?.name || req.query?.customerName || "");
10317: 
10318:     if (!to) {
10319:       return res.status(400).json({
10320:         ok: false,
10321:         error: "Missing customer phone",
10322:         example: "/api/send-booking-flow?phone=9715XXXXXXX&type=service&branch=dubai"
10323:       });
10324:     }
10325: 
10326:     const isAbuDhabiBranch = requestedBranch.includes("abu") || requestedBranch.includes("ad");
10327:     const phoneNumberId = normalizePhoneNumberId(req.query?.phoneNumberId || (isAbuDhabiBranch ? ABU_DHABI_PHONE_NUMBER_ID : DUBAI_PHONE_NUMBER_ID));
10328:     const lineConfig = getLineConfig(phoneNumberId);
10329:     const flowType = requestedType.includes("consult") || requestedType.includes("استشار")
10330:       ? "consultation"
10331:       : "service";
10332:     const requestType = flowType === "consultation"
10333:       ? "Consultation Booking"
10334:       : "Service Appointment";
10335:     const status = flowType === "consultation"
10336:       ? "Consultation Flow - Sent Manually"
10337:       : "Service Flow - Sent Manually";
10338: 
10339:     const introMessage = [
10340:       "من فضلك استخدم نموذج الحجز السريع حتى نقدر نثبت لك الموعد المناسب.",
10341:       "",
10342:       "Please use the quick booking form so we can confirm the best available appointment for you."
10343:     ].join("\n");
10344: 
10345:     const replyLanguage = getConversationLanguage(to);
10346:     const localizedIntroMessage = cleanLocalizedReplyBody(introMessage, replyLanguage);
10347:     const introResult = await sendWhatsAppMessage(to, localizedIntroMessage, phoneNumberId, { replyLanguage, skipAutoLanguage: true });
10348: 
10349:     if (introResult?.error) {
10350:       return res.status(500).json({
10351:         ok: false,
10352:         step: "intro_message",
10353:         error: introResult.error?.message || "Intro message send failed",
10354:         result: introResult
10355:       });
10356:     }
10357: 
10358:     addInboxMessage(
10359:       to,
10360:       "staff",
10361:       localizedIntroMessage,
10362:       "Human Reply",
10363:       phoneNumberId,
10364:       {
10365:         customerName,
10366:         messageType: "Manual Booking Flow Intro"
10367:       }
10368:     );
10369: 
10370:     const flowSendResult = await sendWhatsAppFlowMessage(to, phoneNumberId, {
10371:       branch: lineConfig.branch,
10372:       customerName,
10373:       flowType,
10374:       requestType,
10375:       replyLanguage
10376:     });
10377: 
10378:     if (!flowSendResult.ok) {
10379:       return res.status(500).json({
10380:         ok: false,
10381:         step: "booking_flow",
10382:         error: "Booking Flow send failed",
10383:         result: flowSendResult
10384:       });
10385:     }
10386: 
10387:     setConversationStatus(to, status);
10388: 
10389:     await saveConversationStateToGoogleSheetFromServer({
10390:       phone: to,
10391:       phoneNumberId,
10392:       branch: lineConfig.branch,
10393:       status,
10394:       assignee: getBranchTeamAssignee(lineConfig.branch),
10395:       tags: ["Booking", requestType, "Manual Flow Link"],
10396:       updatedBy: "Manual Send Booking Flow Link"
10397:     });
10398: 
10399:     addInboxMessage(
10400:       to,
10401:       "bot",
10402:       `${requestType} Flow sent manually`,
10403:       status,
10404:       phoneNumberId,
10405:       {
10406:         customerName,
10407:         messageType: "Manual Booking Flow Sent"
10408:       }
10409:     );
10410: 
10411:     return res.json({
10412:       ok: true,
10413:       to,
10414:       branch: lineConfig.branch,
10415:       phoneNumberId,
10416:       flowType,
10417:       requestType,
10418:       status,
10419:       result: flowSendResult
10420:     });
10421:   } catch (error) {
10422:     console.error("Manual booking Flow send failed:");
10423:     console.error(error);
10424:     return res.status(500).json({
10425:       ok: false,
10426:       error: "Manual booking Flow send failed"
10427:     });
10428:   }
10429: });
10430: 
10431: app.post("/api/conversation-state", protectInbox, async (req, res) => {
10432:   try {
10433:     const sheetUrl = process.env.SHEET_WEBHOOK_URL;
10434: 
10435:     if (!sheetUrl) {
10436:       return res.status(500).json({ ok: false, error: "SHEET_WEBHOOK_URL is missing" });
10437:     }
10438: 
10439:     const payload = {
10440:       action: "saveConversationState",
10441:       phone: (req.body?.phone || "").toString().trim(),
10442:       phoneNumberId: (req.body?.phoneNumberId || "").toString().trim(),
10443:       branch: (req.body?.branch || "").toString().trim(),
10444:       conversation_status: (req.body?.conversation_status || req.body?.status || "").toString().trim(),
10445:       assigned_to: (req.body?.assigned_to || req.body?.assignedTo || "").toString().trim(),
10446:       tags: Array.isArray(req.body?.tags) ? req.body.tags : (req.body?.tags || ""),
10447:       last_updated_by: (req.body?.last_updated_by || "Team Inbox").toString().trim()
10448:     };
10449: 
10450:     if (!payload.phone || !payload.phoneNumberId) {
10451:       return res.status(400).json({ ok: false, error: "Missing phone or phoneNumberId" });
10452:     }
10453: 
10454:     if (!isInboxRequestAllowedForLine(req, payload.phoneNumberId, payload.branch)) {
10455:       return res.status(403).json({ ok: false, error: "This inbox user cannot update this branch" });
10456:     }
10457: 
10458:     const response = await fetch(sheetUrl, {
10459:       method: "POST",
10460:       headers: { "Content-Type": "application/json" },
10461:       body: JSON.stringify(payload)
10462:     });
10463: 
10464:     const text = await response.text();
10465:     let result;
10466: 
10467:     try {
10468:       result = JSON.parse(text);
10469:     } catch (error) {
10470:       result = { ok: false, error: text || "Invalid Apps Script response" };
10471:     }
10472: 
10473:     if (!response.ok || !result.ok) {
10474:       return res.status(response.ok ? 500 : response.status).json(result);
10475:     }
10476: 
10477:     return res.json(result);
10478:   } catch (error) {
10479:     console.error("Conversation state save failed:");
10480:     console.error(error);
10481:     return res.status(500).json({ ok: false, error: "Conversation state save failed" });
10482:   }
10483: });
10484: 
10485: app.post("/api/send", protectInbox, async (req, res) => {
10486:   try {
10487:     const to = (req.body?.to || "").toString().trim();
10488:     const body = (req.body?.body || "").toString().trim();
10489: 
10490:     if (!to || !body) {
10491:       return res.status(400).json({
```

## Source lines 10529-10641
```javascript
10529:         method: "POST",
10530:         body: {
10531:           ...req.body,
10532:           to,
10533:           body,
10534:           phoneNumberId
10535:         }
10536:       });
10537: 
10538:       return res.status(
10539:         remoteResult.status || (remoteResult.ok ? 200 : 502)
10540:       ).json(remoteResult.data || {
10541:         ok: false,
10542:         error: "Dubai/Abu Dhabi service request failed"
10543:       });
10544:     }
10545: 
10546:     conversationPhoneNumberId[to] = phoneNumberId;
10547: 
10548:     const staffSendGuard = await blockStaffSendIfNeeded({
10549:       to,
10550:       phoneNumberId,
10551:       originalBody: body
10552:     });
10553: 
10554:     if (!staffSendGuard.ok) {
10555:       return res.status(staffSendGuard.statusCode || 409).json(staffSendGuard.response);
10556:     }
10557: 
10558:     const sendResult = await sendWhatsAppMessage(to, body, phoneNumberId);
10559:     const sendError = getWhatsAppApiError(sendResult);
10560: 
10561:     if (sendError) {
10562:       const failureBody = buildStaffSendFailureLogBody(body, sendResult);
10563: 
10564:       addInboxMessage(to, "staff", failureBody, "Failed / Not delivered", phoneNumberId, {
10565:         messageType: "Failed / Not delivered",
10566:         statusOverride: "Failed / Not delivered"
10567:       });
10568: 
10569:       return res.status(isWhatsAppOutside24HourWindowError(sendError) ? 409 : 500).json({
10570:         ok: false,
10571:         status: "Failed / Not delivered",
10572:         error: getStaffSendFailureResponseMessage(sendResult),
10573:         result: sendResult
10574:       });
10575:     }
10576: 
10577:     setConversationStatus(to, "Human Reply");
10578:     const sentMessage = addInboxMessage(to, "staff", body, "Human Reply - Sent", phoneNumberId, {
10579:       messageType: "Human Reply - Sent",
10580:       statusOverride: "Human Reply - Sent"
10581:     });
10582: 
10583:     // V31.5.8.60.3.9.51 - do not delay staff send response on conversation-state Sheet save.
10584:     // The actual WhatsApp send already succeeded and the message log has been queued.
10585:     // Conversation state is saved in the background so the Team Inbox can refresh quickly.
10586:     saveConversationStateToGoogleSheetFromServer({
10587:       phone: to,
10588:       phoneNumberId,
10589:       branch: getLineConfig(phoneNumberId).branch,
10590:       status: "Human Reply",
10591:       assignee: getBranchTeamAssignee(getLineConfig(phoneNumberId).branch),
10592:       tags: ["Human Support", "Bot Paused"],
10593:       updatedBy: "Team Inbox Human Reply"
10594:     }).catch((error) => {
10595:       console.log("Conversation state background save failed after staff reply:");
10596:       console.log(error);
10597:     });
10598: 
10599:     return res.json({
10600:       ok: true,
10601:       status: "sent_to_whatsapp",
10602:       result: sendResult,
10603:       sentMessage
10604:     });
10605:   } catch (error) {
10606:     console.error("Inbox send failed:");
10607:     console.error(error);
10608:     return res.status(500).json({
10609:       ok: false,
10610:       error: "Send failed"
10611:     });
10612:   }
10613: });
10614: 
10615: 
10616: 
10617: 
10618: function buildInlineImageMessageBody(mediaId, filename, caption) {
10619:   const payload = {
10620:     mediaId: (mediaId || "").toString().trim(),
10621:     filename: (filename || "iconic-image.jpg").toString().trim(),
10622:     caption: (caption || "").toString().trim()
10623:   };
10624: 
10625:   return "[[ICONIC_INLINE_IMAGE]] " + JSON.stringify(payload);
10626: }
10627: 
10628: function buildInlineAudioMessageBody(mediaId, filename) {
10629:   const payload = {
10630:     mediaId: (mediaId || "").toString().trim(),
10631:     filename: (filename || "iconic-voice-note.ogg").toString().trim()
10632:   };
10633: 
10634:   return "[[ICONIC_INLINE_AUDIO]] " + JSON.stringify(payload);
10635: }
10636: 
10637: function buildIncomingCustomerImageBody(message) {
10638:   const image = message?.image || {};
10639:   const mediaId = (image.id || "").toString().trim();
10640: 
10641:   if (!mediaId) {
```

## Source lines 10708-10828
```javascript
10708:     }
10709: 
10710:     if (isCore0204ProxyConfigured()) {
10711:       const remoteResult = await requestCore0204Service("/api/send-image", {
10712:         method: "POST",
10713:         body: {
10714:           ...req.body,
10715:           to,
10716:           phoneNumberId
10717:         }
10718:       });
10719: 
10720:       return res.status(
10721:         remoteResult.status || (remoteResult.ok ? 200 : 502)
10722:       ).json(remoteResult.data || {
10723:         ok: false,
10724:         error: "Dubai/Abu Dhabi image request failed"
10725:       });
10726:     }
10727: 
10728:     conversationPhoneNumberId[to] = phoneNumberId;
10729: 
10730:     const staffSendGuard = await blockStaffSendIfNeeded({
10731:       to,
10732:       phoneNumberId,
10733:       originalBody: `Image message: ${filename}`
10734:     });
10735: 
10736:     if (!staffSendGuard.ok) {
10737:       return res.status(staffSendGuard.statusCode || 409).json(staffSendGuard.response);
10738:     }
10739: 
10740:     const sendResult = await sendWhatsAppImageMessage(to, imageDataUrl, caption, filename, phoneNumberId);
10741: 
10742:     if (!sendResult.ok) {
10743:       addInboxMessage(to, "staff", buildStaffSendFailureLogBody(`Image message: ${filename}`, sendResult), "Failed / Not delivered", phoneNumberId, {
10744:         messageType: "Image Failed / Not delivered",
10745:         statusOverride: "Failed / Not delivered"
10746:       });
10747: 
10748:       return res.status(sendResult.status || 500).json({
10749:         ok: false,
10750:         error: getStaffSendFailureResponseMessage(sendResult),
10751:         result: sendResult.result
10752:       });
10753:     }
10754: 
10755:     setConversationStatus(to, "Human Reply");
10756: 
10757:     const safeImageFilename = sanitizeMediaFilename(
10758:       filename,
10759:       (req.body?.mimeType || "image/jpeg").toString().trim()
10760:     );
10761: 
10762:     addInboxMessage(
10763:       to,
10764:       "staff",
10765:       buildInlineImageMessageBody(sendResult.mediaId, safeImageFilename, caption),
10766:       "Human Reply",
10767:       phoneNumberId,
10768:       {
10769:         messageType: "Human Image Reply - Sent",
10770:         statusOverride: "Human Image Reply - Sent"
10771:       }
10772:     );
10773:     await saveConversationStateToGoogleSheetFromServer({
10774:       phone: to,
10775:       phoneNumberId,
10776:       branch: getLineConfig(phoneNumberId).branch,
10777:       status: "Human Reply",
10778:       assignee: getBranchTeamAssignee(getLineConfig(phoneNumberId).branch),
10779:       tags: ["Human Support", "Bot Paused"],
10780:       updatedBy: "Team Inbox Human Image Reply"
10781:     });
10782: 
10783:     return res.json({ ok: true, mediaId: sendResult.mediaId, result: sendResult.result });
10784:   } catch (error) {
10785:     console.error("Inbox image send failed:");
10786:     console.error(error);
10787:     return res.status(500).json({
10788:       ok: false,
10789:       error: "Image send failed"
10790:     });
10791:   }
10792: });
10793: 
10794: 
10795: app.post("/api/send-audio", protectInbox, async (req, res) => {
10796:   try {
10797:     const to = (req.body?.to || "").toString().trim();
10798:     const audioDataUrl = (req.body?.audioDataUrl || "").toString().trim();
10799:     const filename = (req.body?.filename || "iconic-voice-note.ogg").toString().trim();
10800: 
10801:     if (!to || !audioDataUrl) {
10802:       return res.status(400).json({
10803:         ok: false,
10804:         error: "Missing customer phone or voice note"
10805:       });
10806:     }
10807: 
10808:     const phoneNumberId = normalizePhoneNumberId(
10809:       (req.body?.phoneNumberId || "").toString().trim() ||
10810:       conversationPhoneNumberId[to] ||
10811:       DUBAI_PHONE_NUMBER_ID
10812:     );
10813: 
10814:     if (!isInboxRequestAllowedForLine(req, phoneNumberId)) {
10815:       return res.status(403).json({ ok: false, error: "This inbox user cannot send from this branch" });
10816:     }
10817: 
10818:     if (isAi303Line(phoneNumberId)) {
10819:       const remoteResult = await requestAi303Service("/api/send-audio", {
10820:         method: "POST",
10821:         body: {
10822:           ...req.body,
10823:           to,
10824:           phoneNumberId: AI_303_PHONE_NUMBER_ID
10825:         }
10826:       });
10827: 
10828:       if (remoteResult.ok) {
```

## Source lines 10836-10956
```javascript
10836:     }
10837: 
10838:     if (isCore0204ProxyConfigured()) {
10839:       const remoteResult = await requestCore0204Service("/api/send-audio", {
10840:         method: "POST",
10841:         body: {
10842:           ...req.body,
10843:           to,
10844:           phoneNumberId
10845:         }
10846:       });
10847: 
10848:       return res.status(
10849:         remoteResult.status || (remoteResult.ok ? 200 : 502)
10850:       ).json(remoteResult.data || {
10851:         ok: false,
10852:         error: "Dubai/Abu Dhabi audio request failed"
10853:       });
10854:     }
10855: 
10856:     conversationPhoneNumberId[to] = phoneNumberId;
10857: 
10858:     const staffSendGuard = await blockStaffSendIfNeeded({
10859:       to,
10860:       phoneNumberId,
10861:       originalBody: `Voice message: ${filename}`
10862:     });
10863: 
10864:     if (!staffSendGuard.ok) {
10865:       return res.status(staffSendGuard.statusCode || 409).json(staffSendGuard.response);
10866:     }
10867: 
10868:     const sendResult = await sendWhatsAppAudioMessage(to, audioDataUrl, filename, phoneNumberId);
10869: 
10870:     if (!sendResult.ok) {
10871:       addInboxMessage(to, "staff", buildStaffSendFailureLogBody(`Voice message: ${filename}`, sendResult), "Failed / Not delivered", phoneNumberId, {
10872:         messageType: "Voice Failed / Not delivered",
10873:         statusOverride: "Failed / Not delivered"
10874:       });
10875: 
10876:       return res.status(sendResult.status || 500).json({
10877:         ok: false,
10878:         error: getStaffSendFailureResponseMessage(sendResult),
10879:         result: sendResult.result
10880:       });
10881:     }
10882: 
10883:     setConversationStatus(to, "Human Reply");
10884: 
10885:     const safeAudioFilename = sanitizeMediaFilename(
10886:       filename,
10887:       (req.body?.mimeType || "audio/ogg").toString().trim()
10888:     );
10889: 
10890:     addInboxMessage(
10891:       to,
10892:       "staff",
10893:       buildInlineAudioMessageBody(sendResult.mediaId, safeAudioFilename),
10894:       "Human Reply",
10895:       phoneNumberId,
10896:       {
10897:         messageType: "Human Voice Reply - Sent",
10898:         statusOverride: "Human Voice Reply - Sent"
10899:       }
10900:     );
10901:     await saveConversationStateToGoogleSheetFromServer({
10902:       phone: to,
10903:       phoneNumberId,
10904:       branch: getLineConfig(phoneNumberId).branch,
10905:       status: "Human Reply",
10906:       assignee: getBranchTeamAssignee(getLineConfig(phoneNumberId).branch),
10907:       tags: ["Human Support", "Bot Paused"],
10908:       updatedBy: "Team Inbox Human Voice Reply"
10909:     });
10910: 
10911:     return res.json({ ok: true, mediaId: sendResult.mediaId, result: sendResult.result });
10912:   } catch (error) {
10913:     console.error("Inbox voice send failed:");
10914:     console.error(error);
10915:     return res.status(500).json({
10916:       ok: false,
10917:       error: "Voice send failed"
10918:     });
10919:   }
10920: });
10921: 
10922: 
10923: app.get("/api/media/:mediaId", protectInbox, async (req, res) => {
10924:   try {
10925:     const mediaId = (req.params?.mediaId || "").toString().trim().replace(/[^a-zA-Z0-9_-]/g, "");
10926:     const phoneNumberId = normalizePhoneNumberId(
10927:       (req.query?.phoneNumberId || "").toString().trim()
10928:     );
10929: 
10930:     if (!mediaId) {
10931:       return res.status(400).send("Missing media id");
10932:     }
10933: 
10934:     if (isAi303Line(phoneNumberId)) {
10935:       const remoteResult = await requestAi303Service(
10936:         `/api/media/${encodeURIComponent(mediaId)}`,
10937:         { expectBinary: true }
10938:       );
10939: 
10940:       if (!remoteResult.ok) {
10941:         return res.status(remoteResult.status || 502).send("Could not load 303 media");
10942:       }
10943: 
10944:       res.setHeader("Content-Type", remoteResult.contentType || "application/octet-stream");
10945:       res.setHeader("Cache-Control", "private, max-age=3600");
10946:       return res.send(remoteResult.buffer);
10947:     }
10948: 
10949:     if (isCore0204ProxyConfigured()) {
10950:       const query = phoneNumberId
10951:         ? `?phoneNumberId=${encodeURIComponent(phoneNumberId)}`
10952:         : "";
10953:       const remoteResult = await requestCore0204Service(
10954:         `/api/media/${encodeURIComponent(mediaId)}${query}`,
10955:         { expectBinary: true }
10956:       );
```

## Source lines 40358-40501
```javascript
40358:     // 303 has its own override webhook and isolated Render service.
40359:     // A duplicate/default webhook event must never be processed by the 04/02 backend.
40360:     if (isAi303Line(webhookPhoneNumberId, webhookDisplayPhoneNumber)) {
40361:       console.log("[Unified 303] duplicate 303 webhook ignored on 04/02 backend", {
40362:         phoneNumberId: webhookPhoneNumberId,
40363:         displayPhoneNumber: webhookDisplayPhoneNumber
40364:       });
40365:       return res.sendStatus(200);
40366:     }
40367: 
40368:     // 811 Dubai observer-only bridge.
40369:     // Capture inbound customer messages for Google Sheet / Team Inbox logging,
40370:     // but never execute bot replies, Flows, staff notifications, reminders,
40371:     // or status-event automation for this line.
40372:     const is811ObserverWebhook =
40373:       webhookPhoneNumberId === "1058100107394390" ||
40374:       normalizePhoneDigits(webhookDisplayPhoneNumber).endsWith("971503424811") ||
40375:       normalizePhoneDigits(webhookDisplayPhoneNumber).endsWith("503424811");
40376: 
40377:     if (is811ObserverWebhook) {
40378:       if (!message) {
40379:         console.log("[811 Observer] non-message webhook acknowledged without automation", {
40380:           phoneNumberId: webhookPhoneNumberId,
40381:           displayPhoneNumber: webhookDisplayPhoneNumber
40382:         });
40383:         return res.sendStatus(200);
40384:       }
40385: 
40386:       const observerFrom = message.from;
40387:       const observerPhoneNumberId = webhookPhoneNumberId || "1058100107394390";
40388:       const observerProfileName = getWhatsAppCustomerName(value?.contacts?.[0]);
40389:       const observerText = getIncomingMessageText(message);
40390: 
40391:       conversationPhoneNumberId[observerFrom] = observerPhoneNumberId;
40392: 
40393:       addInboxMessage(
40394:         observerFrom,
40395:         "customer",
40396:         buildPausedAutomationInboxBody(message, observerProfileName, observerText),
40397:         "811 Observer",
40398:         observerPhoneNumberId,
40399:         {
40400:           customerName: observerProfileName,
40401:           messageType: "Customer Message - 811 Observer",
40402:           statusOverride: "811 Observer"
40403:         }
40404:       );
40405: 
40406:       console.log("[811 Observer] inbound captured; no automation executed", {
40407:         from: observerFrom,
40408:         phoneNumberId: observerPhoneNumberId,
40409:         displayPhoneNumber: webhookDisplayPhoneNumber,
40410:         messageType: message?.type || ""
40411:       });
40412: 
40413:       return res.sendStatus(200);
40414:     }
40415: 
40416:     // Status webhooks do not include a customer message. They can still report
40417:     // that a staff text notification failed later with 131047, after Graph API
40418:     // initially accepted it. In that case, send the approved staff template.
40419:     if (!message) {
40420:       await handleWhatsAppStatusUpdates(value);
40421:       return res.sendStatus(200);
40422:     }
40423: 
40424:     const from = message.from;
40425:     const incomingPhoneNumberId = getIncomingPhoneNumberId(value);
40426:     const lineConfig = getLineConfig(incomingPhoneNumberId, value?.metadata?.display_phone_number || "");
40427:     const profileName = getWhatsAppCustomerName(value?.contacts?.[0]);
40428:     const suppressedInternalText = getIncomingMessageText(message);
40429:     const whatsappAutomationPausedForLine = shouldPauseWhatsAppAutomationForLine(
40430:       incomingPhoneNumberId,
40431:       value?.metadata?.display_phone_number || ""
40432:     );
40433: 
40434:     if (whatsappAutomationPausedForLine) {
40435:       conversationPhoneNumberId[from] = incomingPhoneNumberId;
40436: 
40437:       console.log("[WhatsApp Automation Paused] inbound message acknowledged without auto reply", {
40438:         from,
40439:         branch: lineConfig.branch,
40440:         phoneNumberId: incomingPhoneNumberId,
40441:         displayPhoneNumber: value?.metadata?.display_phone_number || "",
40442:         messageType: message?.type || "",
40443:         text: suppressedInternalText || ""
40444:       });
40445: 
40446:       addInboxMessage(
40447:         from,
40448:         "customer",
40449:         buildPausedAutomationInboxBody(message, profileName, suppressedInternalText),
40450:         "Automation Paused",
40451:         incomingPhoneNumberId,
40452:         {
40453:           customerName: profileName,
40454:           messageType: "Customer Message - Automation Paused",
40455:           statusOverride: "Automation Paused"
40456:         }
40457:       );
40458: 
40459:       return res.sendStatus(200);
40460:     }
40461: 
40462:     // V31.5.8.60.3.7.11:
40463:     // Internal staff/test numbers must be suppressed from Team Inbox live notifications,
40464:     // but they must NOT be skipped from the bot workflow. This lets the owner test
40465:     // the bot normally from a staff/test phone while avoiding repeated inbox alerts.
40466:     const isInternalStaffOrTestNumber = isSuppressedCustomerNotificationNumber(from);
40467: 
40468:     if (isInternalStaffOrTestNumber) {
40469:       console.log("[Internal Staff/Test Number] inbound allowed for bot workflow; inbox notification suppressed", {
40470:         from,
40471:         incomingPhoneNumberId,
40472:         branch: lineConfig.branch,
40473:         text: suppressedInternalText
40474:       });
40475:     }
40476: 
40477:     await showBotTypingBeforeReply({
40478:       to: from,
40479:       incomingMessageId: message.id || "",
40480:       phoneNumberId: incomingPhoneNumberId,
40481:       fromInternalNumber: isInternalStaffOrTestNumber
40482:     });
40483: 
40484:       // V60.2.4 Services / Results / How it works premium route
40485:       const iconicServicesRawText = (
40486:         message?.interactive?.button_reply?.id ||
40487:         message?.interactive?.button_reply?.title ||
40488:         message?.interactive?.list_reply?.id ||
40489:         message?.interactive?.list_reply?.title ||
40490:         message?.button?.payload ||
40491:         message?.button?.text ||
40492:         message?.text?.body ||
40493:         ""
40494:       ).toString().trim();
40495:       const iconicServicesText = normalizeText(iconicServicesRawText);
40496:       const iconicReplyLanguage = getMessageReplyLanguage(from, message, iconicServicesRawText);
40497:       const iconicReplyOptions = {
40498:         headerImageUrl: BOT_HEADER_IMAGE_URL,
40499:         replyLanguage: iconicReplyLanguage
40500:       };
40501:       const iconicVideoReplyOptions = {
```

## Source lines 40503-41450
```javascript
40503:         replyLanguage: iconicReplyLanguage
40504:       };
40505:       const iconicLocalizedServicesBody = buildServicesMenuBody(profileName, iconicReplyLanguage);
40506:       const iconicLocalizedResultsBody = buildResultsFollowupBody(profileName, iconicReplyLanguage);
40507:       const iconicLocalizedDetailsBody = buildHowItWorksBody(profileName, iconicReplyLanguage);
40508:       const iconicIsServicesRoute = iconicServicesText === "services_menu" ||
40509:         iconicServicesText === "servicesmenu" ||
40510:         iconicServicesText === "services" ||
40511:         iconicServicesText === "خدمات" ||
40512:         iconicServicesText === "الخدمات" ||
40513:         iconicServicesText === "خدماتنا";
40514:       const iconicIsResultsRoute = !isPriceIntentText(iconicServicesText) &&
40515:         !isBookingIntentText(iconicServicesText) &&
40516:         !isLocationIntentText(iconicServicesText) &&
40517:         !isCallIntentText(iconicServicesText) &&
40518:         (isAutoVideoRequestText(iconicServicesText) || iconicServicesText === "results" || iconicServicesText.includes("result") || iconicServicesText.includes("نتائج"));
40519:       const iconicIsHowItWorksRoute = iconicServicesText === "how_it_works" || iconicServicesText === "howitworks" ||
40520:         hasAnyIntentPhrase(iconicServicesText, ["details", "how it works", "how does it work", "process", "steps", "تفاصيل", "كيف", "كيف يعمل", "طريقة", "الطريقة"]);
40521: 
40522:       if (iconicIsServicesRoute) {
40523:         logCustomerActionForInbox({
40524:           from,
40525:           message,
40526:           profileName,
40527:           rawText: iconicServicesRawText,
40528:           fallbackAction: "Services | خدماتنا",
40529:           status: "Services Menu",
40530:           phoneNumberId: incomingPhoneNumberId,
40531:           messageType: "Customer Services Menu Request"
40532:         });
40533:         await sendWhatsAppButtonMessage(from, iconicLocalizedServicesBody, [
40534:           { id: "results", title: "Results | نتائج" },
40535:           { id: "location", title: "Location | موقعنا" },
40536:           { id: "how_it_works", title: "Details | التفاصيل" }
40537:         ], incomingPhoneNumberId, iconicReplyOptions);
40538:         addInboxMessage(from, "bot", iconicLocalizedServicesBody, "Services Menu", incomingPhoneNumberId, { customerName: profileName, messageType: "Services Menu" });
40539:         return res.sendStatus(200);
40540:       }
40541: 
40542:       if (iconicIsResultsRoute) {
40543:         logCustomerActionForInbox({
40544:           from,
40545:           message,
40546:           profileName,
40547:           rawText: iconicServicesRawText,
40548:           fallbackAction: "Results | نتائج",
40549:           status: "Results Requested",
40550:           phoneNumberId: incomingPhoneNumberId,
40551:           messageType: "Customer Results Request"
40552:         });
40553:         const resultsVideoUrl = RESULTS_VIDEO_URL || getAutoReplyVideoUrl(req);
40554:         await sendWhatsAppVideoHeaderButtonMessage(from, iconicLocalizedResultsBody, [
40555:           { id: "how_it_works", title: "Details | التفاصيل" },
40556:           { id: "booking_menu", title: "Booking | حجز" },
40557:           { id: "talk_to_team", title: "Team | فريقنا" }
40558:         ], resultsVideoUrl, incomingPhoneNumberId, {
40559:           headerImageUrl: BOT_HEADER_IMAGE_URL,
40560:           filename: "iconic-results-video.mp4",
40561:           replyLanguage: iconicReplyLanguage
40562:         });
40563:         addInboxMessage(from, "bot", iconicLocalizedResultsBody, "Results Video Buttons", incomingPhoneNumberId, { customerName: profileName, messageType: "Results Video Buttons" });
40564:         return res.sendStatus(200);
40565:       }
40566: 
40567:       if (iconicIsHowItWorksRoute) {
40568:         logCustomerActionForInbox({
40569:           from,
40570:           message,
40571:           profileName,
40572:           rawText: iconicServicesRawText,
40573:           fallbackAction: "Details | التفاصيل",
40574:           status: "Details Requested",
40575:           phoneNumberId: incomingPhoneNumberId,
40576:           messageType: "Customer Details Request"
40577:         });
40578:         await sendWhatsAppVideoHeaderButtonMessage(from, iconicLocalizedDetailsBody, [
40579:           { id: "booking_menu", title: "Booking | حجز" },
40580:           { id: "results", title: "Results | نتائج" },
40581:           { id: "talk_to_team", title: "Team | فريقنا" }
40582:         ], DETAILS_VIDEO_URL, incomingPhoneNumberId, {
40583:           headerImageUrl: BOT_HEADER_IMAGE_URL,
40584:           filename: "iconic-details-video-v60310.mp4",
40585:           replyLanguage: iconicReplyLanguage
40586:         });
40587:         addInboxMessage(from, "bot", iconicLocalizedDetailsBody, "Details Video Buttons", incomingPhoneNumberId, { customerName: profileName, messageType: "Details Video Buttons" });
40588:         return res.sendStatus(200);
40589:       }
40590: 
40591:     conversationPhoneNumberId[from] = incomingPhoneNumberId;
40592: 
40593:     console.log("Incoming message received on:", lineConfig.branch, incomingPhoneNumberId, value?.metadata?.display_phone_number || "");
40594: 
40595:     const originalText = getIncomingMessageText(message);
40596:     const text = normalizeText(originalText);
40597:     const replyLanguage = getMessageReplyLanguage(from, message, originalText || text);
40598: 
40599:     const staffActionHandled = await handleStaffBookingAction({
40600:       from,
40601:       message,
40602:       originalText,
40603:       incomingPhoneNumberId
40604:     });
40605: 
40606:     if (staffActionHandled) {
40607:       return res.sendStatus(200);
40608:     }
40609: 
40610:     const optEventDate = getDubaiTimestamp();
40611:     const incomingActionId = getIncomingInteractiveActionId(message);
40612:     const isOptInMessage = isOptInText(text) || isOptInText(incomingActionId);
40613:     const isOptOutMessage = isOptOutText(text) || isOptOutText(incomingActionId);
40614:     const isReminderDeclineMessage = await shouldTreatAsReminderOptInDecline({
40615:       text,
40616:       actionId: incomingActionId,
40617:       from,
40618:       phoneNumberId: incomingPhoneNumberId
40619:     });
40620: 
40621:     if (isResumeBotText(originalText || text)) {
40622:       setConversationStatus(from, "Bot Active");
40623:       await saveConversationStateToGoogleSheetFromServer({
40624:         phone: from,
40625:         phoneNumberId: incomingPhoneNumberId,
40626:         branch: lineConfig.branch,
40627:         status: "Bot Active",
40628:         assignee: getBranchTeamAssignee(lineConfig.branch),
40629:         tags: ["Bot Active"],
40630:         updatedBy: "Resume Bot Command"
40631:       });
40632:       const resumeBody = "تم تشغيل البوت مرة أخرى ✅\n\n------------------------------\n\nBot has been resumed ✅";
40633:       await sendWhatsAppMessage(from, resumeBody, incomingPhoneNumberId, { autoLocalize: true, replyLanguage });
40634:       addInboxMessage(from, "bot", resumeBody, "Bot Active", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Resumed" });
40635:       return res.sendStatus(200);
40636:     }
40637: 
40638:     if (isAppointmentReminderYesText(originalText || text)) {
40639:       const currentAppointmentStatus = conversationStatus[from] || await getSavedConversationStatusForPhone(from, incomingPhoneNumberId);
40640: 
40641:       if (!isConfirmedAppointmentStatus(currentAppointmentStatus)) {
40642:         const notConfirmedBody = buildAppointmentReminderNotConfirmedBody(profileName, replyLanguage);
40643:         await sendWhatsAppMessage(from, notConfirmedBody, incomingPhoneNumberId, { autoLocalize: true, replyLanguage });
40644:         addInboxMessage(from, "bot", notConfirmedBody, "Booking Request", incomingPhoneNumberId, { customerName: profileName, messageType: "Appointment Reminder Blocked - Pending Confirmation" });
40645:         return res.sendStatus(200);
40646:       }
40647: 
40648:       await saveConversationStateToGoogleSheetFromServer({
40649:         phone: from,
40650:         phoneNumberId: incomingPhoneNumberId,
40651:         branch: lineConfig.branch,
40652:         status: "Appointment Reminder Active",
40653:         assignee: getBranchTeamAssignee(lineConfig.branch),
40654:         tags: ["Appointment Reminder", "Opt-in", "1 Hour Before", "Confirmed Appointment"],
40655:         updatedBy: "Appointment Reminder Button After Confirm"
40656:       });
40657: 
40658:       const reminderYesBody = buildAppointmentReminderActiveBody(profileName, replyLanguage);
40659:       await sendWhatsAppMessage(from, reminderYesBody, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
40660:       addInboxMessage(from, "bot", reminderYesBody, "Appointment Reminder Active", incomingPhoneNumberId, { customerName: profileName, messageType: "Appointment Reminder Active" });
40661:       return res.sendStatus(200);
40662:     }
40663: 
40664:     if (isAppointmentReminderNoText(originalText || text)) {
40665:       const currentAppointmentStatus = conversationStatus[from] || await getSavedConversationStatusForPhone(from, incomingPhoneNumberId);
40666: 
40667:       if (!isConfirmedAppointmentStatus(currentAppointmentStatus)) {
40668:         const notConfirmedBody = buildAppointmentReminderNotConfirmedBody(profileName, replyLanguage);
40669:         await sendWhatsAppMessage(from, notConfirmedBody, incomingPhoneNumberId, { autoLocalize: true, replyLanguage });
40670:         addInboxMessage(from, "bot", notConfirmedBody, "Booking Request", incomingPhoneNumberId, { customerName: profileName, messageType: "Appointment Reminder Declined Blocked - Pending Confirmation" });
40671:         return res.sendStatus(200);
40672:       }
40673: 
40674:       await saveConversationStateToGoogleSheetFromServer({
40675:         phone: from,
40676:         phoneNumberId: incomingPhoneNumberId,
40677:         branch: lineConfig.branch,
40678:         status: "Appointment Reminder Declined",
40679:         assignee: getBranchTeamAssignee(lineConfig.branch),
40680:         tags: ["Appointment Reminder", "Declined", "Confirmed Appointment"],
40681:         updatedBy: "Appointment Reminder Button After Confirm"
40682:       });
40683: 
40684:       const reminderNoBody = buildAppointmentReminderDeclinedBody(profileName, replyLanguage);
40685:       await sendWhatsAppMessage(from, reminderNoBody, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
40686:       addInboxMessage(from, "bot", reminderNoBody, "Appointment Reminder Declined", incomingPhoneNumberId, { customerName: profileName, messageType: "Appointment Reminder Declined" });
40687:       return res.sendStatus(200);
40688:     }
40689: 
40690:     if (!isOptInMessage && !isOptOutMessage && !isReminderDeclineMessage) {
40691:       const pausedStatus = await getBotPausedStatusForConversation(from, incomingPhoneNumberId);
40692: 
40693:       if (pausedStatus) {
40694:         const pausedCustomerBody = buildPausedCustomerMessageBody(message, profileName, originalText || text);
40695: 
40696:         if (pausedCustomerBody && pausedCustomerBody.toString().trim()) {
40697:           addInboxMessage(
40698:             from,
40699:             "customer",
40700:             pausedCustomerBody,
40701:             pausedStatus,
40702:             incomingPhoneNumberId,
40703:             {
40704:               customerName: profileName,
40705:               messageType: "Customer Message - Bot Paused"
40706:             }
40707:           );
40708:         }
40709: 
40710:         console.log("Bot paused for customer:", from, pausedStatus);
40711:         return res.sendStatus(200);
40712:       }
40713:     }
40714: 
40715:     const autoIntentWorkflow = (
40716:       isOptInMessage ||
40717:       isOptOutMessage ||
40718:       isReminderDeclineMessage
40719:     ) ? null : getAutoIntentWorkflow(originalText || text);
40720: 
40721:     if (autoIntentWorkflow && autoIntentWorkflow.status) {
40722:       setConversationStatus(from, autoIntentWorkflow.status);
40723:       await saveConversationStateToGoogleSheetFromServer({
40724:         phone: from,
40725:         phoneNumberId: incomingPhoneNumberId,
40726:         branch: lineConfig.branch,
40727:         status: autoIntentWorkflow.status,
40728:         assignee: getBranchTeamAssignee(lineConfig.branch),
40729:         tags: autoIntentWorkflow.tags || [],
40730:         updatedBy: "Auto Intent Tags"
40731:       });
40732:     }
40733: 
40734:     if (isOptInMessage) {
40735:       setConversationStatus(from, "Opted In");
40736: 
40737:       addInboxMessage(
40738:         from,
40739:         "customer",
40740:         originalText,
40741:         "Opted In",
40742:         incomingPhoneNumberId,
40743:         {
40744:           customerName: profileName,
40745:           messageType: "Opt-in",
40746:           extraFields: {
40747:             opt_in: "yes",
40748:             opt_in_date: optEventDate,
40749:             opt_in_source: "Auto-reply WhatsApp - 20-day service follow-up reminder",
40750:             opt_out: "",
40751:             opt_out_date: ""
40752:           }
40753:         }
40754:       );
40755: 
40756:       const optInReply =
40757:         `${BUSINESS_NAME_SPACED} ✨\n\n` +
40758:         "تم حفظ موافقتك بنجاح ✅\n\n" +
40759:         "سنستخدم هذا الرقم فقط لإرسال تذكير / متابعة الخدمة كل 20 يوم تقريباً من Iconic Hair Care.\n\n" +
40760:         "لإيقاف التذكير في أي وقت، أرسل: STOP أو إيقاف\n\n" +
40761:         "------------------------------\n\n" +
40762:         `${BUSINESS_NAME_SPACED} ✨\n\n` +
40763:         "Your opt-in has been saved successfully ✅\n\n" +
40764:         "We will use this number only for 20-day service follow-up reminders from Iconic Hair Care.\n\n" +
40765:         "To stop reminders at any time, send: STOP";
40766: 
40767:       await sendWhatsAppMessage(from, optInReply, incomingPhoneNumberId, { autoLocalize: true, replyLanguage });
40768:       addInboxMessage(from, "bot", optInReply, "Opted In", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Reply" });
40769: 
40770:       return res.sendStatus(200);
40771:     }
40772: 
40773:     if (isOptOutMessage) {
40774:       setConversationStatus(from, "Opted Out");
40775: 
40776:       addInboxMessage(
40777:         from,
40778:         "customer",
40779:         originalText,
40780:         "Opted Out",
40781:         incomingPhoneNumberId,
40782:         {
40783:           customerName: profileName,
40784:           messageType: "Opt-out",
40785:           extraFields: {
40786:             opt_in: "no",
40787:             opt_in_date: "",
40788:             opt_in_source: "",
40789:             opt_out: "yes",
40790:             opt_out_date: optEventDate
40791:           }
40792:         }
40793:       );
40794: 
40795:       const optOutReply =
40796:         `${BUSINESS_NAME_SPACED} ✨\n\n` +
40797:         "تم إيقاف تذكير / متابعة الخدمة لهذا الرقم ✅\n\n" +
40798:         "------------------------------\n\n" +
40799:         `${BUSINESS_NAME_SPACED} ✨\n\n` +
40800:         "Service follow-up reminders have been stopped for this number ✅";
40801: 
40802:       await sendWhatsAppMessage(from, optOutReply, incomingPhoneNumberId, { autoLocalize: true, replyLanguage });
40803:       addInboxMessage(from, "bot", optOutReply, "Opted Out", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Reply" });
40804: 
40805:       return res.sendStatus(200);
40806:     }
40807: 
40808: 
40809:     if (isReminderDeclineMessage) {
40810:       setConversationStatus(from, "Reminder Declined");
40811: 
40812:       addInboxMessage(
40813:         from,
40814:         "customer",
40815:         originalText,
40816:         "Reminder Declined",
40817:         incomingPhoneNumberId,
40818:         {
40819:           customerName: profileName,
40820:           messageType: "Reminder Opt-in Declined",
40821:           extraFields: {
40822:             opt_in: "no",
40823:             opt_in_date: "",
40824:             opt_in_source: "Auto-reply WhatsApp - Reminder and Offers declined",
40825:             opt_out: "",
40826:             opt_out_date: ""
40827:           }
40828:         }
40829:       );
40830: 
40831:       const declineReply =
40832:         `${BUSINESS_NAME_SPACED} ✨\n\n` +
40833:         "تمام، لن ندخلك في تذكير / متابعة الخدمة الآن ✅\n\n" +
40834:         "إذا احتجت أي مساعدة، فريقنا جاهز للرد عليك.\n\n" +
40835:         "------------------------------\n\n" +
40836:         `${BUSINESS_NAME_SPACED} ✨\n\n` +
40837:         "No problem, we will not add you to service follow-up reminders now ✅\n\n" +
40838:         "If you need any help, our team is ready to assist you.";
40839: 
40840:       await sendWhatsAppMessage(from, declineReply, incomingPhoneNumberId, { autoLocalize: true, replyLanguage });
40841:       addInboxMessage(from, "bot", declineReply, "Reminder Declined", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Reply" });
40842: 
40843:       return res.sendStatus(200);
40844:     }
40845: 
40846:     const whatsappFlowHandled = await handleWhatsAppFlowBookingSubmit({
40847:       from,
40848:       message,
40849:       incomingPhoneNumberId,
40850:       lineConfig,
40851:       profileName,
40852:       displayPhoneNumber: value?.metadata?.display_phone_number || ""
40853:     });
40854: 
40855:     if (whatsappFlowHandled) {
40856:       return res.sendStatus(200);
40857:     }
40858: 
40859: 
40860:     const suggestedTimeReplyHandled = await handleCustomerSuggestedTimeReply({
40861:       from,
40862:       message,
40863:       originalText,
40864:       text,
40865:       incomingPhoneNumberId,
40866:       lineConfig,
40867:       profileName,
40868:       replyLanguage
40869:     });
40870: 
40871:     if (suggestedTimeReplyHandled) {
40872:       return res.sendStatus(200);
40873:     }
40874: 
40875:     // V31.5.8.60.3.9.34 - Abu Dhabi bot-cycle parity fix:
40876:     // Clear consultation booking requests must enter the chat-booking cycle
40877:     // before generic booking menus, real-intent helpers, or fallback replies.
40878:     // This keeps Abu Dhabi aligned with Dubai while preserving branch routing
40879:     // from the incoming WhatsApp line.
40880:     if (isDirectConsultationChatBookingText(originalText || text)) {
40881:       const directConsultationHandled = await handleSmartWhatsAppBooking({
40882:         from,
40883:         message,
40884:         originalText,
40885:         text,
40886:         incomingPhoneNumberId,
40887:         lineConfig,
40888:         profileName,
40889:         replyLanguage,
40890:         forceConsultationChatBooking: true
40891:       });
40892: 
40893:       if (directConsultationHandled) {
40894:         return res.sendStatus(200);
40895:       }
40896:     }
40897: 
40898:     const realCustomerIntentHandled = await handleRealCustomerIntentUpgrade({
40899:       from,
40900:       message,
40901:       originalText,
40902:       text,
40903:       incomingPhoneNumberId,
40904:       lineConfig,
40905:       profileName,
40906:       replyLanguage
40907:     });
40908: 
40909:     if (realCustomerIntentHandled) {
40910:       return res.sendStatus(200);
40911:     }
40912: 
40913:     const smartBookingHandled = await handleSmartWhatsAppBooking({
40914:       from,
40915:       message,
40916:       originalText,
40917:       text,
40918:       incomingPhoneNumberId,
40919:       lineConfig,
40920:       profileName,
40921:       replyLanguage
40922:     });
40923: 
40924:     if (smartBookingHandled) {
40925:       return res.sendStatus(200);
40926:     }
40927: 
40928:     if (isTalkToTeamText(originalText || text)) {
40929:       const teamActionText = getSmartCustomerActionText(message, originalText || text) || "Team | فريقنا";
40930:       const teamCustomerBody = buildCustomerActionBody(profileName, teamActionText);
40931: 
40932:       addInboxMessage(
40933:         from,
40934:         "customer",
40935:         teamCustomerBody,
40936:         "Talk to Team",
40937:         incomingPhoneNumberId,
40938:         {
40939:           customerName: profileName,
40940:           messageType: "Customer Team Handoff Request"
40941:         }
40942:       );
40943: 
40944:       setConversationStatus(from, "Talk to Team");
40945:       await saveConversationStateToGoogleSheetFromServer({
40946:         phone: from,
40947:         phoneNumberId: incomingPhoneNumberId,
40948:         branch: lineConfig.branch,
40949:         status: "Talk to Team",
40950:         assignee: getBranchTeamAssignee(lineConfig.branch),
40951:         tags: ["Human Support", "Bot Paused"],
40952:         updatedBy: "Customer Requested Team"
40953:       });
40954: 
40955:       const teamHandoffBody = buildTeamHandoffBody(profileName);
40956:       const localizedTeamHandoffBody = cleanLocalizedReplyBody(teamHandoffBody, replyLanguage);
40957:       await sendWhatsAppMessage(from, localizedTeamHandoffBody, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
40958:       addInboxMessage(
40959:         from,
40960:         "bot",
40961:         localizedTeamHandoffBody,
40962:         "Talk to Team",
40963:         incomingPhoneNumberId,
40964:         {
40965:           customerName: profileName,
40966:           messageType: "Team Handoff Final Bot Reply"
40967:         }
40968:       );
40969: 
40970:       return res.sendStatus(200);
40971:     }
40972: 
40973:     if (isBookServiceFlowText(originalText || text)) {
40974:       const serviceActionText = getSmartCustomerActionText(message, originalText || text) || "Book Service | سيرفس";
40975:       const serviceCustomerBody = buildCustomerActionBody(profileName, serviceActionText);
40976: 
40977:       addInboxMessage(
40978:         from,
40979:         "customer",
40980:         serviceCustomerBody,
40981:         "Service Appointment",
40982:         incomingPhoneNumberId,
40983:         {
40984:           customerName: profileName,
40985:           messageType: "Customer Service Booking Flow Request"
40986:         }
40987:       );
40988: 
40989:       setConversationStatus(from, "Service Flow - Opened");
40990:       await saveConversationStateToGoogleSheetFromServer({
40991:         phone: from,
40992:         phoneNumberId: incomingPhoneNumberId,
40993:         branch: lineConfig.branch,
40994:         status: "Service Flow - Opened",
40995:         assignee: getBranchTeamAssignee(lineConfig.branch),
40996:         tags: ["Booking", "Service Appointment", "WhatsApp Flow"],
40997:         updatedBy: "Service Booking Flow"
40998:       });
40999: 
41000:       const flowSendResult = await sendWhatsAppFlowMessage(from, incomingPhoneNumberId, {
41001:         branch: lineConfig.branch,
41002:         customerName: profileName,
41003:         flowType: "service",
41004:         requestType: "Service Appointment",
41005:         replyLanguage
41006:       });
41007: 
41008:       if (flowSendResult.ok) {
41009:         addInboxMessage(
41010:           from,
41011:           "bot",
41012:           `Service Booking Flow sent: ${ICONIC_SERVICE_BOOKING_FLOW_ID}`,
41013:           "Service Flow - Opened",
41014:           incomingPhoneNumberId,
41015:           {
41016:             customerName: profileName,
41017:             messageType: "Service Booking Flow Sent"
41018:           }
41019:         );
41020:       } else {
41021:         const fallbackServiceText =
41022:           `${BUSINESS_NAME_SPACED} ✨\n\n` +
41023:           "تعذر فتح نموذج حجز السيرفس حالياً. فريقنا سيتابع معك داخل المحادثة.\n\n" +
41024:           "------------------------------\n\n" +
41025:           `${BUSINESS_NAME_SPACED} ✨\n\n` +
41026:           "The service booking form could not be opened right now. Our team will assist you inside this chat.";
41027: 
41028:         await sendWhatsAppMessage(from, fallbackServiceText, incomingPhoneNumberId, { autoLocalize: true, replyLanguage });
41029:         addInboxMessage(from, "bot", fallbackServiceText, "Service Flow Fallback", incomingPhoneNumberId, { customerName: profileName, messageType: "Service Booking Flow Fallback" });
41030:       }
41031: 
41032:       return res.sendStatus(200);
41033:     }
41034: 
41035:     const isAbuDhabiConsultationPriorityIntent = isAbuDhabiLine(incomingPhoneNumberId, lineConfig.displayNumber) && isDirectConsultationChatBookingText(originalText || text);
41036: 
41037:     if (isConsultationFlowText(originalText || text) || isAbuDhabiConsultationPriorityIntent) {
41038:       // V31.5.8.60.3.9.34 - Abu Dhabi bot-cycle parity fix:
41039:       // Abu Dhabi must behave like Dubai for clear consultation booking messages,
41040:       // for example: "I want to book a consultation".
41041:       // Handle this before the generic Booking Menu so Abu Dhabi does not show
41042:       // Book Service / Consult when the customer already asked for consultation.
41043:       const directConsultationHandled = await handleSmartWhatsAppBooking({
41044:         from,
41045:         message,
41046:         originalText,
41047:         text,
41048:         incomingPhoneNumberId,
41049:         lineConfig,
41050:         profileName,
41051:         replyLanguage,
41052:         forceConsultationChatBooking: true
41053:       });
41054: 
41055:       if (directConsultationHandled) {
41056:         return res.sendStatus(200);
41057:       }
41058: 
41059:       return res.sendStatus(200);
41060:     }
41061: 
41062:     if (isDirectBookingChoiceText(originalText || text)) {
41063:       const bookingActionText = getSmartCustomerActionText(message, originalText || text) || "Booking | حجز";
41064:       const bookingCustomerBody = buildCustomerActionBody(profileName, bookingActionText);
41065: 
41066:       addInboxMessage(
41067:         from,
41068:         "customer",
41069:         bookingCustomerBody,
41070:         "Booking Menu",
41071:         incomingPhoneNumberId,
41072:         {
41073:           customerName: profileName,
41074:           messageType: "Customer Direct Booking Choice Request"
41075:         }
41076:       );
41077: 
41078:       setConversationStatus(from, "Booking Menu");
41079:       await saveConversationStateToGoogleSheetFromServer({
41080:         phone: from,
41081:         phoneNumberId: incomingPhoneNumberId,
41082:         branch: lineConfig.branch,
41083:         status: "Booking Menu",
41084:         assignee: getBranchTeamAssignee(lineConfig.branch),
41085:         tags: ["Booking", "Need Booking Type"],
41086:         updatedBy: "Direct Booking Intent"
41087:       });
41088: 
41089:       const directBookingBody = buildDirectBookingChoiceBody(profileName, replyLanguage);
41090:       const directBookingButtons = localizeReplyButtons(getDirectBookingChoiceButtons(), replyLanguage);
41091: 
41092:       await sendWhatsAppButtonMessage(from, directBookingBody, directBookingButtons, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
41093:       addInboxMessage(
41094:         from,
41095:         "bot",
41096:         formatButtonLog(directBookingBody, directBookingButtons),
41097:         "Booking Menu",
41098:         incomingPhoneNumberId,
41099:         {
41100:           customerName: profileName,
41101:           messageType: "Direct Booking Choice Reply"
41102:         }
41103:       );
41104: 
41105:       return res.sendStatus(200);
41106:     }
41107: 
41108: 
41109:     const fastBookingHandled = await handleFastBookingButtons({
41110:       from,
41111:       message,
41112:       originalText,
41113:       text,
41114:       incomingPhoneNumberId,
41115:       lineConfig,
41116:       profileName,
41117:       replyLanguage
41118:     });
41119: 
41120:     if (fastBookingHandled) {
41121:       return res.sendStatus(200);
41122:     }
41123: 
41124:     const incomingCustomerImageBody = message.type === "image" ? buildIncomingCustomerImageBody(message) : "";
41125:     const incomingCustomerAudioBody = message.type === "audio" ? buildIncomingCustomerAudioBody(message) : "";
41126:     const smartActionText = getSmartCustomerActionText(message, originalText || text);
41127:     const customerMessageBody = incomingCustomerImageBody || incomingCustomerAudioBody || buildCustomerActionBody(profileName, smartActionText);
41128:     const customerMessageStatus = autoIntentWorkflow?.status || "Bot";
41129:     const customerMessageType = incomingCustomerImageBody
41130:       ? "Customer Image Message"
41131:       : incomingCustomerAudioBody
41132:         ? "Customer Voice Message"
41133:         : (autoIntentWorkflow?.status ? `Customer Intent - ${autoIntentWorkflow.status}` : "Customer Message");
41134: 
41135:     // V31.5.8.57:
41136:     // Show the real customer action for buttons/lists/Flow replies when possible.
41137:     // If WhatsApp sends an event with no readable text or payload, do not show an empty bubble like "088:".
41138:     if (customerMessageBody && customerMessageBody.toString().trim()) {
41139:       addInboxMessage(
41140:         from,
41141:         "customer",
41142:         customerMessageBody,
41143:         customerMessageStatus,
41144:         incomingPhoneNumberId,
41145:         {
41146:           customerName: profileName,
41147:           messageType: customerMessageType
41148:         }
41149:       );
41150:     }
41151: 
41152:     // V31.5.8.60.3.7 - Incoming customer voice notes:
41153:     // Show the playable WhatsApp audio inside Team Inbox and avoid replying
41154:     // with the default menu to a pure voice note.
41155:     if (incomingCustomerAudioBody) {
41156:       console.log("Customer voice note saved to Team Inbox:", from, incomingPhoneNumberId);
41157:       return res.sendStatus(200);
41158:     }
41159: 
41160:     if (autoIntentWorkflow?.status === "Booking Request") {
41161:       await saveBookingRequestToGoogleSheetFromServer({
41162:         phone: from,
41163:         phoneNumberId: incomingPhoneNumberId,
41164:         customerName: profileName,
41165:         branch: lineConfig.branch,
41166:         message: originalText || customerMessageBody || "Customer selected Book / Booking Request",
41167:         requestType: "Booking Request",
41168:         bookingStatus: "Pending"
41169:       });
41170:     }
41171: 
41172:     const hour = getDubaiHour();
41173:     console.log("Dubai hour:", hour);
41174: 
41175:     let replyText = "";
41176:     let replyButtons = null;
41177:     let replyOptions = {};
41178:     let sendReminderOptInPrompt = false;
41179:     const branchNameAr = getArabicBranchName(lineConfig.branch);
41180: 
41181:     /* خارج أوقات العمل — معطل مؤقتاً للاختبار حتى تظهر الأزرار دائماً */
41182:     if (false && (hour < 10 || hour >= 19)) {
41183:       replyText =
41184:         `${BUSINESS_NAME_SPACED} ✨\n\n` +
41185:         "شكراً لتواصلك معنا.\n\n" +
41186:         "تم استلام رسالتك بنجاح، وسيقوم فريقنا بالرد عليك في أقرب وقت خلال ساعات العمل.\n\n" +
41187:         "ساعات العمل:\n" +
41188:         "10:00 صباحاً إلى 7:00 مساءً\n\n" +
41189:         `📍 موقع فرع ${branchNameAr}:\n${lineConfig.locationUrl}\n\n` +
41190:         "------------------------------\n\n" +
41191:         `${BUSINESS_NAME_SPACED} ✨\n\n` +
41192:         "Thank you for contacting us.\n\n" +
41193:         "Your message has been received successfully. A member of our team will get back to you as soon as possible during working hours.\n\n" +
41194:         "Working hours:\n" +
41195:         "10:00 AM to 7:00 PM\n\n" +
41196:         `📍 ${lineConfig.branch} branch location:\n${lineConfig.locationUrl}`;
41197:     }
41198: 
41199:     /* V31.5.8.60.3.9.29 — Fast human assistance handoff */
41200:     else if (isHumanAssistanceIntentText(originalText || text)) {
41201:       setConversationStatus(from, "Talk to Team");
41202:       rememberSmartIntentContext(from, "human_help", originalText || text, replyLanguage);
41203:       await saveConversationStateToGoogleSheetFromServer({
41204:         phone: from,
41205:         phoneNumberId: incomingPhoneNumberId,
41206:         branch: lineConfig.branch,
41207:         status: "Talk to Team",
41208:         assignee: getBranchTeamAssignee(lineConfig.branch),
41209:         tags: ["Human Support", "Bot Paused", "Smart Context"],
41210:         updatedBy: "Smart Context Human Handoff"
41211:       });
41212: 
41213:       replyText = buildTeamHandoffBody(profileName);
41214:       replyButtons = null;
41215:     }
41216: 
41217:     /* ساعات العمل / الدوام */
41218:     else if (isWorkingHoursIntentText(originalText || text)) {
41219:       setConversationStatus(from, "Working Hours Requested");
41220:       replyText = buildWorkingHoursBody(incomingPhoneNumberId, replyLanguage);
41221:       replyButtons = getActionButtons();
41222:     }
41223: 
41224:     /* زر الموقع الحقيقي — يرسل CTA URL يفتح Google Maps حسب الفرع تلقائياً */
41225:     else if (isLocationIntentText(originalText || text)) {
41226:       setConversationStatus(from, "Location Requested");
41227: 
41228:       const locationBody = buildLocationMessageBody(incomingPhoneNumberId);
41229:       const locationResult = await sendWhatsAppCtaUrlMessage(
41230:         from,
41231:         locationBody,
41232:         "Open Location",
41233:         lineConfig.locationUrl,
41234:         incomingPhoneNumberId,
41235:         { replyLanguage }
41236:       );
41237: 
41238:       if (locationResult.ok) {
41239:         addInboxMessage(
41240:           from,
41241:           "bot",
41242:           formatCtaLog(locationBody, "Open Location"),
41243:           "Location Requested",
41244:           incomingPhoneNumberId,
41245:           {
41246:             customerName: profileName,
41247:             messageType: "Location CTA"
41248:           }
41249:         );
41250:       } else {
41251:         const fallbackLocationText =
41252:           `${BUSINESS_NAME_SPACED} ✨\n\n` +
41253:           "تعذر إرسال زر الموقع حالياً.\n\n" +
41254:           `موقع فرع ${branchNameAr}:\n${lineConfig.locationUrl}\n\n` +
41255:           "------------------------------\n\n" +
41256:           `${BUSINESS_NAME_SPACED} ✨\n\n` +
41257:           "The location button could not be sent right now.\n\n" +
41258:           `${lineConfig.branch} branch location:\n${lineConfig.locationUrl}`;
41259: 
41260:         await sendWhatsAppMessage(from, fallbackLocationText, incomingPhoneNumberId, { autoLocalize: true, replyLanguage });
41261:         addInboxMessage(
41262:           from,
41263:           "bot",
41264:           fallbackLocationText,
41265:           "Location Fallback",
41266:           incomingPhoneNumberId,
41267:           {
41268:             customerName: profileName,
41269:             messageType: "Location Fallback"
41270:           }
41271:         );
41272:       }
41273: 
41274:       return res.sendStatus(200);
41275:     }
41276: 
41277:     /* زر الاتصال الحقيقي — يرسل تمبلت فيه Call Now حسب الفرع تلقائياً */
41278:     else if (isCallIntentText(originalText || text)) {
41279:       setConversationStatus(from, "Call Requested");
41280: 
41281:       const callTemplateName = getCallNowTemplateName(incomingPhoneNumberId);
41282:       const sendResult = await sendWhatsAppTemplate(
41283:         from,
41284:         callTemplateName,
41285:         incomingPhoneNumberId,
41286:         CALL_NOW_TEMPLATE_LANGUAGE,
41287:         { includeHeaderImage: false }
41288:       );
41289: 
41290:       const callLogText = getCallNowBodyForLog(incomingPhoneNumberId);
41291: 
41292:       if (sendResult.ok) {
41293:         addInboxMessage(
41294:           from,
41295:           "bot",
41296:           callLogText,
41297:           "Call Requested",
41298:           incomingPhoneNumberId,
41299:           {
41300:             customerName: profileName,
41301:             messageType: "Call Now Template"
41302:           }
41303:         );
41304:       } else {
41305:         const fallbackCallText =
41306:           `${BUSINESS_NAME_SPACED} ✨\n\n` +
41307:           "تعذر إرسال زر الاتصال حالياً.\n\n" +
41308:           `يمكنك التواصل مع فرع ${branchNameAr} على الرقم:\n${lineConfig.displayNumber}\n\n` +
41309:           "------------------------------\n\n" +
41310:           `${BUSINESS_NAME_SPACED} ✨\n\n` +
41311:           "The Call Now button could not be sent right now.\n\n" +
41312:           `You can contact our ${lineConfig.branch} branch on:\n${lineConfig.displayNumber}`;
41313: 
41314:         await sendWhatsAppMessage(from, fallbackCallText, incomingPhoneNumberId, { autoLocalize: true, replyLanguage });
41315:         addInboxMessage(
41316:           from,
41317:           "bot",
41318:           fallbackCallText,
41319:           "Call Fallback",
41320:           incomingPhoneNumberId,
41321:           {
41322:             customerName: profileName,
41323:             messageType: "Call Now Fallback"
41324:           }
41325:         );
41326:       }
41327: 
41328:       return res.sendStatus(200);
41329:     }
41330: 
41331:     /* طلب تذكير المتابعة */
41332:     else if (
41333:       text.includes("reminder") ||
41334:       text.includes("reminders") ||
41335:       text.includes("follow-up") ||
41336:       text.includes("follow up") ||
41337:       text.includes("تذكير") ||
41338:       text.includes("ذكرني") ||
41339:       text.includes("متابعة الخدمة")
41340:     ) {
41341:       replyText = buildReminderOptInBody();
41342:       replyButtons = getReminderOptInButtons();
41343:     }
41344: 
41345:     /* V31.5 — إرسال فيديو تلقائي عند طلب الصور أو الميديا */
41346:     else if (isAutoVideoRequestText(text) &&
41347:       !isPriceIntentText(originalText || text) &&
41348:       !isBookingIntentText(originalText || text) &&
41349:       !isLocationIntentText(originalText || text) &&
41350:       !isCallIntentText(originalText || text)
41351:     ) {
41352:       setConversationStatus(from, "Media Requested");
41353: 
41354:       const videoUrl = getAutoReplyVideoUrl(req);
41355:       const videoCaption = buildAutoVideoCaption();
41356:       const videoResult = await sendWhatsAppVideoMessage(from, videoUrl, videoCaption, incomingPhoneNumberId, { replyLanguage });
41357: 
41358:       if (videoResult.ok) {
41359:         addInboxMessage(
41360:           from,
41361:           "bot",
41362:           videoCaption,
41363:           "Media Requested",
41364:           incomingPhoneNumberId,
41365:           {
41366:             customerName: profileName,
41367:             messageType: "Auto Video Reply"
41368:           }
41369:         );
41370: 
41371:         const afterVideoBody = buildAfterVideoBody();
41372:         const afterVideoButtons = getConsultActionButtons();
41373: 
41374:         await sendWhatsAppButtonMessage(from, afterVideoBody, afterVideoButtons, incomingPhoneNumberId, { replyLanguage });
41375:         addInboxMessage(
41376:           from,
41377:           "bot",
41378:           formatButtonLog(afterVideoBody, afterVideoButtons),
41379:           "Media Requested",
41380:           incomingPhoneNumberId,
41381:           {
41382:             customerName: profileName,
41383:             messageType: "Bot Reply"
41384:           }
41385:         );
41386:       } else {
41387:         const videoFallbackText =
41388:           `${BUSINESS_NAME_SPACED} ✨\n\n` +
41389:           "تعذر إرسال الفيديو حالياً، لكن فريقنا جاهز يرسل لك التفاصيل داخل المحادثة.\n\n" +
41390:           "------------------------------\n\n" +
41391:           `${BUSINESS_NAME_SPACED} ✨\n\n` +
41392:           "The video could not be sent right now, but our team can share the details with you inside this chat.";
41393: 
41394:         await sendWhatsAppMessage(from, videoFallbackText, incomingPhoneNumberId, { autoLocalize: true, replyLanguage });
41395:         addInboxMessage(
41396:           from,
41397:           "bot",
41398:           videoFallbackText,
41399:           "Media Fallback",
41400:           incomingPhoneNumberId,
41401:           {
41402:             customerName: profileName,
41403:             messageType: "Auto Video Fallback"
41404:           }
41405:         );
41406:       }
41407: 
41408:       return res.sendStatus(200);
41409:     }
41410: 
41411:     /* V31.5.8.52 — Booking menu */
41412:     else if (
41413:       isBookingMenuText(originalText || text) ||
41414:       text === "1" ||
41415:       text === "١"
41416:     ) {
41417:       setConversationStatus(from, "Booking Menu");
41418: 
41419:       replyText =
41420:         `${BUSINESS_NAME_SPACED} ✨\n\n` +
41421:         `تمام ${profileName || ""} 👌\n\n` +
41422:         "اختر نوع الحجز المناسب لك:\n\n" +
41423:         "------------------------------\n\n" +
41424:         `${BUSINESS_NAME_SPACED} ✨\n\n` +
41425:         "Please choose the booking type:";
41426: 
41427:       replyButtons = getDirectBookingChoiceButtons();
41428:     }
41429: 
41430:     /* V31.5.8.52 — Service booking submenu */
41431:     else if (isServiceMenuText(originalText || text)) {
41432:       setConversationStatus(from, "Service Appointment");
41433: 
41434:       replyText = replyLanguage === "ar"
41435:         ? [
41436:             (profileName ? `تمام ${profileName} 👌` : "تمام 👌"),
41437:             "",
41438:             "هذا الخيار مخصص للعملاء الحاليين لحجز موعد سيرفس، متابعة، تركيب، أو زيارة خدمة."
41439:           ].join("\n")
41440:         : [
41441:             (profileName ? `Sure ${profileName} 👌` : "Sure 👌"),
41442:             "",
41443:             "This option is for existing clients who want to book a service appointment, follow-up, fitting, or service visit."
41444:           ].join("\n");
41445: 
41446:       replyButtons = getServiceSubMenuButtons();
41447:     }
41448: 
41449:     /* V31.5.8.60.3.9.29 — Smart context follow-up router */
41450:     else if (getSmartContextAwareReply({ phone: from, text: originalText || text, customerName: profileName, language: replyLanguage })) {
```

## Source lines 41545-41685
```javascript
41545:       setConversationStatus(from, "Service Interest");
41546:       rememberSmartIntentContext(from, "natural", originalText || text, replyLanguage);
41547: 
41548:       replyText = buildNaturalIntentBody(profileName, replyLanguage);
41549:       replyButtons = getActionButtons();
41550:     }
41551: 
41552:     /* السعر */
41553:     else if (isPriceIntentText(originalText || text)) {
41554:       setConversationStatus(from, "Price Question");
41555:       rememberSmartIntentContext(from, "price", originalText || text, replyLanguage);
41556: 
41557:       replyText = buildPriceIntentBody(profileName, replyLanguage);
41558:       replyButtons = getConsultActionButtons();
41559:     }
41560: 
41561:     /* استشارة خاصة */
41562:     else if (isConsultationIntentText(originalText || text)) {
41563:       setConversationStatus(from, "Consultation Request");
41564:       rememberSmartIntentContext(from, "consultation", originalText || text, replyLanguage);
41565: 
41566:       replyText = buildConsultationIntentBody(profileName, replyLanguage);
41567:       replyButtons = getConsultActionButtons();
41568:       sendReminderOptInPrompt = true;
41569:     }
41570: 
41571:     /* 5 — الموقع وساعات العمل */
41572:     else if (isLocationIntentText(originalText || text)) {
41573:       replyText = buildLocationMessageBody(incomingPhoneNumberId);
41574:       replyButtons = null;
41575:     }
41576: 
41577:     /* 6 — التحدث مع موظف */
41578:     else if (isTalkToTeamText(originalText || text)) {
41579:       setConversationStatus(from, "Talk to Team");
41580:       await saveConversationStateToGoogleSheetFromServer({
41581:         phone: from,
41582:         phoneNumberId: incomingPhoneNumberId,
41583:         branch: lineConfig.branch,
41584:         status: "Talk to Team",
41585:         assignee: getBranchTeamAssignee(lineConfig.branch),
41586:         tags: ["Human Support", "Bot Paused"],
41587:         updatedBy: "Customer Requested Team"
41588:       });
41589: 
41590:       replyText = buildTeamHandoffBody(profileName);
41591:       replyButtons = null;
41592:     }
41593: 
41594:     /* V31.5.8.60.3.9.28 — unclear/help clarification */
41595:     else if (isUnclearHelpIntentText(originalText || text)) {
41596:       setConversationStatus(from, "Needs Clarification");
41597: 
41598:       replyText = buildClarifyingIntentBody(profileName, replyLanguage);
41599:       replyButtons = getClarifyingIntentButtons();
41600:     }
41601: 
41602:     /* القائمة الرئيسية */
41603:     else {
41604:       replyText = buildMainMenuBody(profileName, replyLanguage);
41605:       replyButtons = localizeReplyButtons(getMainMenuButtons(), replyLanguage);
41606:       replyOptions = { headerImageUrl: BOT_HEADER_IMAGE_URL, skipAutoLanguage: true };
41607:     }
41608: 
41609:     /* إرسال الرد للعميل */
41610:     const localizedReplyText = cleanLocalizedReplyBody(replyText, replyLanguage);
41611:     const localizedReplyButtons = localizeReplyButtons(replyButtons || [], replyLanguage);
41612: 
41613:     if (replyButtons && replyButtons.length > 0) {
41614:       await sendWhatsAppButtonMessage(from, localizedReplyText, localizedReplyButtons, incomingPhoneNumberId, {
41615:         ...(replyOptions || {}),
41616:         replyLanguage,
41617:         skipAutoLanguage: true
41618:       });
41619:       addInboxMessage(from, "bot", formatButtonLog(localizedReplyText, localizedReplyButtons), conversationStatus[from] || "Bot", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Reply" });
41620:     } else {
41621:       await sendWhatsAppMessage(from, localizedReplyText, incomingPhoneNumberId);
41622:       addInboxMessage(from, "bot", localizedReplyText, conversationStatus[from] || "Bot", incomingPhoneNumberId, { customerName: profileName, messageType: "Bot Reply" });
41623:     }
41624: 
41625:     if (sendReminderOptInPrompt) {
41626:       const reminderOptInBody = cleanLocalizedReplyBody(buildReminderOptInBody(), replyLanguage);
41627:       const reminderOptInButtons = localizeReplyButtons(getReminderOptInButtons(), replyLanguage);
41628: 
41629:       await sendWhatsAppButtonMessage(from, reminderOptInBody, reminderOptInButtons, incomingPhoneNumberId, { replyLanguage, skipAutoLanguage: true });
41630:       addInboxMessage(
41631:         from,
41632:         "bot",
41633:         formatButtonLog(reminderOptInBody, reminderOptInButtons),
41634:         conversationStatus[from] || "Bot",
41635:         incomingPhoneNumberId,
41636:         {
41637:           customerName: profileName,
41638:           messageType: "Reminder Opt-in Prompt"
41639:         }
41640:       );
41641:     }
41642: 
41643:     /* إشعار الموظف فقط عند طلب استشارة */
41644:     const shouldNotifyStaff = autoIntentWorkflow?.status === "Consultation Request";
41645:     const staffNotificationRouting = getStaffNotificationRouting(incomingPhoneNumberId, value?.metadata?.display_phone_number || "");
41646:     const staffNotificationNumber = staffNotificationRouting.number;
41647: 
41648:     if (shouldNotifyStaff) {
41649:       console.log(`[Staff Notify Routing] branch=${staffNotificationRouting.branch} phoneNumberId=${staffNotificationRouting.phoneNumberId} env=${staffNotificationRouting.envName} fallback=${staffNotificationRouting.fallbackUsed} hasNumber=${staffNotificationRouting.hasNumber}`);
41650:     }
41651: 
41652:     if (shouldNotifyStaff && !staffNotificationNumber) {
41653:       console.log(`[Staff Notify Send] skipped branch=${staffNotificationRouting.branch} reason=missing_staff_number env=${staffNotificationRouting.envName}`);
41654:     }
41655: 
41656:     if (shouldNotifyStaff && staffNotificationNumber) {
41657:       try {
41658:         const customerChatLink = getCustomerChatLink(from);
41659: 
41660:         const staffBody =
41661:           "طلب تواصل/استشارة جديد عبر واتساب\n\n" +
41662:           "الفرع / الرقم المستلم:\n" +
41663:           lineConfig.branch + " - " + lineConfig.displayNumber +
41664:           "\n\n" +
41665:           "رقم العميل:\n" +
41666:           from +
41667:           "\n\n" +
41668:           "رابط محادثة العميل:\n" +
41669:           customerChatLink +
41670:           "\n\n" +
41671:           "آخر رسالة من العميل:\n" +
41672:           (originalText || "") +
41673:           "\n\n" +
41674:           "افتح Mini Inbox لمتابعة المحادثة والرد من رقم الأرضي.\n\n" +
41675:           "------------------------------\n\n" +
41676:           "New WhatsApp team/consultation request\n\n" +
41677:           "Receiving branch/line:\n" +
41678:           lineConfig.branch + " - " + lineConfig.displayNumber +
41679:           "\n\n" +
41680:           "Customer Number:\n" +
41681:           from +
41682:           "\n\n" +
41683:           "Open customer chat:\n" +
41684:           customerChatLink +
41685:           "\n\n" +
```

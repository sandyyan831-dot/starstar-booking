// 星語・星心：後台按「已收款」時，自動把預約放進 Google 行事曆
// 這段程式貼在 Google Apps Script（script.google.com），部署成「網頁應用程式」後使用。
//
// 安全性：每次呼叫都會帶後台登入的憑證，這裡會拿它去讀一筆「只有管理員讀得到」的資料庫內容，
// 讀得到才算是管理員本人（跟資料庫權限規則一致），其他人就算知道網址也加不了、刪不了行事曆。

const FIREBASE_PROJECT = "starstar-booking";
const CALENDAR_NAME = "家庭"; // 放進這個名稱的行事曆；找不到就放預設行事曆

function calendar_() {
  return CalendarApp.getCalendarsByName(CALENDAR_NAME)[0] || CalendarApp.getDefaultCalendar();
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const who = checkAdmin_(body.idToken);
    if (!who.ok) return reply_({ ok: false, error: "沒有權限（" + who.reason + "）" });

    const results = (body.items || []).map(item => {
      try {
        if (body.action === "upsert") upsertEvent_(item);
        else if (body.action === "remove") removeEvent_(item.id);
        else throw new Error("不認得的動作：" + body.action);
        return { id: item.id, ok: true };
      } catch (err) {
        return { id: item.id, ok: false, error: String(err.message || err) };
      }
    });
    return reply_({ ok: results.every(r => r.ok), results });
  } catch (err) {
    return reply_({ ok: false, error: String(err.message || err) });
  }
}

// 第一次部署前，先在編輯器裡選這個函式按「執行」，讓 Google 詢問行事曆權限
function 授權測試() {
  Logger.log("預約會放進這個行事曆：" + calendar_().getName());
}

// 回傳 { ok, reason }：沒過的時候 reason 說明卡在哪一步，方便除錯
// 折扣碼列表只有管理員能讀（見 firestore.rules），用它來確認身分
function checkAdmin_(idToken) {
  if (!idToken) return { ok: false, reason: "沒有帶登入憑證" };
  const res = UrlFetchApp.fetch(
    "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT +
      "/databases/(default)/documents/discountCodes?pageSize=1&mask.fieldPaths=active",
    { headers: { Authorization: "Bearer " + idToken }, muteHttpExceptions: true }
  );
  if (res.getResponseCode() === 200) return { ok: true };
  return { ok: false, reason: "資料庫回應 " + res.getResponseCode() + "：" + res.getContentText().slice(0, 200) };
}

// 每筆預約只會有一個行事曆活動：用預約代碼記住活動編號，重複送出只會更新、不會重複新增
function upsertEvent_(item) {
  const cal = calendar_();
  const props = PropertiesService.getScriptProperties();
  const start = new Date(item.start), end = new Date(item.end);
  const existingId = props.getProperty(item.id);
  const existing = existingId && cal.getEventById(existingId);
  if (existing) {
    existing.setTitle(item.title);
    existing.setTime(start, end);
    existing.setDescription(item.description || "");
    return;
  }
  const ev = cal.createEvent(item.title, start, end, { description: item.description || "" });
  props.setProperty(item.id, ev.getId());
}

function removeEvent_(id) {
  const props = PropertiesService.getScriptProperties();
  const eventId = props.getProperty(id);
  if (!eventId) return;
  const ev = calendar_().getEventById(eventId);
  if (ev) ev.deleteEvent();
  props.deleteProperty(id);
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

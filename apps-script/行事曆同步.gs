// 星語・星心：後台按「已收款」時，自動把預約放進 Google 行事曆
// 這段程式貼在 Google Apps Script（script.google.com），部署成「網頁應用程式」後使用。
//
// 安全性：每次呼叫都會帶後台登入的憑證，這裡會向 Firebase 確認真的是管理員本人，
// 其他人就算知道網址也加不了、刪不了行事曆。

const FIREBASE_API_KEY = "AIzaSyBcoTgoJX6Nz7drf9lYB39_epJKGKK7zhE";
const ADMIN_EMAILS = ["orangelfish@gmail.com"];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (!isAdmin_(body.idToken)) return reply_({ ok: false, error: "沒有權限" });

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
  Logger.log("可以使用的行事曆：" + CalendarApp.getDefaultCalendar().getName());
}

function isAdmin_(idToken) {
  if (!idToken) return false;
  const res = UrlFetchApp.fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_API_KEY,
    { method: "post", contentType: "application/json", payload: JSON.stringify({ idToken }), muteHttpExceptions: true }
  );
  if (res.getResponseCode() !== 200) return false;
  const user = (JSON.parse(res.getContentText()).users || [])[0];
  return !!user && ADMIN_EMAILS.includes(user.email);
}

// 每筆預約只會有一個行事曆活動：用預約代碼記住活動編號，重複送出只會更新、不會重複新增
function upsertEvent_(item) {
  const cal = CalendarApp.getDefaultCalendar();
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
  const ev = CalendarApp.getDefaultCalendar().getEventById(eventId);
  if (ev) ev.deleteEvent();
  props.deleteProperty(id);
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

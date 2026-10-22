// 星語・星心：後台按「已收款」時，自動把預約放進 Google 行事曆，並用 LINE 官方帳號（@754atiwp）通知客人
// 這段程式貼在 Google Apps Script（script.google.com），部署成「網頁應用程式」後使用。
//
// 安全性：後台每次呼叫都會帶登入的憑證，這裡會拿它去讀一筆「只有管理員讀得到」的資料庫內容，
// 讀得到才算是管理員本人（跟資料庫權限規則一致），其他人就算知道網址也加不了、刪不了行事曆、傳不了 LINE。
//
// LINE：同一個網址也是 LINE 官方帳號的 Webhook。客人傳「預約代碼 XXXXXX」時記住「代碼＝這位客人」，
// 之後後台按已收款就能傳訊息給他。需要在「專案設定 → 指令碼屬性」加 LINE_TOKEN（Channel access token）。

const FIREBASE_PROJECT = "starstar-booking";
const CALENDAR_NAME = "家庭"; // 放進這個名稱的行事曆；找不到就放預設行事曆

function calendar_() {
  return CalendarApp.getCalendarsByName(CALENDAR_NAME)[0] || CalendarApp.getDefaultCalendar();
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (Array.isArray(body.events)) return handleLineWebhook_(body.events);   // LINE 傳來的訊息
    const who = checkAdmin_(body.idToken);
    if (!who.ok) return reply_({ ok: false, error: "沒有權限（" + who.reason + "）" });

    const results = (body.items || []).map(item => {
      try {
        if (body.action === "upsert") upsertEvent_(item);
        else if (body.action === "remove") removeEvent_(item.id);
        else if (body.action === "notify") notifyLine_(item);
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

// ── LINE ──────────────────────────────────────────────

const LINE_API = "https://api.line.me/v2/bot";
const CODE_PATTERN = /預約代碼\s*[:：]?\s*([A-Za-z0-9]{6})/;

function lineToken_() {
  const t = PropertiesService.getScriptProperties().getProperty("LINE_TOKEN");
  if (!t) throw new Error("Apps Script 還沒設定 LINE_TOKEN");
  return t;
}

function lineApi_(path, payload) {
  const res = UrlFetchApp.fetch(LINE_API + path, {
    method: payload ? "post" : "get",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + lineToken_() },
    payload: payload ? JSON.stringify(payload) : undefined,
    muteHttpExceptions: true,
  });
  return { code: res.getResponseCode(), text: res.getContentText() };
}

const nameKey_ = name => "line:name:" + String(name || "").trim().toLowerCase();

// 客人傳訊息給官方帳號：記住他的 LINE 名稱；訊息裡有預約代碼就記住「代碼＝這位客人」
// （Apps Script 讀不到 LINE 的簽章標頭，所以改用「向 LINE 查得到這個人」來確認是真的好友）
function handleLineWebhook_(events) {
  const props = PropertiesService.getScriptProperties();
  events.forEach(ev => {
    try {
      const userId = ev.source && ev.source.type === "user" && ev.source.userId;
      if (!userId || (ev.type !== "message" && ev.type !== "follow")) return;
      // 記住 LINE 名稱（給沒有預約代碼的舊預約用）；查不到通常是對方還沒加好友
      const profile = lineApi_("/profile/" + userId);
      if (profile.code === 200) {
        const name = JSON.parse(profile.text).displayName || "";
        // 同名的人不只一位就標記起來，之後不用名字找，以免傳錯人
        const key = nameKey_(name), had = props.getProperty(key);
        if (name) props.setProperty(key, had && had !== userId ? "多人同名" : userId);
      } else {
        console.log("查不到這位 LINE 用戶（可能還沒加好友，或 LINE_TOKEN 不對）：" + profile.code + " " + profile.text.slice(0, 200));
      }

      const text = ev.message && ev.message.type === "text" ? ev.message.text : "";
      const m = CODE_PATTERN.exec(text);
      if (!m) return;
      props.setProperty("line:code:" + m[1].toUpperCase(), userId);
      const r = lineApi_("/message/reply", { replyToken: ev.replyToken, messages: [{ type: "text",
        text: "收到你的預約代碼 ✧\n付款截圖直接傳在這裡就可以，確認收款後我會在這裡跟你說預約時間唷" }] });
      console.log("收到預約代碼 " + m[1].toUpperCase() + "，自動回覆：" + (r.code === 200 ? "成功" : "失敗 " + r.code + " " + r.text.slice(0, 200)));
    } catch (err) {
      console.error(err);
    }
  });
  return reply_({ ok: true });
}

// 後台按已收款：先用預約代碼找客人，沒有代碼（舊預約）才用 LINE 名稱找
function notifyLine_(item) {
  const props = PropertiesService.getScriptProperties();
  let userId = item.code && props.getProperty("line:code:" + String(item.code).toUpperCase());
  if (!userId) {
    const byName = item.line && props.getProperty(nameKey_(item.line));
    if (byName === "多人同名") throw new Error("有好幾位客人的 LINE 名稱都是「" + item.line + "」，不確定要傳給誰");
    userId = byName;
  }
  if (!userId) throw new Error("找不到這位客人的 LINE：客人還沒在官方帳號傳預約代碼（或 LINE 名稱和表單上不一樣）");
  const r = lineApi_("/message/push", { to: userId, messages: [{ type: "text", text: item.text }] });
  if (r.code !== 200) throw new Error("LINE 回應 " + r.code + "：" + r.text.slice(0, 200));
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

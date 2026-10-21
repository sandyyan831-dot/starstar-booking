// LINE 官方帳號通知：後台按「已收款」時，自動用 LINE 傳預約時間給客人（透過 apps-script/行事曆同步.gs）
//
// 怎麼找到客人：預約時給客人一組「預約代碼」，客人點按鈕打開 LINE 時代碼已經填好，按傳送後
// 官方帳號就記住「這組代碼＝這位客人」。沒有代碼的舊預約，退而用 LINE 顯示名稱去找。
import { buildCalendarEvent, callScript } from "./calendarSync.js";
import { dateLabel, timeLabel } from "./reschedule.js";

export const LINE_OA_ID = "@754atiwp";
export const LINE_ADD_FRIEND_URL = `https://line.me/R/ti/p/${LINE_OA_ID}`;

// 去掉容易看錯的 0/O、1/I/L
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newLineCode(random = Math.random) {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
  return s;
}

/** 打開跟官方帳號的聊天室，訊息框已經填好預約代碼 */
export function lineMessageUrl(code) {
  return `https://line.me/R/oaMessage/${LINE_OA_ID}/?${encodeURIComponent(`預約代碼 ${code}`)}`;
}

const hmOf = iso => iso.slice(11, 16);

// 例如 上午 10:00–12:00、下午 2:00–4:00；跨過中午寫成 上午 10:00–下午 1:00
function rangeLabel(startHM, endHM) {
  const label = timeLabel(startHM, endHM);
  if (Number(startHM.slice(0, 2)) < 12 && endHM > "12:00") {
    return label.replace(/–(.*)$/, (_, end) => `–下午 ${end}`);
  }
  return label;
}

/** 已收款後傳給客人的訊息；算不出時間回傳 "" */
export function buildPaidMessage(booking) {
  const ev = buildCalendarEvent(booking);
  if (!ev) return "";
  const [y, m, d] = ev.start.slice(0, 10).split("-").map(Number);
  const when = `${dateLabel(new Date(y, m - 1, d))} ${rangeLabel(hmOf(ev.start), hmOf(ev.end))}`;
  if (booking.consultId === "textOnly") {
    return `收到，您預約的是單一問題．文字回覆（${when}）\n那天我會在這裡用文字回覆你的問題唷`;
  }
  return `收到，您預約的時間是${when}\n那天我會在這裡傳通話按鈕，方便的時候接起來就可以唷`;
}

/** 傳 LINE 給客人。回傳 { ok, error?, text } — text 是訊息內容，失敗時可以複製去手動傳 */
export async function notifyPaid(booking) {
  const text = buildPaidMessage(booking);
  if (!text) return { ok: false, error: "算不出預約時間", text };
  const r = await callScript("notify", [{ id: booking.id, code: booking.lineCode || "", line: booking.line || "", text }]);
  return { ...r, text };
}

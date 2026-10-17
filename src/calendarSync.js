// 已收款的預約自動放進 Google 行事曆（透過 apps-script/行事曆同步.gs）
import { auth } from "./firebase.js";

// 部署 Apps Script 後拿到的「網頁應用程式」網址；空白代表還沒設定，就不會同步
export const CALENDAR_SYNC_URL = "";

const SLOT_TIMES = { morning: ["10:00", "12:00"], afternoon: ["14:00", "16:00"] };

/** 由預約的時段代碼（例如 2026-10-20_morning、2026-10-20_1030）算出行事曆活動；算不出來就回傳 null */
export function buildCalendarEvent(booking) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})_(\w+)$/.exec(booking.slotKey || booking.id || "");
  if (!m) return null;
  const [, y, mo, d, slot] = m;
  let startHM, endHM;
  if (SLOT_TIMES[slot]) [startHM, endHM] = SLOT_TIMES[slot];
  else if (/^\d{4}$/.test(slot)) {
    // 半小時的時段，例如 1030 → 10:30–11:00
    const startMin = Number(slot.slice(0, 2)) * 60 + Number(slot.slice(2));
    const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    startHM = hm(startMin); endHM = hm(startMin + 30);
  } else return null;
  const day = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return {
    id: booking.id,
    title: `${booking.consultType || "諮詢"}｜LINE: ${booking.line || ""}`,
    start: `${day}T${startHM}:00+08:00`,
    end: `${day}T${endHM}:00+08:00`,
    description: "由星語・星心預約後台自動建立",
  };
}

/** action："upsert"（新增或更新）｜"remove"（刪除）。回傳 { ok, error? } */
export async function syncCalendar(action, bookings) {
  if (!CALENDAR_SYNC_URL) return { ok: true, skipped: true };
  const items = action === "upsert"
    ? bookings.map(buildCalendarEvent).filter(Boolean)
    : bookings.map(b => ({ id: b.id }));
  if (!items.length) return { ok: true };
  try {
    const idToken = await auth.currentUser.getIdToken();
    // 用 text/plain 送出，Apps Script 才收得到（避免瀏覽器的跨網域預檢）
    const res = await fetch(CALENDAR_SYNC_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, idToken, items }),
    });
    const data = await res.json();
    if (data.ok) return { ok: true };
    const failed = (data.results || []).filter(r => !r.ok).map(r => `${r.id}：${r.error}`);
    return { ok: false, error: data.error || failed.join("\n") };
  } catch (e) {
    console.error(e);
    return { ok: false, error: String(e.message || e) };
  }
}

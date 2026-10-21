// 已收款的預約自動放進 Google 行事曆（透過 apps-script/行事曆同步.gs）
import { auth } from "./firebase.js";

// 部署 Apps Script 後拿到的「網頁應用程式」網址；空白代表還沒設定，就不會同步
export const CALENDAR_SYNC_URL = "https://script.google.com/macros/s/AKfycbw4TmnDJOJrurwnWscSRRdeghqvxg6Qjtly_ifnREXQAsVMti-Zw702Tu29wjSkqDjx/exec";

const SLOT_TIMES = { morning: ["10:00", "12:00"], afternoon: ["14:00", "16:00"] };

const money = (n) => `$${Number(n).toLocaleString("en-US")}`;

/** 行事曆備註：給記帳用，只放金額與折扣碼（不放生日等個資，因為行事曆會和家人共用） */
export function buildCalendarNote(booking) {
  const lines = ["由星語・星心預約後台自動建立", ""];
  if (Number(booking.childCount) > 1) lines.push(`孩子人數：${booking.childCount} 位`);
  if (booking.withMomChart) lines.push(`加看媽媽本命盤：+${money(Number(booking.momChartFee) || 0)}`);
  if (booking.withPartner) lines.push(`加做合盤：+${money(Number(booking.partnerFee) || 0)}`);
  if (booking.withDad) lines.push(`加做爸爸合盤：+${money(Number(booking.dadFee) || 0)}`);
  const paid = Number(booking.price);
  if (!Number.isNaN(paid) && booking.price !== undefined && booking.price !== "") {
    lines.push(`實收金額：${money(paid)}`);
    const discount = Number(booking.discountAmount) || 0;
    if (discount > 0 && booking.discountCode) {
      lines.push(`原價：${money(Number(booking.listPrice) || paid + discount)}`);
      lines.push(`折扣碼：${booking.discountCode}（折抵 ${money(discount)}）`);
    } else {
      lines.push("折扣碼：無");
    }
  }
  return lines.join("\n").trimEnd();
}

/** 由預約的時段代碼（例如 2026-10-20_morning、2026-10-20_1030）算出行事曆活動；算不出來就回傳 null */
export function buildCalendarEvent(booking) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})_(\w+)$/.exec(booking.slotKey || booking.id || "");
  if (!m) return null;
  const [, y, mo, d, slot] = m;
  let startHM, endHM;
  const custom = /^t(\d{2})(\d{2})e(\d{2})(\d{2})$/.exec(slot);   // 後台手動改的時間，例如 t1900e2100
  if (SLOT_TIMES[slot]) [startHM, endHM] = SLOT_TIMES[slot];
  else if (custom) { startHM = `${custom[1]}:${custom[2]}`; endHM = `${custom[3]}:${custom[4]}`; }
  else if (/^\d{4}$/.test(slot)) {
    // 半小時的時段，例如 1030 → 10:30–11:00
    const startMin = Number(slot.slice(0, 2)) * 60 + Number(slot.slice(2));
    const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    startHM = hm(startMin); endHM = hm(startMin + 30);
  } else return null;
  const day = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  // 解碼孩子一次看多位孩子、或加看媽媽的本命盤：每份解讀約一小時，超過預約的 2 小時時段就把活動拉長
  const kids = Number(booking.childCount) || 1;
  const hours = Number(booking.sessionHours) || kids;
  let end = `${day}T${endHM}:00+08:00`;
  if (hours > 2 && SLOT_TIMES[slot]) {
    const [eh, em] = endHM.split(":").map(Number);
    end = `${day}T${String(eh + (hours - 2)).padStart(2, "0")}:${String(em).padStart(2, "0")}:00+08:00`;
  }
  return {
    id: booking.id,
    title: `${booking.consultType || "諮詢"}${kids > 1 ? ` ×${kids}位孩子` : ""}${booking.withMomChart ? " ＋媽媽本命盤" : ""}｜LINE: ${booking.line || ""}`,
    start: `${day}T${startHM}:00+08:00`,
    end,
    description: buildCalendarNote(booking),
  };
}

/** action："upsert"（新增或更新）｜"remove"（刪除）。回傳 { ok, error? } */
export async function syncCalendar(action, bookings) {
  if (!CALENDAR_SYNC_URL) return { ok: true, skipped: true };
  const items = action === "upsert"
    ? bookings.map(buildCalendarEvent).filter(Boolean)
    : bookings.map(b => ({ id: b.id }));
  if (!items.length) return { ok: true };
  return callScript(action, items);
}

/** 呼叫 Apps Script（行事曆、LINE 通知共用同一個網址）。回傳 { ok, error?, results? } */
export async function callScript(action, items) {
  try {
    const idToken = await auth.currentUser.getIdToken();
    // 用 text/plain 送出，Apps Script 才收得到（避免瀏覽器的跨網域預檢）
    const res = await fetch(CALENDAR_SYNC_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, idToken, items }),
    });
    const data = await res.json();
    if (data.ok) return { ok: true, results: data.results };
    const failed = (data.results || []).filter(r => !r.ok).map(r => `${r.id}：${r.error}`);
    return { ok: false, error: data.error || failed.join("\n") };
  } catch (e) {
    console.error(e);
    return { ok: false, error: String(e.message || e) };
  }
}

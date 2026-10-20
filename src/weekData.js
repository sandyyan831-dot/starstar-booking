// 後台週曆：把預約放進「某一週 × 每天上午／下午」的格子（純函式，不碰資料庫）
import { consultStart } from "./bookingOrder.js";

export const SERVICE_SHORT = { first: "本命盤", child: "解碼孩子", returning: "問問題", textOnly: "文字回覆", timing: "擇時" };

const pad = n => String(n).padStart(2, "0");
export const dayKey = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

// 傳入任一天，回傳那一週的星期一（00:00）
export function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

// 時段代碼 → 上午／下午；半小時的時段（1030）用小時判斷
export function periodOf(b) {
  const c = consultStart(b);
  if (!c) return null;
  return c.minutes < 720 ? "morning" : c.minutes < 1020 ? "afternoon" : "evening";
}

export function timeText(b) {
  const c = consultStart(b);
  if (!c) return "";
  const slot = String(b.slotKey || b.id).split("_")[1];
  return slot === "morning" || slot === "afternoon" ? "" : `${pad(Math.floor(c.minutes / 60))}:${pad(c.minutes % 60)}`;
}

/**
 * 回傳這一週要顯示的每一天：
 * [{ date, key, closedMorning, blockedMorning, blockedAfternoon, morning: [預約], afternoon: [預約] }]
 * 平日（週一到週五）一定會列出；週六、週日只在有預約時才列出。
 */
export function buildWeek(bookings, weekStart, blockedSlots = new Set()) {
  const byDay = new Map();
  (bookings || []).forEach(b => {
    if (b.isBlock) return;
    const c = consultStart(b);
    if (!c) return;
    const k = dayKey(c.date);
    if (!byDay.has(k)) byDay.set(k, { morning: [], afternoon: [], evening: [] });
    byDay.get(k)[c.minutes < 720 ? "morning" : c.minutes < 1020 ? "afternoon" : "evening"].push({ b, minutes: c.minutes });
  });
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const k = dayKey(date);
    const cell = byDay.get(k) || { morning: [], afternoon: [], evening: [] };
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    if (weekend && !cell.morning.length && !cell.afternoon.length && !cell.evening.length) continue;
    const sort = list => list.sort((x, y) => x.minutes - y.minutes).map(x => x.b);
    days.push({
      date, key: k,
      closedMorning: date.getDay() === 2,   // 週二上午不開放
      blockedMorning: blockedSlots.has(`${k}_morning`),
      blockedAfternoon: blockedSlots.has(`${k}_afternoon`),
      morning: sort(cell.morning), afternoon: sort(cell.afternoon), evening: sort(cell.evening),
    });
  }
  return days;
}

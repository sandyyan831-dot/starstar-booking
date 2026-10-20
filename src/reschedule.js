// 後台「改時間」：把預約搬到別的日期／時間（例如客人想約晚上，前台只開放上午、下午）。純函式，不碰資料庫。
import { consultStart } from "./bookingOrder.js";

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];
const pad = n => String(n).padStart(2, "0");
const toMin = hm => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const toHM = min => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

const STANDARD = { "10:00-12:00": "morning", "14:00-16:00": "afternoon" };
const QUICK = new Set(["10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30"]);

export const dateInputValue = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const dateLabel = d => `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${DAY_NAMES[d.getDay()]}）`;

// 時間標示，例如 19:00–21:00 → 晚上 7:00–9:00
export function timeLabel(startHM, endHM) {
  const part = hm => {
    const h = Number(hm.slice(0, 2));
    return `${h % 12 === 0 ? 12 : h % 12}:${hm.slice(3, 5)}`;
  };
  const h = Number(startHM.slice(0, 2));
  const prefix = h < 12 ? "上午" : h < 18 ? "下午" : "晚上";
  return `${prefix} ${part(startHM)}–${part(endHM)}`;
}

// 新的時段代碼：剛好是前台原本的時段就沿用原本的代碼（前台才會正確顯示已滿），其他一律用 t開始e結束
export function slotKeyFor(date, startHM, endHM) {
  const day = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const std = STANDARD[`${startHM}-${endHM}`];
  if (std) return `${day}_${std}`;
  if (toMin(endHM) - toMin(startHM) === 30 && QUICK.has(startHM)) return `${day}_${startHM.replace(":", "")}`;
  return `${day}_t${startHM.replace(":", "")}e${endHM.replace(":", "")}`;
}

// 這筆預約目前的日期與起訖時間（HH:MM）；算不出來回傳 null
export function currentSlot(b) {
  const c = consultStart(b);
  if (!c) return null;
  return { date: c.date, start: toHM(c.minutes), end: toHM(c.endMinutes || c.minutes + 60) };
}

// 預設長度（分鐘），依服務項目與孩子人數
export function defaultMinutes(b) {
  if (b.consultId === "child") return 60 * (Number(b.childCount) || 1);
  if (b.consultId === "returning" || b.consultId === "textOnly") return 30;
  return 60;
}

export const addMinutes = (startHM, minutes) => toHM(Math.min(23 * 60 + 59, toMin(startHM) + minutes));

/** 檢查新時間是否合理；回傳錯誤文字，沒問題回傳 "" */
export function validateMove({ dateStr, start, end }) {
  if (!dateStr) return "請選擇日期";
  if (!start || !end) return "請選擇開始與結束時間";
  if (toMin(end) <= toMin(start)) return "結束時間要晚於開始時間";
  return "";
}

/** 同一天和新時間重疊的其他預約（只用來提醒，不擋住） */
export function findOverlaps(bookings, movingId, date, start, end) {
  const s = toMin(start), e = toMin(end);
  return (bookings || []).filter(o => {
    if (o.id === movingId || o.isBlock) return false;
    const c = consultStart(o);
    if (!c || c.date.getTime() !== date.getTime()) return false;
    const os = c.minutes, oe = c.endMinutes || c.minutes + 30;
    return s < oe && os < e;
  });
}

/**
 * 組出「搬到新時間」之後的預約資料（不含 id）。
 * 付款狀態先設成「待匯款」是資料庫規則規定新預約一定要從待匯款開始，搬完之後由呼叫端再改回原本的狀態。
 */
export function buildMovedBooking(b, { date, start, end }, now = new Date()) {
  const { id, ...rest } = b;
  const key = slotKeyFor(date, start, end);
  return {
    key,
    data: {
      ...rest,
      slotKey: key,
      date: dateLabel(date),
      time: timeLabel(start, end),
      movedFrom: { slotKey: b.slotKey || id, date: b.date || "", time: b.time || "" },
      movedAt: now.toISOString(),
      paymentStatus: "待匯款",
    },
  };
}

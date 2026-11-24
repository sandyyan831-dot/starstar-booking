// 一天最多看 2 份盤：同一筆預約就有 2 份以上（多位孩子、加看媽媽的本命盤）時，那天其他時段都不開放
// 客人看不到預約內容，所以把「這筆有幾份解讀」記在公開的 bookedSlots（readings，沒有個資），前台據此關掉那天
export const DAY_MAX_READINGS = 2;

/** 一筆預約有幾份解讀（每位孩子一份、加看媽媽本命盤一份；與別人／爸爸的合盤不另外算） */
export const readingsOf = b => Number(b?.sessionHours) || (Number(b?.childCount) || 1) + (b?.withMomChart ? 1 : 0);

/** 時段代碼的日期部分，例如 2026-12-3_morning → 2026-12-3 */
export const dayOf = key => String(key).split("_")[0];

/** 從 bookedSlots 的資料 [{ id, readings }] 找出已經排滿的日子 */
export function fullDays(slots) {
  const days = new Set();
  slots.forEach(s => { if (Number(s.readings) >= DAY_MAX_READINGS) days.add(dayOf(s.id)); });
  return days;
}

/** 寫進 bookedSlots 的公開資料：2 份以上才記 readings */
export function bookedSlotData(booking) {
  const n = readingsOf(booking);
  return { bookedAt: booking.bookedAt || "", ...(n >= DAY_MAX_READINGS ? { readings: n } : {}) };
}

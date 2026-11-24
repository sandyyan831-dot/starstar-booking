// 一天最多看 3 份盤：同一天所有預約的解讀份數加起來到 3 份，那天其他時段都不開放；
// 還沒到 3 份時，另一個時段只能約剩下的份數（例如上午 2 份，下午只能約 1 個孩子）
// 客人看不到預約內容，所以把「這筆有幾份解讀」記在公開的 bookedSlots（readings，沒有個資），前台據此計算
export const DAY_MAX_READINGS = 3;

/** 一筆預約有幾份解讀（每位孩子一份、加看媽媽本命盤一份；與別人／爸爸的合盤不另外算） */
export const readingsOf = b => Number(b?.sessionHours) || (Number(b?.childCount) || 1) + (b?.withMomChart ? 1 : 0);

/** 時段代碼的日期部分，例如 2026-12-3_morning → 2026-12-3 */
export const dayOf = key => String(key).split("_")[0];

// 半小時的時段（問問題、文字回覆，例如 2026-12-3_1030）不算一份盤
const isQuickKey = key => /^\d{4}$/.test(String(key).split("_")[1] || "");

/** 每天已經約了幾份盤：[{ id: 時段代碼, readings }] → Map(日期 → 份數)；沒記 readings 的算 1 份 */
export function dayUsage(slots) {
  const used = new Map();
  slots.forEach(s => {
    if (isQuickKey(s.id)) return;
    const day = dayOf(s.id);
    used.set(day, (used.get(day) || 0) + (Number(s.readings) || 1));
  });
  return used;
}

/** 已經排滿（3 份）的日子 */
export function fullDays(slots) {
  const days = new Set();
  dayUsage(slots).forEach((n, day) => { if (n >= DAY_MAX_READINGS) days.add(day); });
  return days;
}

/** 寫進 bookedSlots 的公開資料：2 份以上才記 readings（沒記的算 1 份） */
export function bookedSlotData(booking) {
  const n = readingsOf(booking);
  return { bookedAt: booking.bookedAt || "", ...(n >= 2 ? { readings: n } : {}) };
}

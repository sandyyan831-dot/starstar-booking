// 折扣碼的共用計算（不碰資料庫，方便測試）

export const DISCOUNT_AMOUNT = 200; // 所有折扣碼一律折 $200

const SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉容易看錯的 0/O、1/I

// 統一成大寫、去空白；格式不合（含特殊符號）回傳 null
export function normalizeCode(raw) {
  const c = String(raw ?? "").trim().toUpperCase();
  return /^[A-Z0-9_-]{2,30}$/.test(c) ? c : null;
}

export function generateCode(len = 6, rand = Math.random) {
  let s = "";
  for (let i = 0; i < len; i++) s += SAFE_CHARS[Math.floor(rand() * SAFE_CHARS.length)];
  return s;
}

export function priceAfterDiscount(price, hasDiscount) {
  return hasDiscount ? Math.max(0, price - DISCOUNT_AMOUNT) : price;
}

const NO_REFERRER = "（未填推薦人）";
const UNKNOWN = "（未登錄的代碼）";

/**
 * 統計「誰的推薦」帶來多少預約。
 * codes：[{ code, referrer, active }]；bookings：後台讀到的預約。
 * 推薦人一律以「代碼表」為準（不信任預約資料裡自己填的），代碼表裡沒有的歸到「未登錄的代碼」。
 */
export function summarize(codes, bookings) {
  const codeMap = new Map();
  (codes || []).forEach(c => codeMap.set(String(c.code).toUpperCase(), c));

  const used = (bookings || []).filter(b => b.discountCode);
  const perCode = new Map();
  const touch = (code) => {
    if (!perCode.has(code)) perCode.set(code, { uses: 0, paid: 0, discountAll: 0, discountPaid: 0 });
    return perCode.get(code);
  };
  used.forEach(b => {
    const code = String(b.discountCode).toUpperCase();
    const t = touch(code);
    const amt = Number(b.discountAmount) || 0;
    t.uses += 1; t.discountAll += amt;
    if (b.paymentStatus === "已收款") { t.paid += 1; t.discountPaid += amt; }
  });

  const rows = [];
  (codes || []).forEach(c => {
    const code = String(c.code).toUpperCase();
    const t = perCode.get(code) || { uses: 0, paid: 0, discountAll: 0, discountPaid: 0 };
    rows.push({ code, referrer: (c.referrer || "").trim() || NO_REFERRER, active: c.active !== false, known: true, ...t });
  });
  perCode.forEach((t, code) => {
    if (!codeMap.has(code)) rows.push({ code, referrer: UNKNOWN, active: false, known: false, ...t });
  });
  rows.sort((a, b) => b.uses - a.uses || a.code.localeCompare(b.code));

  const byRef = new Map();
  rows.forEach(r => {
    if (!byRef.has(r.referrer)) byRef.set(r.referrer, { referrer: r.referrer, codes: [], uses: 0, paid: 0, discountAll: 0, discountPaid: 0 });
    const g = byRef.get(r.referrer);
    g.codes.push(r.code);
    g.uses += r.uses; g.paid += r.paid; g.discountAll += r.discountAll; g.discountPaid += r.discountPaid;
  });
  const byReferrer = [...byRef.values()].sort((a, b) => b.uses - a.uses || a.referrer.localeCompare(b.referrer));

  return {
    rows, byReferrer,
    totals: {
      codes: (codes || []).length,
      activeCodes: (codes || []).filter(c => c.active !== false).length,
      uses: used.length,
      paid: used.filter(b => b.paymentStatus === "已收款").length,
      discountAll: used.reduce((s, b) => s + (Number(b.discountAmount) || 0), 0),
      discountPaid: used.filter(b => b.paymentStatus === "已收款").reduce((s, b) => s + (Number(b.discountAmount) || 0), 0),
    },
  };
}

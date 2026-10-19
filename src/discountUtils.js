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

/* ── 每月匯出給團購主（不含生日、問題等個資，姓名只留第一個字） ── */

// 王小明 → 王○○；Amy Chen → A○○；只有一個字就原樣保留
export function maskName(raw) {
  const chars = Array.from(String(raw ?? "").trim());
  if (chars.length === 0) return "";
  if (chars.length === 1) return chars[0];
  return chars[0] + "○".repeat(Math.min(chars.length - 1, 2));
}

const pad2 = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;

// 預設月份：今天往前一個月（每月 7 號匯出上個月）
export function previousMonth(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// 諮詢當天：優先用時段代碼（2026-10-20_morning），沒有的話讀「2026/10/20（二）」
export function consultDate(b) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})_/.exec(String(b.slotKey || "")) || /^(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(String(b.date || ""));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export const EXPORT_HEADERS = ["序號", "預約送出日", "諮詢日期", "服務項目", "客人（已遮罩）", "折扣碼", "折抵金額", "付款狀態"];

/**
 * 依推薦人整理某個月的折扣碼使用紀錄（以「諮詢當天」算月份）。
 * 只列代碼表裡登錄過的代碼；預設只算已收款，includePending 為 true 時連待匯款一起列。
 * 回傳 [{ referrer, codes, rows: [[...]], total, discount }]，每位推薦人一份。
 */
export function buildMonthlyExports(codes, bookings, { year, month, includePending = false }) {
  const codeMap = new Map();
  (codes || []).forEach(c => codeMap.set(String(c.code).toUpperCase(), c));

  const groups = new Map();
  (codes || []).forEach(c => {
    const ref = (c.referrer || "").trim() || NO_REFERRER;
    if (!groups.has(ref)) groups.set(ref, { referrer: ref, codes: [], items: [] });
    groups.get(ref).codes.push(String(c.code).toUpperCase());
  });

  (bookings || []).filter(b => b.discountCode).forEach(b => {
    const code = String(b.discountCode).toUpperCase();
    const c = codeMap.get(code);
    if (!c) return;
    const day = consultDate(b);
    if (!day || day.getFullYear() !== year || day.getMonth() + 1 !== month) return;
    const sent = new Date(b.bookedAt);
    const paid = b.paymentStatus === "已收款";
    if (!paid && !includePending) return;
    const ref = (c.referrer || "").trim() || NO_REFERRER;
    groups.get(ref).items.push({ sent, b, code, paid });
  });

  return [...groups.values()].map(g => {
    g.items.sort((x, y) => consultDate(x.b) - consultDate(y.b) || x.sent - y.sent);
    const rows = g.items.map((it, i) => [
      i + 1, isNaN(it.sent) ? "" : ymd(it.sent), it.b.date || "", it.b.consultType || "", maskName(it.b.line),
      it.code, Number(it.b.discountAmount) || 0, it.paid ? "已收款" : "待匯款",
    ]);
    return { referrer: g.referrer, codes: g.codes.sort(), rows, total: rows.length, discount: rows.reduce((s, r) => s + r[6], 0) };
  }).sort((a, b) => b.total - a.total || a.referrer.localeCompare(b.referrer));
}

const csvCell = v => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // 避免被 Excel 當成公式
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// 轉成 CSV（開頭加 BOM，Excel 才不會把中文變亂碼）
export function toCsv(group, { year, month }) {
  const lines = [
    [`${year} 年 ${month} 月 折扣碼使用紀錄`],
    ["推薦人", group.referrer],
    ["折扣碼", group.codes.join("、")],
    [],
    EXPORT_HEADERS,
    ...group.rows,
    [],
    ["合計", `${group.total} 筆`, "", "", "", "", group.discount],
  ];
  return "﻿" + lines.map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// 後台預約列表：依「諮詢時間」排序、依日期分組（純函式，不碰資料庫）

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

// 由時段代碼（2026-10-29_afternoon、2026-10-29_1030）算出諮詢日期與開始分鐘數；算不出來回傳 null
export function consultStart(b) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})_(\w+)$/.exec(String(b.slotKey || b.id || ""));
  if (!m) return null;
  const slot = m[4];
  const minutes = slot === "morning" ? 600 : slot === "afternoon" ? 840
    : /^\d{4}$/.test(slot) ? Number(slot.slice(0, 2)) * 60 + Number(slot.slice(2)) : 0;
  return { date: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), minutes };
}

const dayLabel = (d, today) => {
  const diff = Math.round((d - today) / 86400000);
  const tag = diff === 0 ? "　今天" : diff === 1 ? "　明天" : diff === 2 ? "　後天" : "";
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）${tag}`;
};

/**
 * 回傳 { upcoming, past }，各是 [{ key, label, items }]（每天一組，組內依時間早到晚）：
 * upcoming：今天起，日期由近到遠；past：已過的日期，由近到遠。算不出時間的預約放進 upcoming 最後一組「時間未知」。
 */
export function groupByConsultDay(bookings, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = new Map();
  const unknown = [];
  bookings.forEach(b => {
    const c = consultStart(b);
    if (!c) { unknown.push(b); return; }
    const key = c.date.getTime();
    if (!days.has(key)) days.set(key, { key: String(key), date: c.date, items: [] });
    days.get(key).items.push({ b, minutes: c.minutes });
  });
  const finish = g => ({
    key: g.key, label: dayLabel(g.date, today),
    items: g.items.sort((x, y) => x.minutes - y.minutes || String(x.b.bookedAt || "").localeCompare(String(y.b.bookedAt || ""))).map(x => x.b),
  });
  const all = [...days.values()];
  const upcoming = all.filter(g => g.date >= today).sort((a, b) => a.date - b.date).map(finish);
  const past = all.filter(g => g.date < today).sort((a, b) => b.date - a.date).map(finish);
  if (unknown.length) upcoming.push({ key: "unknown", label: "時間未知", items: unknown });
  return { upcoming, past };
}

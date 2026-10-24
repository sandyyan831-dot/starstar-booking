// 後台「👥 客人」：已經諮詢過（預約日期已過）的預約收在這裡
// 依人：同一位客人（LINE 名稱）的每次諮詢收在一起，回頭客再約時看得到以前談過什麼
// 依日期：所有已過去的預約，由近到遠
import React, { useMemo, useState } from "react";
import { consultStart } from "./bookingOrder.js";
import { bookingRows } from "./bookingRows.js";
import ExtraQuestion from "./ExtraQuestion.jsx";

const font = "'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif";
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const money = n => `$${Number(n || 0).toLocaleString("en-US")}`;
const dateText = d => `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;

// 跟 LINE 找人一樣的寬鬆比對：忽略表情符號、空格、標點、大小寫，「小美🌸」和「小美」算同一位
export function personKey(name) {
  const raw = String(name || "").trim().toLowerCase();
  const loose = raw.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}\p{Extended_Pictographic}‍️]/gu, "");
  return loose || raw || "（沒填 LINE 名稱）";
}

/** 已過去的預約（今天以前），附上諮詢日期，由近到遠 */
export function pastSessions(bookings, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return bookings
    .filter(b => !b.isBlock)
    .map(b => ({ b, c: consultStart(b) }))
    .filter(x => x.c && x.c.date < today)
    .sort((x, y) => y.c.date - x.c.date || y.c.minutes - x.c.minutes);
}

/** 依人分組：[{ key, name, sessions }]，最近諮詢的人排前面 */
export function groupByPerson(sessions) {
  const map = new Map();
  sessions.forEach(s => {
    const key = personKey(s.b.line);
    if (!map.has(key)) map.set(key, { key, name: s.b.line || "（沒填 LINE 名稱）", sessions: [] });
    map.get(key).sessions.push(s);
  });
  return [...map.values()];
}

const matches = (b, q) => !q || [b.line, b.childName, b.consultType, b.question, b.extraQuestion,
  ...(b.extraChildren || []).map(c => c.childName)].some(v => String(v || "").toLowerCase().includes(q));

function Tag({ paid }) {
  return paid ? null : (
    <span style={{ fontSize:10.5, color:"#b07a2a", background:"#fff3cd", borderRadius:6, padding:"1px 6px", marginLeft:6, fontWeight:600 }}>未收款</span>
  );
}

// 一次諮詢：一行摘要，點開看完整資料與私訊補充的問題
function Session({ s, showName, onSaveExtra }) {
  const [open, setOpen] = useState(false);
  const { b, c } = s;
  const paid = b.paymentStatus === "已收款";
  return (
    <div style={{ borderTop:"1px solid #f0eadd" }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:8, padding:"9px 2px", background:"transparent",
        border:"none", cursor:"pointer", textAlign:"left", fontFamily:font,
      }}>
        <span style={{ fontSize:13, color:"#6b5c3e", fontWeight:700, whiteSpace:"nowrap" }}>{dateText(c.date)}</span>
        <span style={{ flex:1, minWidth:0, fontSize:12.5, color:"#8a7340", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {showName && <strong style={{ color:"#5a4d35" }}>{b.line || "（沒填）"}・</strong>}
          {b.consultType}{b.childCount > 1 ? ` ×${b.childCount}` : ""}
          <Tag paid={paid} />
        </span>
        <span style={{ fontSize:12, color:"#b5a27a" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding:"2px 2px 12px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"84px 1fr", gap:"5px 8px", fontSize:12.5 }}>
            {[["時間", `${b.date || ""} ${b.time || ""}`], ["金額", b.price != null ? money(b.price) : ""],
              ...(b.discountCode ? [["折扣碼", b.discountCode]] : []),
              ...bookingRows(b)].filter(r => r[1] != null && String(r[1]).trim() !== "").map(([k, v], i) => (
              <React.Fragment key={k + i}>
                <div style={{ color:"#b5a27a" }}>{k}</div>
                <div style={{ color:"#5a4d35", lineHeight:1.6, wordBreak:"break-word", whiteSpace:"pre-wrap" }}>{v}</div>
              </React.Fragment>
            ))}
          </div>
          <ExtraQuestion key={b.id} booking={b} onSave={onSaveExtra} />
        </div>
      )}
    </div>
  );
}

function Person({ p, onSaveExtra }) {
  const [open, setOpen] = useState(false);
  const last = p.sessions[0];
  const kids = [...new Set(p.sessions.flatMap(s => [s.b.childName, ...(s.b.extraChildren || []).map(c => c.childName)]).filter(Boolean))];
  return (
    <div style={{ background:"#fefcf7", border:"1px solid #e5ddd0", borderRadius:12, padding:"10px 14px" }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:10, background:"transparent", border:"none",
        cursor:"pointer", textAlign:"left", padding:0, fontFamily:font,
      }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#6b5c3e" }}>
            {p.name}
            {p.sessions.length > 1 && <span style={{ fontSize:11, color:"#2d6a3f", background:"#e3f3e8", borderRadius:6, padding:"1px 6px", marginLeft:6 }}>回頭客</span>}
          </div>
          <div style={{ fontSize:12, color:"#b5a27a", marginTop:2 }}>
            諮詢 {p.sessions.length} 次・最近 {dateText(last.c.date)}{kids.length ? `・孩子：${kids.join("、")}` : ""}
          </div>
        </div>
        <span style={{ fontSize:12, color:"#b5a27a" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ marginTop:8 }}>{p.sessions.map(s => <Session key={s.b.id} s={s} onSaveExtra={onSaveExtra} />)}</div>}
    </div>
  );
}

export default function CustomersPanel({ bookings, onSaveExtra }) {
  const [mode, setMode] = useState("person");   // person：依人｜date：依日期
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const sessions = useMemo(() => pastSessions(bookings), [bookings]);
  const shown = sessions.filter(s => matches(s.b, q));
  const people = useMemo(() => groupByPerson(shown), [shown]);

  return (
    <div style={{ fontFamily:font }}>
      <div style={{ fontSize:12.5, color:"#8a7340", marginBottom:10, lineHeight:1.6 }}>
        已經諮詢過的預約（日期已過）都收在這裡：共 {groupByPerson(sessions).length} 位客人、{sessions.length} 次諮詢。
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜尋 LINE 名稱、孩子稱呼、問題…"
          style={{ flex:"1 1 180px", minWidth:0, padding:"8px 12px", borderRadius:10, border:"1px solid #ddd2bb", background:"#fffdf8", fontSize:13, fontFamily:font, boxSizing:"border-box" }} />
        <div style={{ display:"flex", gap:4 }}>
          {[{ key:"person", label:"依人" }, { key:"date", label:"依日期" }].map(o => (
            <button key={o.key} onClick={() => setMode(o.key)} style={{
              padding:"6px 12px", borderRadius:16, border:`1px solid ${mode === o.key ? "#b09650" : "#e5ddd0"}`,
              background:mode === o.key ? "#fefcf7" : "transparent", color:mode === o.key ? "#7a6530" : "#b5a27a",
              fontSize:12.5, fontWeight:mode === o.key ? 700 : 500, cursor:"pointer", fontFamily:font,
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      {!shown.length && (
        <div style={{ textAlign:"center", padding:30, color:"#b5a27a", fontSize:13 }}>{q ? "找不到符合的客人" : "還沒有已經諮詢過的預約"}</div>
      )}

      {mode === "person"
        ? <div style={{ display:"flex", flexDirection:"column", gap:8 }}>{people.map(p => <Person key={p.key} p={p} onSaveExtra={onSaveExtra} />)}</div>
        : shown.length > 0 && (
          <div style={{ background:"#fefcf7", border:"1px solid #e5ddd0", borderRadius:12, padding:"4px 14px" }}>
            {shown.map(s => <Session key={s.b.id} s={s} showName onSaveExtra={onSaveExtra} />)}
          </div>
        )}
    </div>
  );
}

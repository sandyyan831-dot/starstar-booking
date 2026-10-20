import React, { useMemo, useState } from "react";
import { buildWeek, mondayOf, addDays, timeText, SERVICE_SHORT } from "./weekData.js";
import { bookingRows } from "./bookingRows.js";

const font = "'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif";
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const money = n => `$${Number(n).toLocaleString("en-US")}`;
const md = d => `${d.getMonth() + 1}/${d.getDate()}`;

const serviceText = b => {
  const base = SERVICE_SHORT[b.consultId] || b.consultType || "諮詢";
  return b.childCount > 1 ? `${base} ×${b.childCount}` : base;
};

function Chip({ b, onOpen }) {
  const paid = b.paymentStatus === "已收款";
  const days = b.bookedAt ? Math.floor((Date.now() - new Date(b.bookedAt).getTime()) / 86400000) : 0;
  const overdue = !paid && days >= 3;
  const t = timeText(b);
  return (
    <button onClick={() => onOpen(b)} style={{
      display:"block", width:"100%", textAlign:"left", cursor:"pointer", fontFamily:font,
      padding:"6px 8px", borderRadius:8, marginBottom:5,
      border:`1px solid ${overdue ? "#e0a49a" : paid ? "#b9dcc0" : "#ecd596"}`,
      borderLeft:`4px solid ${paid ? "#6a9a5b" : "#d4a03a"}`,
      background: paid ? "#eef8f0" : "#fff8e3",
    }}>
      <div style={{ fontSize:13, fontWeight:700, color:"#4f4529", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {t && <span style={{ color:"#8a7340", marginRight:5 }}>{t}</span>}{b.line || "（沒填）"}
      </div>
      <div style={{ fontSize:11, color: overdue ? "#c0392b" : "#8a7340", marginTop:1 }}>
        {serviceText(b)}{b.discountCode ? " ・🎟" : ""}{!paid ? (overdue ? " ・⚠ 逾期未匯款" : " ・待匯款") : ""}
      </div>
    </button>
  );
}

function Cell({ items, closed, blocked, onOpen, dim }) {
  const base = { padding:"8px 8px 3px", borderRadius:10, minHeight:54, opacity: dim ? 0.6 : 1 };
  if (closed) return <div style={{ ...base, background:"#ececec", color:"#9a9a9a", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>公休</div>;
  if (blocked && !items.length) return <div style={{ ...base, background:"#f1e6e4", color:"#b07a70", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>🔒 已封鎖</div>;
  if (!items.length) return <div style={{ ...base, background:"#fbf8f1", border:"1px dashed #e5ddd0", color:"#cbbf9f", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>空</div>;
  return <div style={{ ...base, background:"#fefcf7", border:"1px solid #e5ddd0" }}>{items.map(b => <Chip key={b.id} b={b} onOpen={onOpen} />)}</div>;
}

function Detail({ b, onClose, referrerOf, onReschedule }) {
  const paid = b.paymentStatus === "已收款";
  const rows = [
    ["時間", `${b.date || ""} ${b.time || ""}`],
    ["服務", `${b.consultType || ""}${b.childCount > 1 ? `（${b.childCount} 位孩子）` : ""}`],
    ["付款", paid ? "✓ 已收款" : "⏳ 待匯款"],
    ["金額", b.price != null ? `${money(b.price)}${b.discountAmount > 0 ? `（原價 ${money(b.listPrice)}，折抵 ${money(b.discountAmount)}）` : ""}` : ""],
    ...(b.discountCode ? [["折扣碼", `${b.discountCode}${referrerOf ? `（推薦人：${referrerOf(b.discountCode)}）` : ""}`]] : []),
  ].filter(r => r[1]);
  const full = bookingRows(b).filter(r => r[1] !== undefined && r[1] !== "");
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(60,50,30,0.35)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fefcf7", borderRadius:16, padding:"20px 20px 16px", width:"100%", maxWidth:420, maxHeight:"85vh", overflowY:"auto", fontFamily:font, boxShadow:"0 8px 30px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize:16, fontWeight:700, color:"#6b5c3e", marginBottom:2 }}>{b.line || "（沒填）"}</div>
        <div style={{ height:10 }} />
        <div style={{ display:"grid", gridTemplateColumns:"84px 1fr", gap:"6px 8px", fontSize:13 }}>
          {rows.map(([k, v]) => (
            <React.Fragment key={k}>
              <div style={{ color:"#b5a27a" }}>{k}</div>
              <div style={{ color:"#5a4d35", lineHeight:1.6, wordBreak:"break-word" }}>{v}</div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ borderTop:"1px solid #f0eadd", margin:"12px 0" }} />
        <div style={{ display:"grid", gridTemplateColumns:"84px 1fr", gap:"6px 8px", fontSize:13 }}>
          {full.filter(([k]) => k !== "Line").map(([k, v], i) => (
            <React.Fragment key={k + i}>
              <div style={{ color:"#b5a27a" }}>{k}</div>
              <div style={{ color:"#5a4d35", lineHeight:1.6, wordBreak:"break-word", whiteSpace:"pre-wrap" }}>{v}</div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ fontSize:10, color:"#c4b48a", marginTop:12 }}>預約時間：{b.bookedAt ? new Date(b.bookedAt).toLocaleString("zh-TW") : "—"}</div>
        {onReschedule && <button onClick={() => onReschedule(b)} style={{ width:"100%", marginTop:16, padding:"10px 0", borderRadius:10, border:"none", background:"linear-gradient(135deg, #c9ab5a, #b09650)", color:"#fffdf8", fontSize:14, fontWeight:700, cursor:"pointer" }}>🕒 改時間</button>}
        <button onClick={onClose} style={{ width:"100%", marginTop:onReschedule ? 8 : 16, padding:"10px 0", borderRadius:10, border:"1.5px solid #cbba95", background:"transparent", color:"#8a7340", fontSize:14, fontWeight:700, cursor:"pointer" }}>關閉</button>
      </div>
    </div>
  );
}

export default function WeekView({ bookings, blockedSlots, referrerOf, onReschedule }) {
  const [monday, setMonday] = useState(() => mondayOf(new Date()));
  const [open, setOpen] = useState(null);
  const days = useMemo(() => buildWeek(bookings, monday, blockedSlots), [bookings, monday, blockedSlots]);
  const todayKey = (() => { const t = new Date(); return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`; })();
  const thisMonday = mondayOf(new Date());
  const isThisWeek = monday.getTime() === thisMonday.getTime();
  const total = days.reduce((n, d) => n + d.morning.length + d.afternoon.length, 0);
  const navBtn = { padding:"7px 12px", borderRadius:8, border:"1px solid #d9cfb4", background:"#fefcf7", color:"#7a6530", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:font };

  return (
    <div style={{ fontFamily:font }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:10 }}>
        <button onClick={() => setMonday(addDays(monday, -7))} style={navBtn}>‹ 上一週</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:15, fontWeight:700, color:"#6b5c3e" }}>{md(monday)} – {md(addDays(monday, 6))}</div>
          <div style={{ fontSize:11, color:"#b5a27a" }}>{isThisWeek ? "本週" : monday < thisMonday ? "過去" : `${Math.round((monday - thisMonday) / (7 * 86400000))} 週後`}・{total} 筆預約</div>
        </div>
        <button onClick={() => setMonday(addDays(monday, 7))} style={navBtn}>下一週 ›</button>
      </div>
      {!isThisWeek && <button onClick={() => setMonday(thisMonday)} style={{ ...navBtn, width:"100%", marginBottom:10 }}>回到本週</button>}

      <div style={{ display:"grid", gridTemplateColumns:"40px minmax(0, 1fr) minmax(0, 1fr)", gap:6, alignItems:"stretch" }}>
        <div />
        <div style={{ textAlign:"center", fontSize:12, color:"#8a7340", fontWeight:700 }}>上午 10:00–12:00</div>
        <div style={{ textAlign:"center", fontSize:12, color:"#8a7340", fontWeight:700 }}>下午 2:00–4:00</div>
        {days.map(d => {
          const isToday = d.key === todayKey;
          const past = d.date < new Date(new Date().setHours(0, 0, 0, 0));
          return (
            <React.Fragment key={d.key}>
              <div style={{ textAlign:"center", paddingTop:8, borderRadius:10, background: isToday ? "#f4d675" : "transparent", color: isToday ? "#4f4529" : "#7a6530", opacity: past ? 0.6 : 1 }}>
                <div style={{ fontSize:15, fontWeight:700 }}>{WEEK[d.date.getDay()]}</div>
                <div style={{ fontSize:11 }}>{md(d.date)}</div>
              </div>
              <Cell items={d.morning} closed={d.closedMorning && !d.morning.length} blocked={d.blockedMorning} onOpen={setOpen} dim={past} />
              <Cell items={d.afternoon} blocked={d.blockedAfternoon} onOpen={setOpen} dim={past} />
              {d.evening.length > 0 && (
                <>
                  <div style={{ textAlign:"center", fontSize:11, color:"#8a7340", fontWeight:700, paddingTop:10 }}>晚上</div>
                  <div style={{ gridColumn:"2 / 4" }}><Cell items={d.evening} onOpen={setOpen} dim={past} /></div>
                </>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:14, fontSize:11, color:"#b5a27a" }}>
        <span><span style={{ display:"inline-block", width:10, height:10, background:"#eef8f0", borderLeft:"3px solid #6a9a5b", marginRight:4 }} />已收款</span>
        <span><span style={{ display:"inline-block", width:10, height:10, background:"#fff8e3", borderLeft:"3px solid #d4a03a", marginRight:4 }} />待匯款</span>
        <span>🎟 有用折扣碼</span>
        <span>點預約可看詳細</span>
      </div>

      {open && <Detail b={open} onClose={() => setOpen(null)} referrerOf={referrerOf} onReschedule={onReschedule ? (b) => { setOpen(null); onReschedule(b); } : null} />}
    </div>
  );
}

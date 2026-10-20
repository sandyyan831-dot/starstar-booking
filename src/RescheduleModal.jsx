import React, { useMemo, useState } from "react";
import { currentSlot, defaultMinutes, addMinutes, dateInputValue, dateLabel, timeLabel, validateMove, findOverlaps } from "./reschedule.js";

const font = "'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif";
const DURATIONS = [[30, "30 分鐘"], [60, "1 小時"], [90, "1.5 小時"], [120, "2 小時"], [180, "3 小時"]];
const PRESETS = ["18:00", "18:30", "19:00", "19:30", "20:00"];
const input = { width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #ddd2bb", background:"#fffdf8", color:"#5a4d35", fontSize:15, outline:"none", fontFamily:font, boxSizing:"border-box" };
const lbl = { display:"block", fontSize:12, color:"#8a7340", fontWeight:600, marginBottom:4 };

/** 改預約的日期與時間（可以改成前台沒開放的時段，例如晚上）。onConfirm 回傳錯誤文字，成功回傳 "" */
export default function RescheduleModal({ booking, bookings, onClose, onConfirm }) {
  const cur = currentSlot(booking);
  const [dateStr, setDateStr] = useState(cur ? dateInputValue(cur.date) : "");
  const [start, setStart] = useState(cur ? cur.start : "19:00");
  const [minutes, setMinutes] = useState(() => {
    const dm = defaultMinutes(booking);
    return DURATIONS.some(d => d[0] === dm) ? dm : 60;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const end = addMinutes(start || "00:00", minutes);
  const date = dateStr ? new Date(Number(dateStr.slice(0, 4)), Number(dateStr.slice(5, 7)) - 1, Number(dateStr.slice(8, 10))) : null;
  const problem = validateMove({ dateStr, start, end });
  const overlaps = useMemo(() => (date && !problem ? findOverlaps(bookings, booking.id, date, start, end) : []), [bookings, booking.id, dateStr, start, end, problem]);
  const unchanged = cur && date && date.getTime() === cur.date.getTime() && start === cur.start && end === cur.end;

  const submit = async () => {
    if (problem || busy || unchanged) return;
    if (overlaps.length && !window.confirm(`這個時間和其他預約重疊：\n${overlaps.map(o => `・${o.line}（${o.time}）`).join("\n")}\n\n還是要改嗎？`)) return;
    setBusy(true); setError("");
    const err = await onConfirm({ date, start, end });
    setBusy(false);
    if (err) setError(err); else onClose();
  };

  return (
    <div onClick={busy ? undefined : onClose} style={{ position:"fixed", inset:0, background:"rgba(60,50,30,0.4)", zIndex:60, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fefcf7", borderRadius:16, padding:"20px 20px 16px", width:"100%", maxWidth:420, maxHeight:"90vh", overflowY:"auto", fontFamily:font, boxShadow:"0 8px 30px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize:16, fontWeight:700, color:"#6b5c3e" }}>🕒 改時間</div>
        <div style={{ fontSize:12.5, color:"#8a7340", margin:"4px 0 14px", lineHeight:1.6 }}>
          {booking.line}｜{booking.consultType}<br />
          目前：{booking.date} {booking.time}
        </div>

        <label style={lbl}>日期</label>
        <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} style={{ ...input, marginBottom:12 }} />

        <label style={lbl}>開始時間</label>
        <input type="time" step={900} value={start} onChange={e => setStart(e.target.value)} style={{ ...input, marginBottom:8 }} />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
          {PRESETS.map(p => (
            <button key={p} onClick={() => setStart(p)} style={{ padding:"4px 10px", borderRadius:14, border:`1px solid ${start === p ? "#b09650" : "#e5ddd0"}`, background:start === p ? "#fffdf8" : "transparent", color:start === p ? "#7a6530" : "#b5a27a", fontSize:12, fontWeight:600, cursor:"pointer" }}>晚上 {p}</button>
          ))}
        </div>

        <label style={lbl}>長度</label>
        <select value={minutes} onChange={e => setMinutes(Number(e.target.value))} style={{ ...input, marginBottom:12 }}>
          {DURATIONS.map(([m, t]) => <option key={m} value={m}>{t}</option>)}
        </select>

        <div style={{ background:"#eef5fa", border:"1.5px solid #d5e2ec", borderRadius:12, padding:"10px 14px", fontSize:14, color:"#3a4f5e", fontWeight:700, marginBottom:10 }}>
          {date && !problem ? `改成：${dateLabel(date)} ${timeLabel(start, end)}` : (problem || "請選擇日期與時間")}
        </div>

        {overlaps.length > 0 && (
          <div style={{ background:"#fff6d6", borderRadius:8, padding:"8px 12px", fontSize:12.5, color:"#8a6d1f", lineHeight:1.7, marginBottom:10 }}>
            ⚠ 和這些預約的時間重疊：{overlaps.map(o => `${o.line}（${o.time}）`).join("、")}
          </div>
        )}

        <div style={{ fontSize:11.5, color:"#b5a27a", lineHeight:1.7, marginBottom:12 }}>
          改好之後：原本的時段會重新開放給前台預約；已收款的預約，行事曆上的時間會一起更新。
        </div>

        {error && <div style={{ background:"#fdf0ee", border:"1px solid #f0c4bc", borderRadius:8, padding:"8px 12px", fontSize:12.5, color:"#c0392b", marginBottom:10 }}>{error}</div>}

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} disabled={busy} style={{ flex:1, padding:"11px 0", borderRadius:10, border:"1.5px solid #cbba95", background:"transparent", color:"#8a7340", fontSize:14, fontWeight:700, cursor:"pointer" }}>取消</button>
          <button onClick={submit} disabled={!!problem || busy || !!unchanged} style={{ flex:1, padding:"11px 0", borderRadius:10, border:"none", background:"linear-gradient(135deg, #c9ab5a, #b09650)", color:"#fffdf8", fontSize:14, fontWeight:700, cursor:(problem || busy || unchanged) ? "not-allowed" : "pointer", opacity:(problem || unchanged) ? 0.5 : 1 }}>{busy ? "改時間中…" : "確定改時間"}</button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { db } from "./firebase.js";
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";

const ADMIN_PASSWORD = "starstar2026";
const SLOT_DAYS = [3, 4, 5];
const SLOTS = [
  { label: "上午 10:00–12:00", id: "morning", short: "上午" },
  { label: "下午 2:00–4:00", id: "afternoon", short: "下午" },
];

const font = "'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif";
const serifFont = "Georgia, 'Times New Roman', serif";

function getNext2MonthsDates() {
  const dates = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(today); end.setMonth(end.getMonth() + 2);
  let d = new Date(today); d.setDate(d.getDate() + 1);
  while (d <= end) {
    if (SLOT_DAYS.includes(d.getDay())) dates.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function dateKey(date, slotId) {
  return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}_${slotId}`;
}

function formatDateShort(date) {
  const dn = ["日","一","二","三","四","五","六"];
  return `${date.getMonth()+1}/${date.getDate()}（${dn[date.getDay()]}）`;
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("bookings"); // bookings | block

  const login = () => {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(false); }
    else setPwError(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "bookings"));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.bookedAt || "").localeCompare(a.bookedAt || ""));
      setBookings(list);

      const blockSnap = await getDocs(collection(db, "blockedSlots"));
      const blocked = new Set();
      blockSnap.forEach(d => blocked.add(d.id));
      setBlockedSlots(blocked);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (authed) loadData(); }, [authed]);

  const togglePayment = async (booking) => {
    const newStatus = booking.paymentStatus === "已收款" ? "待匯款" : "已收款";
    try {
      await updateDoc(doc(db, "bookings", booking.id), { paymentStatus: newStatus });
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, paymentStatus: newStatus } : b));
    } catch (e) { console.error(e); alert("更新失敗"); }
  };

  const deleteBooking = async (booking) => {
    if (!window.confirm(`確定要刪除這筆預約嗎？\n${booking.date} ${booking.time}\nLine: ${booking.line}\n\n刪除後此時段將重新開放預約`)) return;
    try {
      await deleteDoc(doc(db, "bookings", booking.id));
      setBookings(prev => prev.filter(b => b.id !== booking.id));
    } catch (e) { console.error(e); alert("刪除失敗"); }
  };

  const toggleBlock = async (key) => {
    const newBlocked = new Set(blockedSlots);
    try {
      if (newBlocked.has(key)) {
        await deleteDoc(doc(db, "blockedSlots", key));
        newBlocked.delete(key);
      } else {
        await setDoc(doc(db, "blockedSlots", key), { blockedAt: new Date().toISOString() });
        newBlocked.add(key);
      }
      setBlockedSlots(newBlocked);
    } catch (e) { console.error(e); alert("操作失敗"); }
  };

  const bookedKeys = useMemo(() => new Set(bookings.map(b => b.slotKey)), [bookings]);

  const filtered = bookings.filter(b => {
    if (filter === "pending") return b.paymentStatus !== "已收款";
    if (filter === "paid") return b.paymentStatus === "已收款";
    return true;
  });

  /* ── Login ── */
  if (!authed) {
    return (
      <div style={{
        minHeight:"100vh", background:"linear-gradient(180deg, #faf6ef, #f0eadd)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:font, padding:20,
      }}>
        <style>{`* { margin:0; padding:0; box-sizing:border-box; } body { background:#faf6ef; }`}</style>
        <div style={{
          background:"#fefcf7", border:"1.5px solid #ddd2bb",
          borderRadius:20, padding:"40px 28px", maxWidth:360, width:"100%",
          textAlign:"center", boxShadow:"0 8px 40px rgba(160,140,100,0.1)",
        }}>
          <div style={{ fontSize:32, marginBottom:8, color:"#b09650" }}>✧</div>
          <h1 style={{ fontFamily:serifFont, fontSize:24, color:"#7a6530", marginBottom:4, fontWeight:600 }}>星語・星心</h1>
          <p style={{ fontSize:13, color:"#b5a27a", marginBottom:28 }}>管理後台</p>
          <input type="password" placeholder="請輸入管理密碼"
            value={pw} onChange={e=>{setPw(e.target.value);setPwError(false);}}
            onKeyDown={e=>{if(e.key==="Enter")login();}}
            style={{
              width:"100%", padding:"12px 14px", borderRadius:10,
              border:`1.5px solid ${pwError?"#d4836a":"#ddd2bb"}`,
              background:"#fffdf8", color:"#5a4d35", fontSize:14,
              outline:"none", boxSizing:"border-box", textAlign:"center", marginBottom:8,
            }} />
          {pwError && <p style={{ fontSize:12, color:"#d4836a", marginBottom:8 }}>密碼錯誤</p>}
          <button onClick={login} style={{
            width:"100%", padding:"12px 0", borderRadius:10, border:"none",
            background:"linear-gradient(135deg, #c9ab5a, #b09650)",
            color:"#fffdf8", fontSize:15, fontWeight:700, cursor:"pointer", letterSpacing:2, marginTop:4,
          }}>登入</button>
        </div>
      </div>
    );
  }

  /* ── Dashboard ── */
  return (
    <div style={{
      minHeight:"100vh", background:"linear-gradient(180deg, #faf6ef, #f0eadd)",
      fontFamily:font, padding:"0 0 40px 0",
    }}>
      <style>{`* { margin:0; padding:0; box-sizing:border-box; } body { background:#faf6ef; }`}</style>

      {/* Header */}
      <div style={{
        background:"#fefcf7", borderBottom:"1px solid #e5ddd0",
        padding:"14px 20px", position:"sticky", top:0, zIndex:100,
        boxShadow:"0 2px 12px rgba(160,140,100,0.06)",
      }}>
        <div style={{ maxWidth:600, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h1 style={{ fontFamily:serifFont, fontSize:20, color:"#7a6530", fontWeight:600 }}>✧ 預約管理</h1>
          <button onClick={loadData} style={{
            padding:"6px 14px", borderRadius:8, border:"1px solid #cbba95",
            background:"transparent", color:"#8a7340", fontSize:12, cursor:"pointer", fontWeight:600,
          }}>重新整理</button>
        </div>
      </div>

      <div style={{ maxWidth:600, margin:"0 auto", padding:"16px 16px 0" }}>

        {/* Main tabs: 預約列表 / 封鎖時段 */}
        <div style={{ display:"flex", gap:0, marginBottom:16, background:"#e5ddd0", borderRadius:12, padding:3 }}>
          {[{key:"bookings",label:"📋 預約列表"},{key:"block",label:"🔒 封鎖時段"}].map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{
              flex:1, padding:"10px 0", borderRadius:10, border:"none",
              background:tab===t.key?"#fefcf7":"transparent",
              color:tab===t.key?"#7a6530":"#a09070",
              fontSize:14, fontWeight:tab===t.key?700:500, cursor:"pointer",
              boxShadow:tab===t.key?"0 1px 6px rgba(0,0,0,0.06)":"none",
              transition:"all 0.2s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ══════ TAB: Bookings ══════ */}
        {tab === "bookings" && (<>
          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:16 }}>
            {[
              { label:"總預約", value:bookings.filter(b=>!b.isBlock).length, color:"#7a6530" },
              { label:"待匯款", value:bookings.filter(b=>!b.isBlock && b.paymentStatus!=="已收款").length, color:"#d4836a" },
              { label:"已收款", value:bookings.filter(b=>!b.isBlock && b.paymentStatus==="已收款").length, color:"#6a9a5b" },
            ].map((s,i)=>(
              <div key={i} style={{
                background:"#fefcf7", border:"1px solid #e5ddd0",
                borderRadius:12, padding:"12px 8px", textAlign:"center",
              }}>
                <div style={{ fontSize:24, fontWeight:700, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:"#b5a27a" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div style={{ display:"flex", gap:6, marginBottom:16, background:"#f5f0e6", borderRadius:10, padding:3 }}>
            {[{key:"all",label:"全部"},{key:"pending",label:"待匯款"},{key:"paid",label:"已收款"}].map(f=>(
              <button key={f.key} onClick={()=>setFilter(f.key)} style={{
                flex:1, padding:"8px 0", borderRadius:8, border:"none",
                background:filter===f.key?"#fefcf7":"transparent",
                color:filter===f.key?"#7a6530":"#b5a27a",
                fontSize:13, fontWeight:filter===f.key?700:500, cursor:"pointer",
                boxShadow:filter===f.key?"0 1px 4px rgba(0,0,0,0.06)":"none",
              }}>{f.label}</button>
            ))}
          </div>

          {loading && <div style={{ textAlign:"center", padding:40, color:"#b5a27a" }}>載入中…</div>}

          {!loading && filtered.length===0 && (
            <div style={{ textAlign:"center", padding:50, color:"#c4b48a" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>✧</div>
              <p>目前沒有{filter==="pending"?"待匯款的":filter==="paid"?"已收款的":""}預約</p>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {filtered.map(b => {
              const isPaid = b.paymentStatus === "已收款";
              return (
                <div key={b.id} style={{
                  background:"#fefcf7", border:"1px solid #e5ddd0",
                  borderRadius:14, padding:"16px 18px",
                  borderLeft:`4px solid ${isPaid?"#6a9a5b":"#d4a03a"}`,
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:700, color:"#6b5c3e" }}>{b.date}</div>
                      <div style={{ fontSize:12, color:"#b5a27a", marginTop:2 }}>{b.time}</div>
                    </div>
                    <button onClick={()=>togglePayment(b)} style={{
                      padding:"5px 12px", borderRadius:20, border:"none",
                      background:isPaid?"linear-gradient(135deg,#d4edda,#c3e6cb)":"linear-gradient(135deg,#fff3cd,#ffeeba)",
                      color:isPaid?"#2d6a3f":"#856404",
                      fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap",
                    }}>{isPaid?"✓ 已收款":"⏳ 待匯款"}</button>
                  </div>

                  <div style={{
                    background:"rgba(176,150,80,0.06)", borderRadius:8,
                    padding:"6px 10px", marginBottom:10, display:"inline-block",
                  }}>
                    <span style={{ fontSize:12, color:"#8a7340", fontWeight:600 }}>{b.consultTag} — {b.consultType}</span>
                    <span style={{ fontSize:12, color:"#b5a27a", marginLeft:8 }}>${b.price?.toLocaleString()}</span>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"70px 1fr", gap:"6px 8px", fontSize:13 }}>
                    {[
                      ["Line", b.line],
                      ["出生", `${b.birthYear}/${b.birthMonth}/${b.birthDay} ${b.birthHour}:${b.birthMinute}`],
                      ["出生地", b.birthPlace],
                      ["問題", b.question],
                    ].map(([label, value]) => (
                      <React.Fragment key={label}>
                        <div style={{ color:"#b5a27a", fontWeight:500 }}>{label}</div>
                        <div style={{ color:"#5a4d35", lineHeight:1.6, wordBreak:"break-word" }}>{value}</div>
                      </React.Fragment>
                    ))}
                  </div>

                  <div style={{
                    fontSize:10, color:"#c4b48a", marginTop:10,
                    borderTop:"1px solid #f0eadd", paddingTop:8,
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                  }}>
                    <span>預約時間：{b.bookedAt ? new Date(b.bookedAt).toLocaleString("zh-TW") : "—"}</span>
                    <button onClick={()=>deleteBooking(b)} style={{
                      padding:"4px 10px", borderRadius:6,
                      border:"1px solid #e8c4c4", background:"#fdf5f5",
                      color:"#c0392b", fontSize:11, cursor:"pointer",
                      fontWeight:600, transition:"all 0.2s", fontFamily:font,
                    }}
                      onMouseEnter={e=>{e.target.style.background="#f8e0e0";}}
                      onMouseLeave={e=>{e.target.style.background="#fdf5f5";}}
                    >刪除預約</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

        {/* ══════ TAB: Block Slots ══════ */}
        {tab === "block" && (
          <BlockSlotsPanel
            blockedSlots={blockedSlots}
            bookedKeys={bookedKeys}
            onToggle={toggleBlock}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}

/* ── Block Slots Panel ── */
function BlockSlotsPanel({ blockedSlots, bookedKeys, onToggle, loading }) {
  const dates = useMemo(() => getNext2MonthsDates(), []);

  const months = useMemo(() => {
    const m = {};
    dates.forEach(d => {
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (!m[k]) m[k] = { year:d.getFullYear(), month:d.getMonth(), dates:[] };
      m[k].dates.push(d);
    });
    return Object.values(m).sort((a,b) => a.year-b.year || a.month-b.month);
  }, [dates]);

  if (loading) return <div style={{ textAlign:"center", padding:40, color:"#b5a27a" }}>載入中…</div>;

  return (
    <div>
      <p style={{ fontSize:13, color:"#8a7340", marginBottom:16, lineHeight:1.7 }}>
        點擊按鈕即可封鎖或開放時段。<br/>
        <span style={{ color:"#b5a27a", fontSize:12 }}>🔴 已封鎖　🟡 已有預約　🟢 可預約</span>
      </p>

      {months.map(m => (
        <div key={`${m.year}-${m.month}`} style={{ marginBottom:28 }}>
          <h3 style={{
            fontFamily:"Georgia, 'Times New Roman', serif",
            fontSize:18, color:"#8a7340", marginBottom:12, fontWeight:600,
          }}>{m.year} 年 {m.month+1} 月</h3>

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {m.dates.map(date => {
              return (
                <div key={date.toISOString()} style={{
                  background:"#fefcf7", border:"1px solid #e5ddd0",
                  borderRadius:12, padding:"12px 16px",
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  gap:10,
                }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#6b5c3e", minWidth:100 }}>
                    {formatDateShort(date)}
                  </div>
                  <div style={{ display:"flex", gap:6, flex:1, justifyContent:"flex-end" }}>
                    {SLOTS.map(slot => {
                      const key = dateKey(date, slot.id);
                      const isBooked = bookedKeys.has(key);
                      const isBlocked = blockedSlots.has(key);

                      let bg, color, label, border;
                      if (isBooked) {
                        bg = "linear-gradient(135deg,#fff3cd,#ffeeba)";
                        color = "#856404";
                        label = `${slot.short} 已預約`;
                        border = "1px solid #ffeeba";
                      } else if (isBlocked) {
                        bg = "linear-gradient(135deg,#fde8e8,#f8d0d0)";
                        color = "#c0392b";
                        label = `${slot.short} 已封鎖`;
                        border = "1px solid #f0b8b8";
                      } else {
                        bg = "linear-gradient(135deg,#d4edda,#c3e6cb)";
                        color = "#2d6a3f";
                        label = `${slot.short} 可預約`;
                        border = "1px solid #c3e6cb";
                      }

                      return (
                        <button key={slot.id}
                          onClick={() => { if (!isBooked) onToggle(key); }}
                          disabled={isBooked}
                          style={{
                            padding:"7px 12px", borderRadius:8,
                            border, background:bg, color,
                            fontSize:11, fontWeight:700,
                            cursor: isBooked ? "not-allowed" : "pointer",
                            opacity: isBooked ? 0.7 : 1,
                            transition:"all 0.2s", whiteSpace:"nowrap",
                            fontFamily:font,
                          }}
                        >{label}</button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

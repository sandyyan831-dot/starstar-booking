import React, { useMemo, useState } from "react";
import { summarize, normalizeCode, generateCode, DISCOUNT_AMOUNT, previousMonth, buildMonthlyExports, toCsv, EXPORT_HEADERS } from "./discountUtils.js";

const font = "'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif";

// 需要貼進 Firebase 主控台「規則」的片段（放在 match /databases/{database}/documents { ... } 裡面）
export const RULES_SNIPPET = `    match /discountCodes/{code} {
      allow get: if true;          // 預約表單用代碼檢查（只能一組一組查，不能列出全部）
      allow list, write: if isAdmin();
    }`;

const card = { background:"#fefcf7", border:"1px solid #e5ddd0", borderRadius:14, padding:"14px 16px" };
const input = { width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #ddd2bb", background:"#fffdf8", color:"#5a4d35", fontSize:14, outline:"none", fontFamily:font, boxSizing:"border-box" };
const smallBtn = (bg, color, border) => ({ padding:"5px 10px", borderRadius:8, border:`1px solid ${border}`, background:bg, color, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:font });

export default function DiscountPanel({ codes, bookings, error, loading, onAdd, onToggle, onDelete }) {
  const [referrer, setReferrer] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  const sum = useMemo(() => summarize(codes, bookings), [codes, bookings]);

  // 每月匯出：預設上個月，只算已收款
  const prev = useMemo(() => previousMonth(), []);
  const [monthStr, setMonthStr] = useState(`${prev.year}-${String(prev.month).padStart(2, "0")}`);
  const [includePending, setIncludePending] = useState(false);
  const [openRef, setOpenRef] = useState("");
  const ym = useMemo(() => ({ year: Number(monthStr.slice(0, 4)), month: Number(monthStr.slice(5, 7)) }), [monthStr]);
  const exportsByRef = useMemo(
    () => (ym.year && ym.month ? buildMonthlyExports(codes, bookings, { ...ym, includePending }) : []),
    [codes, bookings, ym, includePending]
  );

  const copy = async (text, key) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch { /* 剪貼簿不可用時略過 */ }
  };

  const download = (g) => {
    const blob = new Blob([toCsv(g, ym)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `折扣碼使用紀錄_${g.referrer.replace(/[\\/:*?"<>|\s]+/g, "")}_${monthStr}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const downloadAll = async () => {
    for (const g of exportsByRef.filter(x => x.total > 0)) { download(g); await new Promise(r => setTimeout(r, 400)); }
  };

  const add = async () => {
    setMsg("");
    const c = normalizeCode(code);
    if (!referrer.trim()) { setMsg("請填寫推薦人"); return; }
    if (!c) { setMsg("折扣碼只能用英文字母、數字、- 或 _（2～30 個字）"); return; }
    if ((codes || []).some(x => String(x.code).toUpperCase() === c)) { setMsg("這組折扣碼已經存在"); return; }
    setBusy(true);
    const ok = await onAdd(c, referrer.trim());
    setBusy(false);
    if (ok) { setReferrer(""); setCode(""); setMsg(`已新增 ${c}`); } else setMsg("新增失敗，請稍後再試");
  };

  if (error === "rules") {
    return (
      <div style={{ ...card, fontFamily:font, lineHeight:1.8 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#c0392b", marginBottom:6 }}>還不能使用折扣碼</div>
        <div style={{ fontSize:13, color:"#5a4d35", marginBottom:10 }}>
          資料庫的規則還沒開放「折扣碼」。請到 Firebase 主控台 → Firestore Database → 規則，
          在 <code>match /databases/{"{database}"}/documents {"{"}</code> 裡面、<b>其他 match 區塊旁邊</b>，加上下面這一段，再按「發布」。其他規則不用動。
        </div>
        <pre style={{ background:"#f5f0e6", border:"1px solid #e5ddd0", borderRadius:10, padding:"10px 12px", fontSize:12, overflowX:"auto", whiteSpace:"pre" }}>{RULES_SNIPPET}</pre>
        <button onClick={() => copy(RULES_SNIPPET, "rules")} style={{ ...smallBtn("#fefcf7", "#8a7340", "#cbba95"), marginTop:8 }}>{copied === "rules" ? "已複製 ✓" : "複製這段規則"}</button>
      </div>
    );
  }
  if (error) return <div style={{ ...card, color:"#c0392b", fontFamily:font }}>折扣碼讀取失敗，請按右上角「重新整理」再試一次。</div>;
  if (loading) return <div style={{ textAlign:"center", padding:40, color:"#b5a27a", fontFamily:font }}>載入中…</div>;

  const t = sum.totals;
  return (
    <div style={{ fontFamily:font }}>
      {/* 總覽 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
        {[
          { label:"使用中的代碼", value:t.activeCodes, color:"#7a6530" },
          { label:"總使用次數", value:t.uses, color:"#7a6530" },
          { label:"其中已收款", value:t.paid, color:"#6a9a5b" },
          { label:"已收款折抵金額", value:`$${t.discountPaid.toLocaleString()}`, color:"#6a9a5b" },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign:"center", padding:"12px 8px" }}>
            <div style={{ fontSize:24, fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#b5a27a" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 依推薦人統計 */}
      <h3 style={{ fontSize:15, color:"#7a6530", margin:"4px 0 8px" }}>誰的推薦帶來多少預約</h3>
      {sum.byReferrer.length === 0 ? (
        <div style={{ ...card, color:"#b5a27a", fontSize:13, textAlign:"center", marginBottom:18 }}>還沒有折扣碼，先在下面新增一組。</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
          {sum.byReferrer.map(g => (
            <div key={g.referrer} style={{ ...card, display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#6b5c3e" }}>{g.referrer}</div>
                <div style={{ fontSize:11, color:"#b5a27a", marginTop:2, wordBreak:"break-all" }}>{g.codes.join("、")}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:20, fontWeight:700, color:"#7a6530", lineHeight:1.1 }}>{g.uses}<span style={{ fontSize:11, fontWeight:500, color:"#b5a27a" }}> 次使用</span></div>
                <div style={{ fontSize:11, color:"#6a9a5b" }}>已收款 {g.paid} 次・折抵 ${g.discountPaid.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 每月匯出 */}
      <h3 style={{ fontSize:15, color:"#7a6530", margin:"4px 0 8px" }}>每月匯出（給團購主）</h3>
      <div style={{ ...card, marginBottom:18 }}>
        {new Date().getDate() === 7 && <div style={{ fontSize:12.5, color:"#8a6d1f", background:"#fff6d6", borderRadius:8, padding:"6px 10px", marginBottom:10 }}>今天是 7 號，記得匯出上個月的紀錄給團購主 ✦</div>}
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:8 }}>
          <label style={{ fontSize:12, color:"#8a7340", fontWeight:600 }}>月份（以諮詢當天算）</label>
          <input type="month" value={monthStr} onChange={e => setMonthStr(e.target.value)} style={{ ...input, width:"auto", padding:"7px 10px" }} />
        </div>
        <label style={{ fontSize:12.5, color:"#5a4d35", display:"flex", alignItems:"center", gap:6, marginBottom:10, cursor:"pointer" }}>
          <input type="checkbox" checked={includePending} onChange={e => setIncludePending(e.target.checked)} />
          也列出還沒匯款的預約（預設只列已收款）
        </label>
        <div style={{ fontSize:11.5, color:"#b5a27a", lineHeight:1.7, marginBottom:10 }}>
          匯出內容只有：諮詢日期、預約送出日、服務項目、客人 LINE 名稱（只留第一個字）、折扣碼、折抵金額。不含生日、問題、金額以外的個資。
        </div>
        {exportsByRef.length === 0 ? (
          <div style={{ fontSize:13, color:"#b5a27a", textAlign:"center" }}>還沒有折扣碼</div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {exportsByRef.map(g => (
              <div key={g.referrer} style={{ border:"1px solid #e5ddd0", borderRadius:10, padding:"10px 12px", background:"#fffdf8" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#6b5c3e" }}>{g.referrer}</div>
                    <div style={{ fontSize:11.5, color:"#b5a27a" }}>{g.codes.join("、")}・{g.total} 筆・折抵 ${g.discount.toLocaleString()}</div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    {g.total > 0 && <button onClick={() => setOpenRef(openRef === g.referrer ? "" : g.referrer)} style={smallBtn("#fefcf7", "#8a7340", "#cbba95")}>{openRef === g.referrer ? "收起" : "預覽"}</button>}
                    <button onClick={() => download(g)} disabled={g.total === 0} style={{ ...smallBtn("#fefcf7", "#8a7340", "#cbba95"), opacity:g.total === 0 ? 0.45 : 1, cursor:g.total === 0 ? "not-allowed" : "pointer" }}>下載</button>
                  </div>
                </div>
                {openRef === g.referrer && (
                  <div style={{ overflowX:"auto", marginTop:8 }}>
                    <table style={{ borderCollapse:"collapse", fontSize:11.5, color:"#5a4d35", whiteSpace:"nowrap" }}>
                      <thead><tr>{EXPORT_HEADERS.map(h => <th key={h} style={{ textAlign:"left", padding:"3px 8px", borderBottom:"1px solid #e5ddd0", color:"#8a7340" }}>{h}</th>)}</tr></thead>
                      <tbody>{g.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding:"3px 8px", borderBottom:"1px solid #f0e9da" }}>{c}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            {exportsByRef.filter(g => g.total > 0).length > 1 && (
              <button onClick={downloadAll} style={{ ...smallBtn("#fefcf7", "#8a7340", "#cbba95"), padding:"8px 0" }}>全部下載（每位團購主各一份）</button>
            )}
          </div>
        )}
      </div>

      {/* 新增 */}
      <h3 style={{ fontSize:15, color:"#7a6530", margin:"4px 0 8px" }}>新增折扣碼（每組折抵 ${DISCOUNT_AMOUNT}）</h3>
      <div style={{ ...card, marginBottom:18 }}>
        <label style={{ fontSize:12, color:"#8a7340", fontWeight:600 }}>推薦人</label>
        <input style={{ ...input, margin:"4px 0 10px" }} placeholder="例如：核彈媽媽" value={referrer} onChange={e => setReferrer(e.target.value)} />
        <label style={{ fontSize:12, color:"#8a7340", fontWeight:600 }}>折扣碼</label>
        <div style={{ display:"flex", gap:8, margin:"4px 0 10px" }}>
          <input style={{ ...input, textTransform:"uppercase", letterSpacing:1 }} placeholder="自己取，或按「產生」" value={code} onChange={e => setCode(e.target.value)} />
          <button onClick={() => setCode(generateCode())} style={{ ...smallBtn("#fefcf7", "#8a7340", "#cbba95"), flexShrink:0, padding:"0 14px" }}>產生</button>
        </div>
        <button onClick={add} disabled={busy} style={{ width:"100%", padding:"11px 0", borderRadius:10, border:"none", background:"linear-gradient(135deg, #c9ab5a, #b09650)", color:"#fffdf8", fontSize:14, fontWeight:700, cursor:busy?"wait":"pointer", fontFamily:font }}>{busy ? "新增中…" : "新增"}</button>
        {msg && <div style={{ fontSize:12.5, marginTop:8, color: msg.startsWith("已新增") ? "#2d6a3f" : "#c0392b" }}>{msg}</div>}
      </div>

      {/* 全部代碼 */}
      <h3 style={{ fontSize:15, color:"#7a6530", margin:"4px 0 8px" }}>全部折扣碼</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {sum.rows.length === 0 && <div style={{ ...card, color:"#b5a27a", fontSize:13, textAlign:"center" }}>目前沒有折扣碼</div>}
        {sum.rows.map(r => (
          <div key={r.code} style={{ ...card, opacity: r.active || !r.known ? 1 : 0.6 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
              <div style={{ minWidth:0 }}>
                <span style={{ fontSize:16, fontWeight:700, letterSpacing:1.5, color:"#5a4d35", fontFamily:"ui-monospace, Menlo, monospace" }}>{r.code}</span>
                {!r.known && <span style={{ marginLeft:8, fontSize:11, color:"#c0392b", fontWeight:700 }}>⚠ 沒登錄過</span>}
                {r.known && !r.active && <span style={{ marginLeft:8, fontSize:11, color:"#a09070" }}>已停用</span>}
                <div style={{ fontSize:12, color:"#b5a27a", marginTop:2 }}>推薦人：{r.referrer}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0, fontSize:12, color:"#8a7340" }}>
                使用 {r.uses} 次<br /><span style={{ color:"#6a9a5b" }}>已收款 {r.paid}</span>
              </div>
            </div>
            {r.known && (
              <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
                <button onClick={() => copy(r.code, r.code)} style={smallBtn("#fefcf7", "#8a7340", "#cbba95")}>{copied === r.code ? "已複製 ✓" : "複製"}</button>
                <button onClick={() => onToggle(r.code, !r.active)} style={smallBtn("#fefcf7", "#8a7340", "#cbba95")}>{r.active ? "停用" : "重新啟用"}</button>
                <button onClick={() => { if (window.confirm(`確定要刪除折扣碼 ${r.code} 嗎？\n\n已經用過它的預約紀錄會保留，但這組代碼會變成「沒登錄過」。`)) onDelete(r.code); }}
                  style={smallBtn("#fdf5f5", "#c0392b", "#e8c4c4")}>刪除</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

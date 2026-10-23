// 後台：客人在 LINE 私訊補充的問題，Sandy 可以手動新增或修改（預約列表卡片與週曆詳細視窗共用）
import { useState } from "react";

const font = "'PingFang TC', 'Microsoft JhengHei', 'Helvetica Neue', sans-serif";

export default function ExtraQuestion({ booking, onSave }) {
  const saved = booking.extraQuestion || "";
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(saved);
  const [saving, setSaving] = useState(false);

  const start = () => { setText(saved); setEditing(true); };
  const save = async () => {
    setSaving(true);
    const ok = await onSave(booking, text.trim());
    setSaving(false);
    if (ok) setEditing(false);
  };

  const btn = (primary) => ({
    padding:"4px 12px", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:font,
    border:primary ? "none" : "1px solid #cbba95",
    background:primary ? "linear-gradient(135deg, #c9ab5a, #b09650)" : "#fefcf7",
    color:primary ? "#fffdf8" : "#8a7340",
  });

  return (
    <div style={{ marginTop:10, padding:"8px 10px", borderRadius:8, background:"#f7f3ea", border:"1px dashed #d9cba8", fontFamily:font }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:12, color:"#8a7340", fontWeight:700 }}>💬 私訊補充的問題</span>
        {!editing && <button onClick={start} style={btn(false)}>{saved ? "✏️ 修改" : "＋ 新增問題"}</button>}
      </div>
      {!editing && saved && (
        <div style={{ fontSize:13, color:"#5a4d35", lineHeight:1.7, marginTop:6, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{saved}</div>
      )}
      {editing && (
        <>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4} autoFocus
            placeholder="把客人在 LINE 私訊說的問題貼在這裡…"
            style={{
              width:"100%", boxSizing:"border-box", marginTop:6, padding:"8px 10px", borderRadius:8,
              border:"1px solid #d9cba8", fontSize:13, lineHeight:1.7, fontFamily:font, resize:"vertical", background:"#fff",
            }} />
          <div style={{ display:"flex", gap:6, justifyContent:"flex-end", marginTop:6 }}>
            <button onClick={() => setEditing(false)} disabled={saving} style={btn(false)}>取消</button>
            <button onClick={save} disabled={saving} style={btn(true)}>{saving ? "儲存中…" : "儲存"}</button>
          </div>
        </>
      )}
    </div>
  );
}

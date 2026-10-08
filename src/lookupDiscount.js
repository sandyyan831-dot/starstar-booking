// 檢查折扣碼是否有效（讀資料庫 discountCodes/{代碼}）
// 回傳：{ status: "valid", code } ｜ { status: "invalid" } ｜ { status: "unavailable" }（資料庫暫時無法驗證）
import { db } from "./firebase.js";
import { doc, getDoc } from "firebase/firestore";
import { normalizeCode } from "./discountUtils.js";

export async function lookupDiscountCode(raw) {
  const code = normalizeCode(raw);
  if (!code) return { status: "invalid" };
  try {
    const snap = await getDoc(doc(db, "discountCodes", code));
    if (!snap.exists() || snap.data().active === false) return { status: "invalid" };
    return { status: "valid", code };
  } catch (e) {
    console.error("discount lookup failed:", e);
    return { status: "unavailable" };
  }
}

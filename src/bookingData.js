// 組出要寫進資料庫的預約資料（純函式，不碰資料庫，方便測試）
import { discountTotal } from "./discountUtils.js";

export const MAX_CHILDREN = 3;

// 第 2、3 個孩子的欄位名稱（表單與資料共用）
export const childKeys = (n) => ({
  name: `c${n}Name`, gender: `c${n}Gender`,
  year: `c${n}BirthYear`, month: `c${n}BirthMonth`, day: `c${n}BirthDay`, hour: `c${n}BirthHour`, minute: `c${n}BirthMinute`,
  place: `c${n}BirthPlace`, country: `c${n}OverseasCountry`, region: `c${n}OverseasRegion`,
});
export const emptyChildFields = () => {
  const o = {};
  for (let n = 2; n <= MAX_CHILDREN; n++) Object.values(childKeys(n)).forEach(k => { o[k] = ""; });
  return o;
};
export const clampChildCount = (v) => Math.min(MAX_CHILDREN, Math.max(1, Number(v) || 1));

const placeText = (place, country, region) =>
  place === "國外" ? `國外 — ${country}・${region}` : place;

/**
 * key：預約的時段代碼；ct：服務項目；formData：表單內容；
 * discountCode：已通過檢查的折扣碼（沒有就傳空字串）。
 */
export function buildBookingData({ key, dateLabel, timeLabel, ct, formData, discountCode = "", now = new Date() }) {
  const isChild = ct?.id === "child";
  const childCount = isChild ? clampChildCount(formData.childCount) : 1;   // 一次看幾位孩子，每位各收一次費用、各折一次
  const listPrice = (ct?.price || 0) * childCount;
  const discountAmount = discountCode && !ct?.noDiscount ? discountTotal(listPrice, childCount) : 0;

  const data = {
    slotKey: key,
    date: dateLabel,
    time: timeLabel,
    consultId: ct?.id || "",
    consultType: ct?.label || "",
    consultTag: ct?.tag || "",
    listPrice,
    discountCode: discountAmount ? discountCode : "",
    discountAmount,
    price: listPrice - discountAmount,   // 客人實際應匯的金額
    line: formData.line,
    gender: formData.gender,
    childName: (isChild || ct?.id === "textOnly") ? (formData.childName || "") : "",
    birthYear: formData.birthYear,
    birthMonth: formData.birthMonth,
    birthDay: formData.birthDay,
    birthHour: formData.birthHour,
    birthMinute: formData.birthMinute,
    birthPlace: placeText(formData.birthPlace, formData.overseasCountry, formData.overseasRegion),
    question: formData.question,
    bookedAt: now.toISOString(),
    paymentStatus: "待匯款",
  };

  // 解碼孩子的星盤天賦：加做親子合盤，需要媽媽的出生資料
  if (isChild) {
    data.childCount = childCount;
    // 第 2、3 位孩子
    data.extraChildren = [];
    for (let n = 2; n <= childCount; n++) {
      const k = childKeys(n);
      data.extraChildren.push({
        childName: formData[k.name], gender: formData[k.gender],
        birthYear: formData[k.year], birthMonth: formData[k.month], birthDay: formData[k.day],
        birthHour: formData[k.hour], birthMinute: formData[k.minute],
        birthPlace: placeText(formData[k.place], formData[k.country], formData[k.region]),
      });
    }
    Object.assign(data, {
      momBirthYear: formData.momBirthYear,
      momBirthMonth: formData.momBirthMonth,
      momBirthDay: formData.momBirthDay,
      momBirthHour: formData.momBirthHour,
      momBirthMinute: formData.momBirthMinute,
      momBirthPlace: placeText(formData.momBirthPlace, formData.momOverseasCountry, formData.momOverseasRegion),
    });
  }
  return data;
}

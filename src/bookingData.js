// 組出要寫進資料庫的預約資料（純函式，不碰資料庫，方便測試）
import { DISCOUNT_AMOUNT } from "./discountUtils.js";

const placeText = (place, country, region) =>
  place === "國外" ? `國外 — ${country}・${region}` : place;

/**
 * key：預約的時段代碼；ct：服務項目；formData：表單內容；
 * discountCode：已通過檢查的折扣碼（沒有就傳空字串）。
 */
export function buildBookingData({ key, dateLabel, timeLabel, ct, formData, discountCode = "", now = new Date() }) {
  const isChild = ct?.id === "child";
  const listPrice = ct?.price || 0;
  const discountAmount = discountCode && !ct?.noDiscount ? Math.min(DISCOUNT_AMOUNT, listPrice) : 0;

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

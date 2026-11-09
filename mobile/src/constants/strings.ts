import { type Language, translations } from '@/lib/translations';
import type { EventCategory } from '@/types';

export const CATEGORY_LABEL_KEYS: Record<EventCategory, string> = {
  hangout: 'catHangout',
  trip: 'catTrip',
  sport: 'catSport',
  boardgame: 'catBoardgame',
  meeting: 'catMeeting',
  general: 'catGeneral',
};

// Text only the app needs, and website text that describes a browser. These win over the shared set.
const appStrings: Record<Language, Record<string, string>> = {
  th: {
    myEventsTitle: 'กิจกรรมของฉัน',
    myEventsSubtitle: 'กิจกรรมที่สร้างหรือลงเวลาจากเครื่องนี้',
    myEventsEmpty: 'ยังไม่มีกิจกรรม สร้างนัดใหม่ หรือเปิดจากลิงก์ที่เพื่อนส่งมาได้เลย',
    adminNoticeDesc: 'ใช้ลิงก์นี้กลับมาจัดการกิจกรรมจากเครื่องไหนก็ได้ ถ้าลิงก์หายและลบแอปหรือเปลี่ยนเครื่อง จะกู้สิทธิ์คืนไม่ได้',
    adminVerifiedBadge: 'สิทธิ์ผู้สร้าง',
    saveMyAvailabilityBtn: 'บันทึกเวลาว่างของฉัน',
    submitBtn: 'สร้างนัดเลย',
    saveSuccessMsg: 'บันทึกเวลาว่างของคุณเรียบร้อยแล้ว!',
    dragInstructions: 'แตะเพื่อเลือก หรือกดค้างแล้วลากเพื่อเลือกหลายช่อง:',
    inspectSubtitle: 'แตะช่องเวลาเพื่อดูรายชื่อเพื่อน',
    openLinkTitle: 'เปิดนัดจากลิงก์',
    openLinkPlaceholder: 'วางลิงก์นัดที่นี่',
    openLinkBtn: 'เปิดนัด',
    openLinkInvalid: 'ลิงก์นี้ไม่ใช่ลิงก์นัดของวันว่าง',
    createTitle: 'สร้างนัดใหม่',
    backBtn: 'กลับ',
    rangePickHint: 'แตะวันเริ่มต้น แล้วแตะวันสิ้นสุด',
    rangePickEnd: 'แตะวันสิ้นสุด',
    rangeTooLong: 'เลือกช่วงได้ไม่เกิน {max} วัน',
    networkError: 'เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่',
    rateLimited: 'ส่งคำขอถี่เกินไป ลองใหม่ในอีก {time}',
    rateLimitedSoon: 'ส่งคำขอถี่เกินไป รอสักครู่แล้วลองใหม่',
    minutesUnit: '{count} นาที',
    secondsUnit: '{count} วินาที',
    forbiddenError: 'ไม่มีสิทธิ์ทำรายการนี้',
    adminLostError: 'สิทธิ์ผู้สร้างในเครื่องนี้ใช้ไม่ได้แล้ว อาจมีการเปลี่ยนลิงก์แอดมินจากเครื่องอื่น',
    voteStaleError: 'คำตอบเดิมของคุณแก้จากเครื่องนี้ไม่ได้แล้ว กดบันทึกอีกครั้งเพื่อลงเป็นคำตอบใหม่',
    notFoundRemove: 'เอาออกจากรายการของฉัน',
    pageOfTotal: 'หน้า {page}/{total}',
    prevPageLabel: 'สัปดาห์ก่อนหน้า',
    nextPageLabel: 'สัปดาห์ถัดไป',
    timeWindowInvalid: 'เวลาเริ่มต้นต้องมาก่อนเวลาสิ้นสุด',
    earlierTimeLabel: '{label} เร็วขึ้น',
    laterTimeLabel: '{label} ช้าลง',
    appLoading: 'กำลังโหลด...',
    settingsLanguage: 'English',
    themeSystem: 'ธีม: ตามเครื่อง',
    themeLight: 'ธีม: สว่าง',
    themeDark: 'ธีม: มืด',
    prevMonthLabel: 'เดือนก่อนหน้า',
    nextMonthLabel: 'เดือนถัดไป',
    heatCellLabel: '{date} ว่าง {count} จาก {total} คน',
  },
  en: {
    myEventsTitle: 'My events',
    myEventsSubtitle: 'Events you created or answered on this device',
    myEventsEmpty: 'Nothing here yet. Create an event, or open a link a friend sent you.',
    adminNoticeDesc: 'Use this link to manage the event from any device. If you lose it and delete the app or change phones, admin access cannot be recovered.',
    adminVerifiedBadge: 'Organizer access',
    saveMyAvailabilityBtn: 'Save my availability',
    submitBtn: 'Create event',
    saveSuccessMsg: 'Your availability is saved!',
    dragInstructions: 'Tap to choose, or press and hold then drag to choose several:',
    openLinkTitle: 'Open an event link',
    openLinkPlaceholder: 'Paste the event link here',
    openLinkBtn: 'Open',
    openLinkInvalid: 'This is not a WanWang event link',
    createTitle: 'New event',
    backBtn: 'Back',
    rangePickHint: 'Tap the first day, then the last day',
    rangePickEnd: 'Tap the last day',
    rangeTooLong: 'The range can be at most {max} days',
    networkError: 'Could not connect. Check your internet and try again.',
    rateLimited: 'Too many requests. Try again in {time}.',
    rateLimitedSoon: 'Too many requests. Wait a moment and try again.',
    minutesUnit: '{count} min',
    secondsUnit: '{count} sec',
    forbiddenError: 'You do not have permission to do this',
    adminLostError: 'Organizer access on this device no longer works. The admin link may have been changed from another device.',
    voteStaleError: 'Your earlier answer can no longer be edited from this device. Save again to add a new answer.',
    notFoundRemove: 'Remove from my events',
    pageOfTotal: 'Page {page}/{total}',
    prevPageLabel: 'Previous week',
    nextPageLabel: 'Next week',
    timeWindowInvalid: 'The start time must come before the end time',
    earlierTimeLabel: '{label}, earlier',
    laterTimeLabel: '{label}, later',
    appLoading: 'Loading...',
    settingsLanguage: 'ไทย',
    themeSystem: 'Theme: system',
    themeLight: 'Theme: light',
    themeDark: 'Theme: dark',
    prevMonthLabel: 'Previous month',
    nextMonthLabel: 'Next month',
    heatCellLabel: '{date}, {count} of {total} free',
  },
};

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: string, params?: TranslateParams) => string;

export function translate(lang: Language, key: string, params?: TranslateParams): string {
  let text = appStrings[lang][key] ?? translations[lang][key] ?? appStrings.th[key] ?? translations.th[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) text = text.split(`{${name}}`).join(String(value));
  }
  return text;
}

import type { Language } from './i18n';

export interface PrivacySection {
  title: string;
  paragraphs: string[];
}

interface PrivacyContent {
  title: string;
  updated: string;
  sections: PrivacySection[];
  contactTitle: string;
  contactBody: string;
}

// Keep this true to what the app does. The 90 days must match purge_expired_events() in schema.sql.
export const PRIVACY_CONTENT: Record<Language, PrivacyContent> = {
  th: {
    title: 'นโยบายความเป็นส่วนตัว',
    updated: 'ปรับปรุงล่าสุด 9 พฤศจิกายน 2569',
    sections: [
      {
        title: 'ข้อมูลที่เราเก็บ',
        paragraphs: [
          'ตอนสร้างนัด: ชื่อนัด รายละเอียด สถานที่ และช่วงวันเวลา',
          'ตอนลงเวลา: ชื่อที่คุณพิมพ์ โน้ต และเวลาที่คุณเลือก คุณจะใช้ชื่อเล่นก็ได้',
          'เราไม่มีระบบสมาชิก และไม่ขออีเมลหรือเบอร์โทร รหัสผู้ดูแลและรหัสแก้ไขเก็บในฐานข้อมูลแบบ hash เท่านั้น',
          'เพื่อป้องกันการใช้งานเกินควร เราเก็บค่า hash ของ IP address ไว้ชั่วคราวเพื่อนับจำนวนคำขอ โดยไม่เก็บ IP โดยตรง',
        ],
      },
      {
        title: 'ใครเห็นข้อมูลบ้าง',
        paragraphs: [
          'ทุกคนที่มีลิงก์ของนัดจะเห็นรายละเอียดนัด รวมถึงชื่อ โน้ต และเวลาของทุกคนที่ลงเวลาไว้',
          'โปรดอย่ากรอกข้อมูลอ่อนไหว เช่น ข้อมูลสุขภาพ เลขบัตรประชาชน หรือที่อยู่บ้าน',
        ],
      },
      {
        title: 'เราใช้ข้อมูลเพื่ออะไร',
        paragraphs: [
          'เพื่อให้บริการหาเวลานัดตามที่คุณใช้งาน และเพื่อดูแลความปลอดภัยของระบบ ซึ่งเป็นการประมวลผลบนฐานการให้บริการตามที่คุณร้องขอ และประโยชน์โดยชอบด้วยกฎหมาย',
          'เราไม่ขายข้อมูล ไม่มีโฆษณา และไม่มีระบบติดตามผู้ใช้',
        ],
      },
      {
        title: 'เราเก็บข้อมูลนานแค่ไหน',
        paragraphs: [
          'ระบบลบนัดและข้อมูลการลงเวลาทั้งหมดของนัดนั้นโดยอัตโนมัติ 90 วันหลังวันสุดท้ายของนัด หรือ 90 วันหลังวันที่สร้างนัด แล้วแต่ว่าวันใดมาทีหลัง',
          'ค่า hash ของ IP หมดอายุภายในไม่เกิน 1 ชั่วโมง และถูกล้างออกอย่างน้อยวันละครั้ง ข้อมูลสำรองของผู้ให้บริการอาจคงอยู่ต่ออีกระยะหนึ่ง',
        ],
      },
      {
        title: 'ผู้ให้บริการที่เกี่ยวข้อง',
        paragraphs: [
          'Vercel ให้บริการเว็บและอาจบันทึกข้อมูลการเข้าถึง เช่น IP address ส่วน Supabase ให้บริการฐานข้อมูล',
          'เบราว์เซอร์ของคุณโหลดฟอนต์จาก Google Fonts ทำให้ Google เห็น IP address ของคุณ',
          'ผู้ให้บริการเหล่านี้อาจเก็บหรือประมวลผลข้อมูลบนเซิร์ฟเวอร์นอกประเทศไทย',
        ],
      },
      {
        title: 'ข้อมูลในเบราว์เซอร์ของคุณ',
        paragraphs: [
          'เราไม่ใช้คุกกี้ แต่เก็บรหัสผู้ดูแล รหัสแก้ไข ภาษาที่เลือก และรายการนัดที่ซ่อนไว้ใน localStorage และ sessionStorage ของเบราว์เซอร์ เพื่อให้คุณกลับมาแก้ไขได้',
          'หากล้างข้อมูลเบราว์เซอร์ คุณอาจแก้ไขคำตอบเดิมไม่ได้ และต้องใช้ลิงก์ผู้ดูแลเพื่อเข้าจัดการนัดอีกครั้ง',
        ],
      },
      {
        title: 'สิทธิ์ของคุณ',
        paragraphs: [
          'คุณลบคำตอบของตัวเองได้จากเบราว์เซอร์เดิม ผู้สร้างนัดลบคำตอบของทุกคนหรือลบทั้งนัดได้',
          'ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล คุณมีสิทธิ์ขอเข้าถึง แก้ไข หรือลบข้อมูล คัดค้านการประมวลผล และร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล',
        ],
      },
    ],
    contactTitle: 'ติดต่อเรา',
    contactBody: 'หากต้องการใช้สิทธิ์หรือมีคำถามเกี่ยวกับข้อมูลของคุณ ติดต่อได้ที่',
  },
  en: {
    title: 'Privacy Notice',
    updated: 'Last updated 9 November 2026',
    sections: [
      {
        title: 'What we collect',
        paragraphs: [
          'When you create an event: its title, description, location, and date and time range.',
          'When you respond: the name you type, your note, and the times you pick. A nickname is fine.',
          'There are no accounts, and we do not ask for an email address or phone number. Admin keys and edit tokens are stored in the database only as hashes.',
          'To prevent abuse, we temporarily keep a hash of your IP address to count requests. We do not store the IP address itself.',
        ],
      },
      {
        title: 'Who can see it',
        paragraphs: [
          'Anyone with an event link can see the event details and the name, note, and times of everyone who responded.',
          'Please do not enter sensitive information such as health details, national ID numbers, or home addresses.',
        ],
      },
      {
        title: 'Why we use it',
        paragraphs: [
          'To provide the scheduling service you are using and to keep the system secure. The legal bases are providing the service you request and our legitimate interests.',
          'We do not sell data, show ads, or track users.',
        ],
      },
      {
        title: 'How long we keep it',
        paragraphs: [
          'An event and all its responses are deleted automatically 90 days after its last date, or 90 days after it was created, whichever is later.',
          'IP hashes expire within 1 hour and are cleared at least once a day. Our providers’ backups may keep data for a further period.',
        ],
      },
      {
        title: 'Service providers',
        paragraphs: [
          'Vercel hosts the site and may log access data such as IP addresses. Supabase hosts the database.',
          'Your browser loads fonts from Google Fonts, so Google can see your IP address.',
          'These providers may store or process data on servers outside Thailand.',
        ],
      },
      {
        title: 'Data in your browser',
        paragraphs: [
          'We do not use cookies. Admin keys, edit tokens, your language, and hidden events are kept in your browser’s localStorage and sessionStorage so you can come back and make changes.',
          'If you clear your browser data, you may lose the ability to edit your response, and you will need the admin link to manage your event again.',
        ],
      },
      {
        title: 'Your rights',
        paragraphs: [
          'You can delete your own response from the browser you used. An event’s creator can delete any response or the whole event.',
          'Under Thailand’s Personal Data Protection Act, you may request access to, correction of, or deletion of your data, object to processing, and complain to the Personal Data Protection Committee.',
        ],
      },
    ],
    contactTitle: 'Contact us',
    contactBody: 'To use your rights or ask about your data, contact',
  },
};

import type { Language } from './translations';

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
    updated: 'ปรับปรุงล่าสุด 12 พฤศจิกายน 2569',
    sections: [
      {
        title: 'ข้อมูลที่เราเก็บ',
        paragraphs: [
          'ตอนสร้างนัด: ชื่อนัด รายละเอียด สถานที่ และช่วงวันเวลา',
          'ตอนลงเวลา: ชื่อที่คุณพิมพ์ โน้ต และเวลาที่คุณเลือก คุณจะใช้ชื่อเล่นก็ได้',
          'ผู้สร้างนัดอาจตั้งคำถามเพิ่มเติมให้คุณตอบ เราเก็บคำตอบและไฟล์ที่คุณแนบไว้กับนัดนั้น สิ่งที่ถูกถามเป็นการตัดสินใจของผู้สร้างนัด ไม่ใช่ของเรา',
          'ตอนส่งความคิดเห็น: ประเภท คะแนน และข้อความที่คุณพิมพ์ โดยไม่ผูกกับชื่อ นัด หรืออุปกรณ์ของคุณ เราเก็บไว้ไม่เกิน 1 ปีเพื่อใช้ปรับปรุงบริการ',
          'เราไม่มีระบบสมาชิก และไม่ขออีเมลหรือเบอร์โทร รหัสผู้ดูแลและรหัสแก้ไขเก็บในฐานข้อมูลแบบ hash เท่านั้น',
          'เพื่อป้องกันการใช้งานเกินควร เราเก็บค่า hash ของ IP address ไว้ชั่วคราวเพื่อนับจำนวนคำขอ โดยไม่เก็บ IP โดยตรง',
        ],
      },
      {
        title: 'ใครเห็นข้อมูลบ้าง',
        paragraphs: [
          'ทุกคนที่มีลิงก์ของนัดจะเห็นรายละเอียดนัด รวมถึงชื่อ โน้ต และเวลาของทุกคนที่ลงเวลาไว้',
          'คำตอบของคำถามเพิ่มเติมและไฟล์แนบ เห็นได้เฉพาะผู้สร้างนัดและตัวคุณเอง คนอื่นที่มีลิงก์จะไม่เห็น ผู้สร้างนัดดาวน์โหลดไฟล์และคำตอบไปเก็บไว้เองได้ ซึ่งอยู่นอกการควบคุมของเรา',
          'โปรดอย่ากรอกข้อมูลอ่อนไหว เช่น ข้อมูลสุขภาพ เลขบัตรประชาชน หรือที่อยู่บ้าน',
        ],
      },
      {
        title: 'เราใช้ข้อมูลเพื่ออะไร',
        paragraphs: [
          'เพื่อให้บริการหาเวลานัดตามที่คุณใช้งาน และเพื่อดูแลความปลอดภัยของระบบ ซึ่งเป็นการประมวลผลบนฐานการให้บริการตามที่คุณร้องขอ และประโยชน์โดยชอบด้วยกฎหมาย',
          'เราไม่ขายข้อมูล ไม่มีโฆษณา และไม่ติดตามคุณข้ามเว็บไซต์หรือสร้างโปรไฟล์ของคุณ',
          'เรานับจำนวนนัด คำตอบ ไฟล์แนบ และความคิดเห็นเป็นยอดรวมรายวัน เพื่อดูว่าบริการถูกใช้มากแค่ไหน ยอดรวมนี้เป็นตัวเลขอย่างเดียว ไม่มีชื่อหรือเนื้อหา ไม่ผูกกับบุคคลหรืออุปกรณ์ใด และคงอยู่หลังจากนัดถูกลบแล้ว',
        ],
      },
      {
        title: 'เราเก็บข้อมูลนานแค่ไหน',
        paragraphs: [
          'ระบบลบนัดและข้อมูลการลงเวลาทั้งหมดของนัดนั้นโดยอัตโนมัติ 90 วันหลังวันสุดท้ายของนัด หรือ 90 วันหลังวันที่สร้างนัด แล้วแต่ว่าวันใดมาทีหลัง',
          'คำตอบถูกลบพร้อมกับนัดหรือเมื่อคุณถอนคำตอบ ส่วนไฟล์แนบจะถูกลบออกจากที่เก็บไฟล์ภายใน 2 วันหลังจากนั้น ไฟล์ที่อัปโหลดแล้วแต่ไม่ได้กดบันทึกจะถูกลบภายใน 2 วันเช่นกัน',
          'ค่า hash ของ IP หมดอายุภายในไม่เกิน 1 ชั่วโมง และถูกล้างออกอย่างน้อยวันละครั้ง ข้อมูลสำรองของผู้ให้บริการอาจคงอยู่ต่ออีกระยะหนึ่ง',
          'เมื่อแชร์ลิงก์นัดในแอปแชทหรือบริการภายนอก บริการนั้นอาจดึงชื่อนัดไปแสดงเป็นตัวอย่างลิงก์ และอาจเก็บไว้ต่อหลังจากนัดถูกลบแล้ว เราไม่สามารถลบข้อมูลในส่วนนั้นได้',
        ],
      },
      {
        title: 'ผู้ให้บริการที่เกี่ยวข้อง',
        paragraphs: [
          'Vercel ให้บริการเว็บและอาจบันทึกข้อมูลการเข้าถึง เช่น IP address ส่วน Supabase ให้บริการฐานข้อมูลและที่เก็บไฟล์แนบ',
          'บนเว็บไซต์ เราใช้ Vercel Web Analytics นับจำนวนการเข้าชมหน้าเว็บ โดยไม่ใช้คุกกี้ สิ่งที่บันทึกคือหน้าที่เปิด เว็บที่พามา ประเทศ และชนิดของอุปกรณ์กับเบราว์เซอร์ ลิงก์ของนัดถูกตัดออกก่อนส่ง สถิตินี้จึงไม่บอกว่าคุณเปิดนัดไหน Vercel แยกผู้เข้าชมด้วยค่า hash ที่เปลี่ยนทุกวัน จึงติดตามคุณข้ามวันไม่ได้ แอปวันว่างไม่มีการนับนี้',
          'ผู้ให้บริการเหล่านี้อาจเก็บหรือประมวลผลข้อมูลบนเซิร์ฟเวอร์นอกประเทศไทย',
        ],
      },
      {
        title: 'มาตรการรักษาความปลอดภัย',
        paragraphs: [
          'ข้อมูลระหว่างเบราว์เซอร์หรือแอปกับเซิร์ฟเวอร์ส่งผ่าน HTTPS (TLS) และเบราว์เซอร์ถูกบังคับให้ใช้ HTTPS เสมอ',
          'รหัสผู้ดูแลและรหัสแก้ไขเก็บเป็นค่าแฮช SHA-256 ทางเดียว ไม่สามารถย้อนกลับเป็นรหัสเดิมได้ ค่า hash ของ IP ใช้คีย์ลับในการแฮช',
          'ตารางในฐานข้อมูลปิดการเข้าถึงด้วยคีย์สาธารณะ ผู้ใช้ทั่วไปจึงอ่านหรือแก้ไขข้อมูลโดยตรงไม่ได้ ข้อมูลเข้าถึงได้ผ่านเซิร์ฟเวอร์ของเราเท่านั้น',
        ],
      },
      {
        title: 'ข้อมูลในเบราว์เซอร์และแอปของคุณ',
        paragraphs: [
          'เราไม่ใช้คุกกี้ แต่เก็บรหัสผู้ดูแล รหัสแก้ไข ภาษาและธีมที่เลือก และรายการนัดที่ซ่อนไว้ใน localStorage และ sessionStorage ของเบราว์เซอร์ เพื่อให้คุณกลับมาแก้ไขได้',
          'หากล้างข้อมูลเบราว์เซอร์ คุณอาจแก้ไขคำตอบเดิมไม่ได้ และต้องใช้ลิงก์ผู้ดูแลเพื่อเข้าจัดการนัดอีกครั้ง',
          'ในแอปวันว่าง รหัสผู้ดูแลและรหัสแก้ไขเก็บในพื้นที่ปลอดภัยของเครื่อง (Keychain หรือ Keystore) ส่วนภาษา ธีม และรายการนัดที่คุณสร้างหรือลงเวลาเก็บในพื้นที่ของแอปบนเครื่องนั้น แอปไม่มีโฆษณาและไม่มีระบบติดตามผู้ใช้',
          'หากลบแอปหรือเปลี่ยนเครื่อง คุณอาจแก้ไขคำตอบเดิมไม่ได้ และต้องใช้ลิงก์ผู้ดูแลเพื่อเข้าจัดการนัดอีกครั้ง',
        ],
      },
      {
        title: 'สิทธิ์ของคุณ',
        paragraphs: [
          'วิธีใช้สิทธิ์ในทางปฏิบัติ: ผู้สร้างนัดแก้ไขหรือลบนัดได้ทันทีผ่านลิงก์จัดการสำหรับผู้ดูแล (Admin Link) และลบคำตอบของทุกคนได้',
          'ผู้เข้าร่วมแก้ไขหรือถอนคำตอบของตัวเองได้ทันทีผ่านเบราว์เซอร์หรือแอปเดิม หากล้างข้อมูลเบราว์เซอร์หรือลบแอปแล้ว ให้ส่งอีเมลมาที่ wanwang.help@gmail.com พร้อมชื่อนัดและชื่อที่ใช้ลงเวลา เราจะดำเนินการลบข้อมูลภายใน 30 วันตามที่กฎหมายกำหนด',
          'ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล คุณมีสิทธิ์ขอเข้าถึง แก้ไข หรือลบข้อมูล คัดค้านการประมวลผล และร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล',
        ],
      },
    ],
    contactTitle: 'ติดต่อเรา',
    contactBody: 'หากต้องการใช้สิทธิ์หรือมีคำถามเกี่ยวกับข้อมูลของคุณ ติดต่อได้ที่',
  },
  en: {
    title: 'Privacy Notice',
    updated: 'Last updated 12 November 2026',
    sections: [
      {
        title: 'What we collect',
        paragraphs: [
          'When you create an event: its title, description, location, and date and time range.',
          'When you respond: the name you type, your note, and the times you pick. A nickname is fine.',
          'An event creator may ask extra questions. We store your answers and any file you attach with that event. What is asked is the creator’s decision, not ours.',
          'When you send feedback: its type, your rating, and the message you type, not linked to your name, an event, or your device. We keep it for up to 1 year to improve the service.',
          'There are no accounts, and we do not ask for an email address or phone number. Admin keys and edit tokens are stored in the database only as hashes.',
          'To prevent abuse, we temporarily keep a hash of your IP address to count requests. We do not store the IP address itself.',
        ],
      },
      {
        title: 'Who can see it',
        paragraphs: [
          'Anyone with an event link can see the event details and the name, note, and times of everyone who responded.',
          'Answers to extra questions and attached files can be seen only by the event creator and by you. Other people with the link cannot see them. The creator can download answers and files and keep their own copy, which is outside our control.',
          'Please do not enter sensitive information such as health details, national ID numbers, or home addresses.',
        ],
      },
      {
        title: 'Why we use it',
        paragraphs: [
          'To provide the scheduling service you are using and to keep the system secure. The legal bases are providing the service you request and our legitimate interests.',
          'We do not sell data, show ads, track you across websites or build a profile of you.',
          'We keep a daily count of events, responses, attached files and feedback, to see how much the service is used. These totals are numbers only: no names or content, not linked to any person or device. They remain after an event is deleted.',
        ],
      },
      {
        title: 'How long we keep it',
        paragraphs: [
          'An event and all its responses are deleted automatically 90 days after its last date, or 90 days after it was created, whichever is later.',
          'Answers are deleted with the event or when you withdraw your response. Attached files are removed from file storage within 2 days after that. A file that was uploaded but never saved with a response is also removed within 2 days.',
          'IP hashes expire within 1 hour and are cleared at least once a day. Our providers’ backups may keep data for a further period.',
          'When an event link is shared in a chat app or other outside service, that service may fetch the event title to show a link preview and may keep it after the event is deleted. We cannot delete data held there.',
        ],
      },
      {
        title: 'Service providers',
        paragraphs: [
          'Vercel hosts the site and may log access data such as IP addresses. Supabase hosts the database and attached files.',
          'On the website we use Vercel Web Analytics to count page views, without cookies. It records the page opened, the referring site, the country, and the type of device and browser. An event’s link is removed before anything is sent, so these statistics do not show which event you opened. Vercel tells visitors apart with a hash that changes every day, so it cannot follow you from one day to the next. The WanWang app does not do this counting.',
          'These providers may store or process data on servers outside Thailand.',
        ],
      },
      {
        title: 'Security measures',
        paragraphs: [
          'Data travels between your browser or the app and our servers over HTTPS (TLS), and the browser is told to use HTTPS only.',
          'Admin keys and edit tokens are stored as one-way SHA-256 hashes, so the original values cannot be recovered from the database. IP hashes use a secret key.',
          'Database tables block access made with the public API key, so visitors cannot read or change the data directly. Data is reached only through our servers.',
        ],
      },
      {
        title: 'Data in your browser and the app',
        paragraphs: [
          'We do not use cookies. Admin keys, edit tokens, your language and theme, and hidden events are kept in your browser’s localStorage and sessionStorage so you can come back and make changes.',
          'If you clear your browser data, you may lose the ability to edit your response, and you will need the admin link to manage your event again.',
          'In the WanWang app, admin keys and edit tokens are kept in your device’s secure storage (Keychain or Keystore). Your language, theme and the list of events you created or answered are kept in the app’s storage on that device. The app has no ads and no user tracking.',
          'If you delete the app or change devices, you may lose the ability to edit your response, and you will need the admin link to manage your event again.',
        ],
      },
      {
        title: 'Your rights',
        paragraphs: [
          'In practice: an event’s creator can edit or delete the event at any time through the admin link, and can delete any response.',
          'Participants can edit or withdraw their own response at any time from the same browser or app. If you have cleared your browser data or deleted the app, email wanwang.help@gmail.com with the event name and the name you used to respond. We will delete the data within 30 days, as the law requires.',
          'Under Thailand’s Personal Data Protection Act, you may request access to, correction of, or deletion of your data, object to processing, and complain to the Personal Data Protection Committee.',
        ],
      },
    ],
    contactTitle: 'Contact us',
    contactBody: 'To use your rights or ask about your data, contact',
  },
};

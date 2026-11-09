export const SITE_TITLE = 'วันว่าง // WanWang';
export const SITE_DESCRIPTION = 'ระบบหาเวลานัดตรงกันง่ายๆ ในไม่กี่วินาที ไม่ต้องสมัครสมาชิก';
export const EVENT_DESCRIPTION = 'ลงเวลาที่คุณว่างเพื่อหาวันนัดที่ตรงกัน ไม่ต้องสมัครสมาชิก';

const SHARE_IMAGE = {
  url: '/og.png',
  width: 1200,
  height: 630,
  alt: 'วันว่าง // WanWang: หาคิววันว่างตรงกันในไม่กี่วินาที',
};

// A page's openGraph and twitter replace its parent's instead of merging, so pages spread these.
export const OPEN_GRAPH_BASE = {
  type: 'website',
  siteName: SITE_TITLE,
  locale: 'th_TH',
  images: SHARE_IMAGE,
} as const;

export const TWITTER_BASE = {
  card: 'summary_large_image',
  images: SHARE_IMAGE,
} as const;

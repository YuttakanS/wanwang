export const PRODUCTION_API_URL = 'https://wanwang-one.vercel.app';

/** Where the website's API lives. Not a secret: it ships inside the app. */
export const apiUrl = (process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL).replace(/\/$/, '');

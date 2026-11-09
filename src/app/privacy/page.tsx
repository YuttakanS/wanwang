import type { Metadata } from 'next';
import PrivacyNotice from '@/components/PrivacyNotice';

export const metadata: Metadata = {
  title: 'นโยบายความเป็นส่วนตัว // Privacy Notice',
};

export default function PrivacyPage() {
  return <PrivacyNotice />;
}

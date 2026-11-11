import type { Metadata } from 'next';
import FeedbackForm from '@/components/FeedbackForm';

export const metadata: Metadata = {
  title: 'ส่งความคิดเห็น // Feedback',
};

export default function FeedbackPage() {
  return <FeedbackForm />;
}

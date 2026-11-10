import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { NeoCard } from '~/components/neo/NeoCard';
import { SectionHeader } from '~/components/SectionHeader';

interface FormSectionProps {
  title: string;
  subtitle: string;
  badge?: string;
  children: ReactNode;
}

/** A card of the website's create form. */
export function FormSection({ title, subtitle, badge, children }: FormSectionProps) {
  return (
    <NeoCard style={styles.card}>
      <SectionHeader title={title} subtitle={subtitle} badge={badge} />
      {children}
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
});

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { PRIVACY_CONTENT } from '@/lib/privacyContent';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoText } from '~/components/neo/NeoText';
import { Screen } from '~/components/Screen';
import { PRIVACY_CONTACT } from '~/constants/config';
import { borderWidths } from '~/constants/theme';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { borderTopColor: colors.ink }]}>
      <NeoText variant="heading" accessibilityRole="header">
        {title}
      </NeoText>
      {children}
    </View>
  );
}

// Native rather than a link to the website, so it opens without a connection and keeps a half-filled form.
// One card with ruled sections, as on the website.
export default function PrivacyScreen() {
  const { lang } = useI18n();
  const content = PRIVACY_CONTENT[lang];

  return (
    <Screen showBack>
      <NeoCard style={styles.card}>
        <View style={styles.header}>
          <NeoText variant="title" accessibilityRole="header">
            {content.title}
          </NeoText>
          <NeoText variant="caption" tone="muted">
            {content.updated}
          </NeoText>
        </View>

        {content.sections.map(section => (
          <Section key={section.title} title={section.title}>
            {section.paragraphs.map(paragraph => (
              <NeoText key={paragraph} tone="muted">
                {paragraph}
              </NeoText>
            ))}
          </Section>
        ))}

        <Section title={content.contactTitle}>
          <NeoText tone="muted">
            {content.contactBody}{' '}
            <NeoText variant="label" selectable>
              {PRIVACY_CONTACT}
            </NeoText>
          </NeoText>
        </Section>
      </NeoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 20 },
  header: { gap: 4 },
  section: { gap: 8, paddingTop: 16, borderTopWidth: borderWidths.regular },
});

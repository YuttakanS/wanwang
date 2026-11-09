import { StyleSheet, View } from 'react-native';
import { PRIVACY_CONTENT } from '@/lib/privacyContent';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoText } from '~/components/neo/NeoText';
import { Screen } from '~/components/Screen';
import { PRIVACY_CONTACT } from '~/constants/config';
import { useI18n } from '~/hooks/useI18n';

// Native rather than a link to the website, so it opens without a connection and keeps a half-filled form.
export default function PrivacyScreen() {
  const { lang } = useI18n();
  const content = PRIVACY_CONTENT[lang];

  return (
    <Screen showBack>
      <View style={styles.header}>
        <NeoText variant="title" accessibilityRole="header">
          {content.title}
        </NeoText>
        <NeoText variant="caption" tone="muted">
          {content.updated}
        </NeoText>
      </View>

      {content.sections.map(section => (
        <NeoCard key={section.title} style={styles.card}>
          <NeoText variant="heading" accessibilityRole="header">
            {section.title}
          </NeoText>
          {section.paragraphs.map(paragraph => (
            <NeoText key={paragraph}>{paragraph}</NeoText>
          ))}
        </NeoCard>
      ))}

      <NeoCard style={styles.card}>
        <NeoText variant="heading" accessibilityRole="header">
          {content.contactTitle}
        </NeoText>
        <NeoText>
          {content.contactBody} <NeoText selectable>{PRIVACY_CONTACT}</NeoText>
        </NeoText>
      </NeoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  card: { padding: 12, gap: 8 },
});

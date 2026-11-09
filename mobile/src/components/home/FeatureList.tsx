import { StyleSheet, View } from 'react-native';
import { NeoText } from '~/components/neo/NeoText';
import { fonts } from '~/constants/fonts';
import { useI18n } from '~/hooks/useI18n';

const FEATURES = [
  { title: 'feat1Title', description: 'feat1Desc' },
  { title: 'feat2Title', description: 'feat2Desc' },
  { title: 'feat3Title', description: 'feat3Desc' },
];

/** Plain text with no borders, so nothing here looks like it can be pressed. */
export function FeatureList() {
  const { t } = useI18n();

  return (
    <View style={styles.list}>
      {FEATURES.map(({ title, description }, index) => (
        <View key={title} style={styles.row}>
          <NeoText variant="mono" tone="muted" style={styles.number}>
            {index + 1}
          </NeoText>
          <View style={styles.text}>
            <NeoText variant="caption">{t(title)}</NeoText>
            <NeoText variant="caption" tone="muted" style={styles.description}>
              {t(description)}
            </NeoText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, paddingTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  number: { fontSize: 12, lineHeight: 20 },
  text: { flex: 1 },
  description: { fontFamily: fonts.regular },
});

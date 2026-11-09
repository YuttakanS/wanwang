import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NeoBadge } from '~/components/neo/NeoBadge';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoInput } from '~/components/neo/NeoInput';
import { NeoText } from '~/components/neo/NeoText';
import { borderWidths, type ThemeColors, type ThemePreference } from '~/constants/theme';
import { useTheme } from '~/hooks/useTheme';

// Component preview for checking the design system on a real phone. Development builds only.
const PREFERENCES: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'ตามเครื่อง' },
  { value: 'light', label: 'สว่าง' },
  { value: 'dark', label: 'มืด' },
];

const SWATCHES: (keyof ThemeColors)[] = ['surface', 'sunken', 'lineSoft', 'faint', 'muted', 'ink', 'accent', 'heat1', 'heat2', 'heat3'];

export default function PreviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, scheme, preference, setPreference } = useTheme();
  const [name, setName] = useState('');

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
    >
      <NeoButton label="กลับ" variant="secondary" size="sm" onPress={() => router.back()} />
      <NeoText variant="title">ระบบดีไซน์ ({scheme})</NeoText>

      <View style={styles.row}>
        {PREFERENCES.map(item => (
          <NeoButton
            key={item.value}
            label={item.label}
            size="sm"
            variant={preference === item.value ? 'primary' : 'secondary'}
            onPress={() => setPreference(item.value)}
          />
        ))}
      </View>

      <NeoText variant="heading">ตัวอักษร</NeoText>
      <NeoCard>
        <NeoText variant="title">หัวข้อ กิ๊ก ปู่ ผู้ใหญ่ ฉุ๊กฉิ๊ก</NeoText>
        <NeoText variant="heading">หัวข้อรอง น้ำใจ ที่นี่ ญาติผู้ใหญ่</NeoText>
        <NeoText>เนื้อหา: ปฏิทินกลางสำหรับหาวันที่ทุกคนว่างตรงกัน ฤๅษี ฎีกา ปฏิเสธ</NeoText>
        <NeoText variant="label">ป้ายกำกับตัวหนา</NeoText>
        <NeoText variant="caption" tone="muted">
          คำอธิบายขนาดเล็ก สีรอง
        </NeoText>
        <NeoText variant="mono">Space Mono 0123456789</NeoText>
        <NeoText variant="monoBold">Space Mono Bold 2026-11-09</NeoText>
        <NeoText tone="link">ลิงก์ wanwang-one.vercel.app</NeoText>
      </NeoCard>

      <NeoText variant="heading">ปุ่ม</NeoText>
      <NeoButton label="ปุ่มหลัก กดแล้วยุบ" fullWidth />
      <NeoButton label="ปุ่มรอง กดแล้วบีบ" variant="secondary" fullWidth />
      <View style={styles.row}>
        <NeoButton label="ปุ่มเล็ก" size="sm" />
        <NeoButton label="ปุ่มเล็กรอง" size="sm" variant="secondary" />
      </View>
      <View style={styles.row}>
        <NeoButton label="ปิดใช้งาน" disabled />
        <NeoButton label="ปิดใช้งาน" variant="secondary" disabled />
      </View>

      <NeoText variant="heading">ช่องกรอก</NeoText>
      <NeoInput label="ชื่อของคุณ" placeholder="พิมพ์ชื่อ เช่น ผู้ใหญ่บ้าน" value={name} onChangeText={setName} />
      <NeoInput label="ช่องที่มีข้อผิดพลาด" defaultValue="กิ๊ก" error="ชื่อนี้ถูกใช้แล้ว" />

      <NeoText variant="heading">การ์ด</NeoText>
      <NeoCard emphasis>
        <NeoText variant="label">การ์ดหลัก ขอบ 5px</NeoText>
      </NeoCard>
      <NeoCard tone="sunken">
        <NeoText variant="label">การ์ดพื้นเทา ขอบ 3px</NeoText>
        <NeoText tone="muted">ข้อความรองบนพื้นเทา</NeoText>
      </NeoCard>
      <NeoCard tone="accent" emphasis>
        <NeoText variant="label" tone="onAccent">
          การ์ดสีเหลือง ตัวอักษรดำทั้ง 2 ธีม
        </NeoText>
        <NeoButton label="ปุ่มบนพื้นเหลือง" />
      </NeoCard>

      <NeoText variant="heading">ป้าย</NeoText>
      <View style={styles.row}>
        <NeoBadge label="ปกติ" />
        <NeoBadge label="เลือกแล้ว" tone="accent" />
        <NeoBadge label="ปิดรับ" tone="ink" />
      </View>

      <NeoText variant="heading">สี</NeoText>
      <View style={styles.swatches}>
        {SWATCHES.map(key => (
          <View key={key} style={[styles.swatch, { backgroundColor: colors[key], borderColor: colors.ink }]} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 48, height: 48, borderWidth: borderWidths.thin },
});

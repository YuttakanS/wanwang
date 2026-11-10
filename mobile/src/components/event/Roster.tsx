import { StyleSheet, View } from 'react-native';
import type { Participant } from '@/types';
import { NeoBadge } from '~/components/neo/NeoBadge';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoChip } from '~/components/neo/NeoChip';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
import { SectionHeader } from '~/components/SectionHeader';
import { borderWidths } from '~/constants/theme';
import { useDeleteParticipant } from '~/hooks/useEvent';
import { useI18n } from '~/hooks/useI18n';
import { useTheme } from '~/hooks/useTheme';
import { confirmDestructive } from '~/services/confirm';

interface RosterProps {
  slug: string;
  participants: Participant[];
  isAdmin: boolean;
}

export function Roster({ slug, participants, isAdmin }: RosterProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const remove = useDeleteParticipant(slug);

  if (participants.length === 0) return null;

  const confirmRemove = (participant: Participant) =>
    confirmDestructive({
      title: t('deleteParticipantConfirmTitle', { name: participant.name }),
      message: t('deleteParticipantConfirmDesc'),
      cancelLabel: t('confirmCancelBtn'),
      confirmLabel: t('deleteParticipantConfirmBtn'),
      onConfirm: () => remove.mutate(participant),
    });

  return (
    <NeoCard style={styles.card}>
      <SectionHeader title={t('rosterTitle', { count: participants.length })} />
      <View>
        {participants.map((participant, index) => (
          <View
            key={participant.id}
            style={[
              styles.row,
              index > 0 && { borderTopWidth: borderWidths.regular, borderTopColor: colors.ink },
              // The website marks your own answer with a yellow tint.
              participant.isMine && { backgroundColor: `${colors.accent}33`, paddingHorizontal: 12 },
            ]}
          >
            <View style={styles.details}>
              <View style={styles.nameRow}>
                <NeoText variant="heading" style={styles.name}>
                  {participant.name}
                </NeoText>
                {participant.isMine && <NeoBadge label={t('youTag')} tone="ink" />}
                <NeoText variant="caption" tone="muted">
                  {t('slotsLogged', { count: participant.availability?.length ?? participant.availableDates?.length ?? 0 })}
                </NeoText>
              </View>
              {participant.note ? (
                <NeoText variant="caption" tone="muted">
                  {participant.note}
                </NeoText>
              ) : null}
            </View>
            {(participant.isMine || isAdmin) && (
              <NeoChip
                label={t('deleteBtn')}
                accessibilityLabel={`${t('deleteBtn')} ${participant.name}`}
                disabled={remove.isPending}
                onPress={() => confirmRemove(participant)}
              />
            )}
          </View>
        ))}
      </View>
      {remove.isError && <NeoNotice message={t('deleteParticipantFailed')} />}
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4 },
  details: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  // Without this, a long name with no spaces runs off the screen instead of wrapping.
  name: { flexShrink: 1, maxWidth: '100%' },
});

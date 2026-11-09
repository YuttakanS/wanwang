import { StyleSheet, View } from 'react-native';
import type { Participant } from '@/types';
import { NeoBadge } from '~/components/neo/NeoBadge';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoCard } from '~/components/neo/NeoCard';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
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
      <NeoText variant="heading" accessibilityRole="header">
        {t('rosterTitle', { count: participants.length })}
      </NeoText>
      {participants.map((participant, index) => (
        <View
          key={participant.id}
          style={[styles.row, index > 0 && { borderTopWidth: borderWidths.thin, borderTopColor: colors.ink }]}
        >
          <View style={styles.nameRow}>
            <NeoText variant="label">{participant.name}</NeoText>
            {participant.isMine && <NeoBadge label={t('youTag')} tone="ink" />}
          </View>
          <NeoText variant="caption" tone="muted">
            {t('slotsLogged', { count: participant.availability?.length ?? participant.availableDates?.length ?? 0 })}
          </NeoText>
          {participant.note ? <NeoText variant="caption">{participant.note}</NeoText> : null}
          {(participant.isMine || isAdmin) && (
            <NeoButton
              label={t('deleteBtn')}
              variant="secondary"
              size="sm"
              disabled={remove.isPending}
              onPress={() => confirmRemove(participant)}
            />
          )}
        </View>
      ))}
      {remove.isError && <NeoNotice message={t('deleteParticipantFailed')} />}
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 8 },
  row: { gap: 4, paddingTop: 8 },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
});

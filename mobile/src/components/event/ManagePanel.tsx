import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { WanWangEvent } from '@/types';
import { NeoBadge } from '~/components/neo/NeoBadge';
import { NeoButton } from '~/components/neo/NeoButton';
import { NeoNotice } from '~/components/neo/NeoNotice';
import { NeoText } from '~/components/neo/NeoText';
import { useAdminActions } from '~/hooks/useAdminActions';
import { useCopy } from '~/hooks/useCopy';
import { useI18n } from '~/hooks/useI18n';
import { confirmDestructive } from '~/services/confirm';
import { buildAdminLink } from '~/services/deepLink';
import { errorMessage } from '~/services/errorMessage';
import { getAdminKey } from '~/services/secrets';

interface ManagePanelProps {
  event: WanWangEvent;
  /** The new key is on this phone only until it is copied, so the screen reminds the person. */
  onAdminKeyRotated: (newKey: string) => void;
  onAdminLost: () => void;
}

export function ManagePanel({ event, onAdminKeyRotated, onAdminLost }: ManagePanelProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { copied, failedText, copy } = useCopy();
  const { update, rotate, remove } = useAdminActions(event.slug, onAdminLost);

  const failed = update.error ?? rotate.error ?? remove.error;
  const isBusy = update.isPending || rotate.isPending || remove.isPending;

  const confirmRotate = () =>
    confirmDestructive({
      title: t('rotateAdminConfirmTitle'),
      message: t('rotateAdminConfirmDesc'),
      cancelLabel: t('confirmCancelBtn'),
      confirmLabel: t('rotateAdminConfirmBtn'),
      onConfirm: () => rotate.mutate(undefined, { onSuccess: newKey => onAdminKeyRotated(newKey) }),
    });

  const confirmDelete = () =>
    confirmDestructive({
      title: t('deleteEventConfirmTitle', { title: event.title }),
      message: t('deleteEventConfirmDesc'),
      cancelLabel: t('confirmCancelBtn'),
      confirmLabel: t('deleteEventConfirmBtn'),
      onConfirm: () => remove.mutate(undefined, { onSuccess: () => router.dismissTo('/') }),
    });

  // Read at the moment of copying, because the event on screen can still hold a key that was changed.
  const copyAdminLink = async () => {
    const adminKey = (await getAdminKey(event.slug)) ?? event.adminKey;
    if (adminKey) await copy('admin', buildAdminLink(event.slug, adminKey));
  };

  return (
    <View style={styles.panel}>
      <NeoBadge label={t('adminVerifiedBadge')} tone="sunken" />
      <View style={styles.buttons}>
        <NeoButton
          label={copied === 'admin' ? t('copyAdminLinkDone') : t('copyAdminLinkBtn')}
          variant="secondary"
          size="sm"
          onPress={() => void copyAdminLink()}
        />
        <NeoButton label={t('rotateAdminBtn')} variant="secondary" size="sm" disabled={isBusy} onPress={confirmRotate} />
        <NeoButton
          label={event.isClosed ? t('reopenVotingBtn') : t('closeVotingBtn')}
          // As on the website: closing is the dark button, reopening the yellow one.
          variant={event.isClosed ? 'primary' : 'ink'}
          size="sm"
          disabled={isBusy}
          onPress={() => update.mutate({ isClosed: !event.isClosed })}
        />
        {event.confirmedDate ? (
          // Also here, because the pinned date can drop out of the best times, along with its button.
          <NeoButton label={t('unpinThisDate')} variant="secondary" size="sm" disabled={isBusy} onPress={() => update.mutate({ confirmedDate: '' })} />
        ) : null}
        <NeoButton
          label={remove.isPending ? t('deleteEventDeleting') : t('deleteEventBtn')}
          variant="danger"
          size="sm"
          disabled={isBusy}
          onPress={confirmDelete}
        />
      </View>
      {failed ? <NeoNotice message={errorMessage(failed, t)} /> : null}
      {failedText && (
        <>
          <NeoNotice message={t('copyManualNotice')} />
          <NeoText variant="caption" selectable>
            {failedText}
          </NeoText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});

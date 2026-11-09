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
import { ApiError } from '~/services/api';
import { confirmDestructive } from '~/services/confirm';
import { buildAdminLink } from '~/services/deepLink';
import { errorMessage } from '~/services/errorMessage';

interface ManagePanelProps {
  event: WanWangEvent;
  /** The new key is on this phone only until it is copied, so the screen reminds the person. */
  onAdminKeyRotated: () => void;
}

export function ManagePanel({ event, onAdminKeyRotated }: ManagePanelProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { copied, failedText, copy } = useCopy();
  const { update, rotate, remove } = useAdminActions(event.slug);

  const failed = update.error ?? rotate.error ?? remove.error;
  const isBusy = update.isPending || rotate.isPending || remove.isPending;

  const confirmRotate = () =>
    confirmDestructive({
      title: t('rotateAdminConfirmTitle'),
      message: t('rotateAdminConfirmDesc'),
      cancelLabel: t('confirmCancelBtn'),
      confirmLabel: t('rotateAdminConfirmBtn'),
      onConfirm: () => rotate.mutate(undefined, { onSuccess: onAdminKeyRotated }),
    });

  const confirmDelete = () =>
    confirmDestructive({
      title: t('deleteEventConfirmTitle', { title: event.title }),
      message: t('deleteEventConfirmDesc'),
      cancelLabel: t('confirmCancelBtn'),
      confirmLabel: t('deleteEventConfirmBtn'),
      onConfirm: () => remove.mutate(undefined, { onSuccess: () => router.dismissTo('/') }),
    });

  return (
    <View style={styles.panel}>
      <NeoBadge label={t('adminVerifiedBadge')} />
      <View style={styles.buttons}>
        {event.adminKey ? (
          <NeoButton
            label={copied === 'admin' ? t('copyAdminLinkDone') : t('copyAdminLinkBtn')}
            variant="secondary"
            size="sm"
            onPress={() => void copy('admin', buildAdminLink(event.slug, event.adminKey))}
          />
        ) : null}
        <NeoButton label={t('rotateAdminBtn')} variant="secondary" size="sm" disabled={isBusy} onPress={confirmRotate} />
        <NeoButton
          label={event.isClosed ? t('reopenVotingBtn') : t('closeVotingBtn')}
          variant="secondary"
          size="sm"
          disabled={isBusy}
          onPress={() => update.mutate({ isClosed: !event.isClosed })}
        />
        <NeoButton
          label={remove.isPending ? t('deleteEventDeleting') : t('deleteEventBtn')}
          variant="secondary"
          size="sm"
          disabled={isBusy}
          onPress={confirmDelete}
        />
      </View>
      {failed ? (
        <NeoNotice message={failed instanceof ApiError && failed.status === 403 ? t('adminLostError') : errorMessage(failed, t)} />
      ) : null}
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

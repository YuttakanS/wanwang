import { Alert } from 'react-native';

interface ConfirmOptions {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function confirmDestructive({ title, message, cancelLabel, confirmLabel, onConfirm }: ConfirmOptions): void {
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

import { Alert } from 'react-native';

type ConfirmDialogOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

export function showConfirmDialog({
  title = 'Confirmação',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  destructive = false,
}: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      {
        text: cancelText,
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

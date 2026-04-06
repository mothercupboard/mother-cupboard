import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import { WarmHearthColors } from '@/components/common/paper-theme';

type Props = {
  onAddManually: () => void;
  onBarcodeScanned: (barcode: string) => void;
};

function PermissionScreen({ onAddManually }: { onAddManually: () => void }) {
  const [, requestPermission] = useCameraPermissions();
  return (
    <View style={styles.centred}>
      <Text variant="bodyMedium" style={styles.permissionText}>
        Mother Cupboard needs camera access to scan product barcodes.
      </Text>
      <Button mode="contained" onPress={requestPermission} style={styles.button}>
        Allow camera access
      </Button>
      <Button mode="text" onPress={onAddManually} style={styles.button}>
        Add manually instead
      </Button>
    </View>
  );
}

export function BarcodeScanner({ onBarcodeScanned, onAddManually }: Props) {
  const [permission] = useCameraPermissions();
  const [active, setActive] = useState(true);
  const lastScannedRef = useRef<string | null>(null);

  if (!permission) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={WarmHearthColors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return <PermissionScreen onAddManually={onAddManually} />;
  }

  function handleScan({ data }: { data: string }) {
    if (!active || lastScannedRef.current === data)
      return;
    lastScannedRef.current = data;
    setActive(false);
    onBarcodeScanned(data);
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={handleScan}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
      />
      <View style={styles.overlay}>
        <View style={styles.viewfinder} />
        <Text variant="bodyMedium" style={styles.hint}>
          Point the camera at a product barcode
        </Text>
        <Button
          mode="outlined"
          onPress={onAddManually}
          style={styles.manualButton}
          labelStyle={styles.manualButtonLabel}
        >
          Add manually
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centred: {
    alignItems: 'center',
    backgroundColor: WarmHearthColors.background,
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  permissionText: {
    color: WarmHearthColors.textPrimary,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
  },
  button: { borderRadius: 12 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    gap: 24,
    justifyContent: 'center',
  },
  viewfinder: {
    backgroundColor: 'transparent',
    borderColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    height: 160,
    width: 260,
  },
  hint: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  manualButton: { borderColor: '#FFFFFF', borderRadius: 12 },
  manualButtonLabel: { color: '#FFFFFF', fontFamily: 'Nunito_600SemiBold' },
});

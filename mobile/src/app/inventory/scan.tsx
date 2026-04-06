import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { WarmHearthColors } from '@/components/common/paper-theme';
import { BarcodeScanner } from '@/features/inventory/components/barcode-scanner';
import { resolveBarcode } from '@/lib/barcode/off-lookup';

export default function ScanScreen() {
  const [resolving, setResolving] = useState(false);

  async function handleBarcodeScanned(barcode: string) {
    setResolving(true);
    try {
      const product = await resolveBarcode(barcode);
      if (product) {
        router.replace({
          pathname: '/inventory/add-item',
          params: { barcode, category: product.category ?? '', name: product.name },
        });
      }
      else {
        router.replace({
          pathname: '/inventory/add-item',
          params: { barcode, notFound: '1' },
        });
      }
    }
    catch {
      router.replace({
        pathname: '/inventory/add-item',
        params: { barcode, notFound: '1' },
      });
    }
    finally {
      setResolving(false);
    }
  }

  function handleAddManually() {
    router.replace('/inventory/add-item');
  }

  return (
    <View style={styles.container}>
      <BarcodeScanner
        onBarcodeScanned={handleBarcodeScanned}
        onAddManually={handleAddManually}
      />
      {resolving && (
        <View style={styles.resolving}>
          <ActivityIndicator size="large" color={WarmHearthColors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#000', flex: 1 },
  resolving: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
  },
});

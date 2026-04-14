const fs = require('fs');

// === 4. Quantity field: replace with tappable display + dialog ===
// Since keyboard-controller blocks 2nd+ TextInputs, we use a Dialog
// with a single TextInput (first and only = keyboard works)
let addForm = fs.readFileSync('src/features/inventory/components/add-item-form.tsx', 'utf8');

// Add Dialog and Portal imports from Paper (if not already)
if (!addForm.includes('Dialog')) {
  addForm = addForm.replace(
    "import { Button, SegmentedButtons, Text, TextInput as PaperTextInput } from 'react-native-paper';",
    "import { Button, Dialog, Portal, SegmentedButtons, Text, TextInput as PaperTextInput } from 'react-native-paper';"
  );
}

// Add Pressable import
if (!addForm.includes('Pressable')) {
  addForm = addForm.replace(
    "import { ScrollView, StyleSheet } from 'react-native';",
    "import { Pressable, ScrollView, StyleSheet } from 'react-native';"
  );
}

// Add dialog state
addForm = addForm.replace(
  "const [submitting, setSubmitting] = useState(false);",
  "const [submitting, setSubmitting] = useState(false);\n  const [qtyDialogVisible, setQtyDialogVisible] = useState(false);\n  const [qtyDraft, setQtyDraft] = useState(quantity);"
);

// Replace the PaperTextInput quantity field with a tappable display + dialog
addForm = addForm.replace(
  /      <PaperTextInput[\s\S]*?label="Quantity \(optional\)"[\s\S]*?\/>/,
  `      <Pressable onPress={() => { setQtyDraft(quantity); setQtyDialogVisible(true); }}>
        <PaperTextInput
          label="Quantity (optional)"
          value={quantity}
          mode="outlined"
          editable={false}
          right={<PaperTextInput.Icon icon="pencil" />}
          style={styles.paperInput}
          outlineColor={WarmHearthColors.outline}
          activeOutlineColor={WarmHearthColors.primary}
          theme={{ fonts: { bodyLarge: { fontFamily: 'Nunito_400Regular' } } }}
        />
      </Pressable>
      <Portal>
        <Dialog visible={qtyDialogVisible} onDismiss={() => setQtyDialogVisible(false)}>
          <Dialog.Title style={{ fontFamily: 'Nunito_700Bold' }}>Quantity</Dialog.Title>
          <Dialog.Content>
            <PaperTextInput
              label="Enter quantity"
              value={qtyDraft}
              onChangeText={setQtyDraft}
              mode="outlined"
              keyboardType="decimal-pad"
              autoFocus
              style={{ backgroundColor: WarmHearthColors.background }}
              theme={{ fonts: { bodyLarge: { fontFamily: 'Nunito_400Regular' } } }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setQtyDialogVisible(false)}>Cancel</Button>
            <Button onPress={() => { setQuantity(qtyDraft); setQtyDialogVisible(false); }}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>`
);

fs.writeFileSync('src/features/inventory/components/add-item-form.tsx', addForm);
console.log('4a. add-item-form: quantity dialog');

// Same for edit form
let editForm = fs.readFileSync('src/features/inventory/components/edit-item-form.tsx', 'utf8');
if (!editForm.includes('Pressable')) {
  editForm = editForm.replace(
    "import { ScrollView, StyleSheet, View } from 'react-native';",
    "import { Pressable, ScrollView, StyleSheet, View } from 'react-native';"
  );
}
if (!editForm.includes('qtyDialogVisible')) {
  editForm = editForm.replace(
    /const \[submitting, setSubmitting\] = useState\(false\);/,
    "const [submitting, setSubmitting] = useState(false);\n  const [qtyDialogVisible, setQtyDialogVisible] = useState(false);\n  const [qtyDraft, setQtyDraft] = useState(quantity);"
  );
  editForm = editForm.replace(
    /      <PaperTextInput[\s\S]*?label="Quantity \(optional\)"[\s\S]*?\/>/,
    `      <Pressable onPress={() => { setQtyDraft(quantity); setQtyDialogVisible(true); }}>
        <PaperTextInput
          label="Quantity (optional)"
          value={quantity}
          mode="outlined"
          editable={false}
          right={<PaperTextInput.Icon icon="pencil" />}
          style={styles.paperInput}
          outlineColor={WarmHearthColors.outline}
          activeOutlineColor={WarmHearthColors.primary}
          theme={{ fonts: { bodyLarge: { fontFamily: 'Nunito_400Regular' } } }}
        />
      </Pressable>
      <Portal>
        <Dialog visible={qtyDialogVisible} onDismiss={() => setQtyDialogVisible(false)}>
          <Dialog.Title style={{ fontFamily: 'Nunito_700Bold' }}>Quantity</Dialog.Title>
          <Dialog.Content>
            <PaperTextInput
              label="Enter quantity"
              value={qtyDraft}
              onChangeText={setQtyDraft}
              mode="outlined"
              keyboardType="decimal-pad"
              autoFocus
              style={{ backgroundColor: WarmHearthColors.background }}
              theme={{ fonts: { bodyLarge: { fontFamily: 'Nunito_400Regular' } } }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setQtyDialogVisible(false)}>Cancel</Button>
            <Button onPress={() => { setQuantity(qtyDraft); setQtyDialogVisible(false); }}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>`
  );
  fs.writeFileSync('src/features/inventory/components/edit-item-form.tsx', editForm);
  console.log('4b. edit-item-form: quantity dialog');
}

// === 5. Add "Choose from Photos" to receipt scanner ===
let rsm = fs.readFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', 'utf8');
if (!rsm.includes('handleChoosePhoto')) {
  // Add the function after handleTakePhoto
  const insertAfter = rsm.indexOf('async function handleTakePhoto()');
  const funcEnd = rsm.indexOf('\n  }', rsm.indexOf('handleTakePhoto'));
  const afterFunc = rsm.indexOf('\n', funcEnd + 4);
  
  const choosePhotoFunc = `
  async function handleChoosePhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Photos access needed', 'Please allow photo library access to select receipt images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setState('parsing');
    try {
      const parsed = await parseReceiptImage(result.assets[0].base64);
      setItems(parsed.map((p, i) => ({ ...p, id: String(i) })));
      setState('review');
    } catch (err) {
      Alert.alert('Parsing failed', err instanceof Error ? err.message : 'Unknown error');
      setState('idle');
    }
  }`;
  
  rsm = rsm.slice(0, afterFunc) + '\n' + choosePhotoFunc + rsm.slice(afterFunc);
  
  // Add the "Choose from Photos" button after the camera button
  rsm = rsm.replace(
    /(<Button\s+mode="contained"[^>]*onPress=\{handleTakePhoto\}[\s\S]*?<\/Button>)/,
    '$1\n            <Button\n              mode="outlined"\n              icon="image-multiple"\n              onPress={handleChoosePhoto}\n              style={styles.photoButton}\n              labelStyle={styles.buttonLabel}\n            >\n              Choose from Photos\n            </Button>'
  );
  
  // Add photoButton style
  if (!rsm.includes('photoButton')) {
    rsm = rsm.replace(
      /buttonLabel:/,
      "photoButton: { borderColor: WarmHearthColors.primary, borderRadius: 12, marginTop: 8 },\n  buttonLabel:"
    );
  }
  
  fs.writeFileSync('src/features/inventory/components/receipt-scanner-modal.tsx', rsm);
  console.log('5. Added Choose from Photos to receipt scanner');
}

console.log('\nPart 2 done. Run: npx tsc --noEmit');

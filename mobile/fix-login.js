const fs = require('fs');
let login = fs.readFileSync('src/features/auth/components/login-form.tsx', 'utf8');

// Add Pressable and View imports
login = login.replace(
  "import { useState } from 'react';",
  "import { useRef, useState } from 'react';"
);
login = login.replace(
  "import { StyleSheet, View } from 'react-native';",
  "import { Pressable, StyleSheet, View } from 'react-native';"
);

// Add Dialog import from Paper
login = login.replace(
  "import { Button, Text, TextInput } from 'react-native-paper';",
  "import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';"
);

// Add password dialog state after showPassword state
login = login.replace(
  "const [showPassword, setShowPassword] = useState(false);",
  "const [showPassword, setShowPassword] = useState(false);\n  const [pwDialogVisible, setPwDialogVisible] = useState(false);\n  const [pwDraft, setPwDraft] = useState('');"
);

// Replace the password FormTextField with a tappable display + dialog
login = login.replace(
  /(<form\.Field\s+name="password"[\s\S]*?<\/form\.Field>)/,
  `<form.Field
        name="password"
        validators={{
          onChangeAsyncDebounceMs: 300,
          onChange: ({ value }) => {
            if (!value)
              return undefined;
            const r = passwordSchema.safeParse(value);
            return r.success ? undefined : r.error.issues[0]?.message;
          },
        }}
      >
        {field => (
          <>
            <Pressable onPress={() => { setPwDraft(field.state.value); setPwDialogVisible(true); }}>
              <View pointerEvents="none">
                <FormTextField
                  label="Password"
                  value={field.state.value ? '••••••••' : ''}
                  onChangeText={() => {}}
                  onBlur={() => {}}
                  errors={field.state.meta.errors.map(String)}
                  isTouched={field.state.meta.isTouched}
                  accessibilityHint="Tap to enter your password"
                />
              </View>
            </Pressable>
            <Portal>
              <Dialog visible={pwDialogVisible} onDismiss={() => setPwDialogVisible(false)}>
                <Dialog.Title style={{ fontFamily: 'Nunito_700Bold' }}>Password</Dialog.Title>
                <Dialog.Content>
                  <TextInput
                    label="Enter password"
                    value={pwDraft}
                    onChangeText={setPwDraft}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    textContentType="password"
                    right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
                    style={{ backgroundColor: '#FAF6F0' }}
                  />
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={() => setPwDialogVisible(false)}>Cancel</Button>
                  <Button onPress={() => { field.handleChange(pwDraft); setPwDialogVisible(false); }}>OK</Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>
          </>
        )}
      </form.Field>`
);

fs.writeFileSync('src/features/auth/components/login-form.tsx', login);
console.log('Login form: password uses dialog (bypasses keyboard-controller)');

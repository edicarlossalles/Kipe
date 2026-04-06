// src/screens/Wallet/WalletScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

export default function WalletScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Carteira — em breve 💳</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  text: { color: Colors.textSecondary, fontSize: Typography.fontSize.lg },
});

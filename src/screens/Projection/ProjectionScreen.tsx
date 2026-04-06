// src/screens/Projection/ProjectionScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

export default function ProjectionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Projeção financeira — em breve 📊</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  text: { color: Colors.textSecondary, fontSize: Typography.fontSize.lg },
});

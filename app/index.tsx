import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hermes</Text>
      <Text style={styles.subtitle}>Mobile</Text>
      <Text style={styles.caption}>Frontend inicializado correctamente.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#F4F7FB',
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#7DD3FC',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  caption: {
    color: '#A7B1C0',
    fontSize: 14,
    textAlign: 'center',
  },
});

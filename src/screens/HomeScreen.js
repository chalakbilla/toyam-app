import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../components/GradientBackground';
import ToyamWordmark from '../components/ToyamWordmark';
import { GlassCard } from '../components/Cards';
import { PrimaryButton } from '../components/Buttons';
import { colors, type, spacing, radius } from '../theme/theme';
import { useIncomingShare } from '../lib/shareIntent';

function ActionCard({ eyebrow, title, description, cta, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <GlassCard style={styles.actionCard}>
        <Text style={type.label}>{eyebrow}</Text>
        <Text style={[type.h2, { marginTop: 6, marginBottom: 6 }]}>{title}</Text>
        <Text style={type.bodyMuted}>{description}</Text>
        <Text style={styles.cta}>{cta} &rarr;</Text>
      </GlassCard>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { incoming, clear } = useIncomingShare();

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <ToyamWordmark size={32} />
            <Text style={[type.bodyMuted, { marginTop: 4 }]}>WhatsApp policy import & Drive backup</Text>
          </View>

          {incoming ? (
            <GlassCard style={styles.shareBanner}>
              <Text style={type.label}>RECEIVED FROM WHATSAPP</Text>
              <Text style={[type.body, { marginTop: 6, marginBottom: 14 }]}>{incoming.label}</Text>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <PrimaryButton
                    label="Continue"
                    onPress={() => {
                      navigation.navigate('Import', { incomingItems: incoming.items, incomingLabel: incoming.label });
                      clear();
                    }}
                  />
                </View>
                <Pressable style={styles.dismiss} onPress={clear}>
                  <Text style={{ color: colors.lavender }}>Dismiss</Text>
                </Pressable>
              </View>
            </GlassCard>
          ) : null}

          <ActionCard
            eyebrow="FROM AN EXPORTED CHAT"
            title="Import policies"
            description="Upload a WhatsApp 'Export chat' .zip, or share it here straight from WhatsApp's share sheet."
            cta="Start import"
            onPress={() => navigation.navigate('Import')}
          />

          <ActionCard
            eyebrow="ALREADY EXTRACTED"
            title="Saved policies"
            description="Browse policies already saved on this device and send a batch to Google Drive."
            cta="Open saved policies"
            onPress={() => navigation.navigate('SavedPolicies')}
          />

          <View style={styles.footerNote}>
            <Text style={type.bodyMuted}>
              Policy folders keep the same naming the desktop tool uses — e.g. 2234555_25-06-2025 — so anything saved
              here uploads to the same Drive structure.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xl, marginTop: spacing.md },
  actionCard: { marginBottom: spacing.md },
  cta: { color: colors.hazeGold, marginTop: spacing.md, fontFamily: type.label.fontFamily, fontSize: 13 },
  shareBanner: { marginBottom: spacing.lg, borderColor: colors.hazeGold },
  dismiss: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  footerNote: { marginTop: spacing.md, paddingHorizontal: spacing.xs },
});

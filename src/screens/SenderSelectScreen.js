import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../components/GradientBackground';
import { GlassCard, StepHeader } from '../components/Cards';
import { PrimaryButton, Chip } from '../components/Buttons';
import { type, spacing } from '../theme/theme';
import { useImport } from '../context/ImportContext';
import { buildPoliciesFromMessages } from '../lib/policyBuilder';
import { saveExtractedPolicies } from '../lib/policyStorage';
import { cleanupExtractedDir } from '../lib/zipImporter';

export default function SenderSelectScreen({ navigation, route }) {
  const { messageCount } = route.params || {};
  const { extractedDir, messages, participants, dateRange, selectedSenders, setSelectedSenders, setSaveResults } = useImport();
  const [loading, setLoading] = useState(false);

  const toggle = (name) => {
    setSelectedSenders((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  };
  const allSelected = selectedSenders.length === participants.length;
  const toggleAll = () => setSelectedSenders(allSelected ? [] : [...participants]);

  const extract = async () => {
    if (!selectedSenders.length) {
      Alert.alert('Pick at least one sender', "Only messages from the selected sender(s) are scanned for policies — this mirrors the live bot's rule.");
      return;
    }
    setLoading(true);
    try {
      const senderSet = new Set(selectedSenders);
      const filtered = messages.filter((m) => m.sender && senderSet.has(m.sender));
      const policies = buildPoliciesFromMessages(filtered);
      if (!policies.length) {
        Alert.alert('No policies found', 'No message from the selected sender(s) started with "##" followed by a policy ID (e.g. "## ABC1234").');
        setLoading(false);
        return;
      }
      const results = await saveExtractedPolicies(extractedDir, policies);
      setSaveResults(results);
      cleanupExtractedDir(extractedDir); // media already copied into permanent policy folders
      navigation.navigate('Review');
    } catch (error) {
      Alert.alert('Extraction failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <StepHeader
            step={2}
            total={3}
            title="Whose messages hold the policies?"
            subtitle={`${messageCount || messages.length} messages found${dateRange ? ` between ${dateRange.from} and ${dateRange.to}` : ''}. Only the sender(s) you pick get scanned for policy numbers.`}
          />

          <GlassCard>
            <View style={styles.rowBetween}>
              <Text style={type.label}>{participants.length} PARTICIPANT(S)</Text>
              <Chip label={allSelected ? 'Clear all' : 'Select all'} selected={allSelected} onPress={toggleAll} />
            </View>
            <View style={styles.chipRow}>
              {participants.map((name) => (
                <Chip key={name} label={name} selected={selectedSenders.includes(name)} onPress={() => toggle(name)} />
              ))}
            </View>
          </GlassCard>

          <View style={{ marginTop: spacing.xl }}>
            <PrimaryButton label="Extract & save policies" onPress={extract} loading={loading} disabled={!selectedSenders.length} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
});
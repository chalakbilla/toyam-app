import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../components/GradientBackground';
import { GlassCard, StepHeader, PolicyRow } from '../components/Cards';
import { PrimaryButton, GhostButton, Chip } from '../components/Buttons';
import { type, spacing } from '../theme/theme';
import { useImport } from '../context/ImportContext';
import { shareSelectedPoliciesAsZip } from '../lib/exportZip';

export default function ReviewScreen({ navigation }) {
  const { saveResults, sourceName } = useImport();
  const [selected, setSelected] = useState(() => new Set(saveResults.filter((r) => r.status !== 'error').map((r) => r.folder)));
  const [sharing, setSharing] = useState(false);

  const toggle = (folder) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(folder) ? next.delete(folder) : next.add(folder);
      return next;
    });
  };

  const eligible = saveResults.filter((r) => r.status !== 'error');
  const allSelected = selected.size === eligible.length && eligible.length > 0;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(eligible.map((r) => r.folder)));

  const selectedPolicies = () => saveResults.filter((r) => selected.has(r.folder));

  const shareZip = async () => {
    const picked = selectedPolicies();
    if (!picked.length) return Alert.alert('Nothing selected', 'Tick at least one policy first.');
    setSharing(true);
    try {
      await shareSelectedPoliciesAsZip(picked);
    } catch (error) {
      Alert.alert('Could not build zip', error.message);
    } finally {
      setSharing(false);
    }
  };

  const goUpload = () => {
    const picked = selectedPolicies();
    if (!picked.length) return Alert.alert('Nothing selected', 'Tick at least one policy first.');
    navigation.navigate('DriveUpload', { policies: picked });
  };

  const savedCount = saveResults.filter((r) => r.status === 'saved').length;
  const existsCount = saveResults.filter((r) => r.status === 'exists').length;

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <StepHeader
            step={3}
            total={3}
            title="Extracted policies"
            subtitle={`${savedCount} newly saved${existsCount ? `, ${existsCount} already existed` : ''} from ${sourceName || 'this export'}.`}
          />

          <GlassCard>
            <View style={styles.rowBetween}>
              <Text style={type.label}>{saveResults.length} POLIC{saveResults.length === 1 ? 'Y' : 'IES'}</Text>
              <Chip label={allSelected ? 'Clear all' : 'Select all'} selected={allSelected} onPress={toggleAll} />
            </View>
            {saveResults.map((r) => (
              <PolicyRow
                key={r.folder}
                number={r.number}
                dateStr={r.dateStr}
                status={r.status}
                selected={selected.has(r.folder)}
                onToggle={() => r.status !== 'error' && toggle(r.folder)}
                meta={r.mediaCount ? `${r.mediaCount} attachment${r.mediaCount === 1 ? '' : 's'}` : null}
              />
            ))}
          </GlassCard>

          <View style={{ marginTop: spacing.xl }}>
            <PrimaryButton label="Send selected to Drive" onPress={goUpload} />
            <View style={{ height: spacing.sm }} />
            <GhostButton label="Share selected as .zip" onPress={shareZip} disabled={sharing} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
});

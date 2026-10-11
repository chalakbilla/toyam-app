import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../components/GradientBackground';
import { GlassCard, StepHeader, PolicyRow } from '../components/Cards';
import { PrimaryButton, Chip } from '../components/Buttons';
import { colors, fonts, radius, type, spacing } from '../theme/theme';
import { useImport } from '../context/ImportContext';
import { shareSelectedPoliciesAsZip } from '../lib/exportZip';

export default function ReviewScreen({ navigation }) {
  const { saveResults, sourceName } = useImport();
  // Nothing is pre-selected — the user searches for / ticks the policies they want.
  const [selected, setSelected] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareProgress, setShareProgress] = useState(0);

  const toggle = (folder) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(folder) ? next.delete(folder) : next.add(folder);
      return next;
    });
  };

  // Filter by policy number, date or time (case/space-insensitive, '#' ignored).
  const normalize = (v) => String(v ?? '').toLowerCase().replace(/[#\s]/g, '');
  const visible = useMemo(() => {
    const q = normalize(query);
    if (!q) return saveResults;
    return saveResults.filter((r) => [r.number, r.dateStr, r.timeStr].some((f) => normalize(f).includes(q)));
  }, [saveResults, query]);

  // "Select all" acts on what is currently visible, so searching then selecting all
  // picks only the matches. Selections made earlier are kept while the search changes.
  const eligible = visible.filter((r) => r.status !== 'error');
  const allSelected = eligible.length > 0 && eligible.every((r) => selected.has(r.folder));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) eligible.forEach((r) => next.delete(r.folder));
      else eligible.forEach((r) => next.add(r.folder));
      return next;
    });

  const selectedPolicies = () => saveResults.filter((r) => selected.has(r.folder));

  const shareZip = async () => {
    const picked = selectedPolicies();
    if (!picked.length) return Alert.alert('Nothing selected', 'Tick at least one policy first.');
    setSharing(true);
    setShareProgress(0);
    try {
      await shareSelectedPoliciesAsZip(picked, setShareProgress);
    } catch (error) {
      Alert.alert('Could not build zip', error.message);
    } finally {
      setSharing(false);
      setShareProgress(0);
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <StepHeader
            step={3}
            total={3}
            title="Extracted policies"
            subtitle={`${savedCount} newly saved${existsCount ? `, ${existsCount} already existed` : ''} from ${sourceName || 'this export'}.`}
          />

          <GlassCard>
            <View style={styles.rowBetween}>
              <Text style={type.label}>
                {query.trim() ? `${visible.length} OF ${saveResults.length}` : saveResults.length} POLIC{saveResults.length === 1 ? 'Y' : 'IES'}
                {selected.size ? `  ·  ${selected.size} SELECTED` : ''}
              </Text>
              <Chip
                label={allSelected ? 'Clear all' : query.trim() ? 'Select results' : 'Select all'}
                selected={allSelected}
                onPress={toggleAll}
              />
            </View>

            <View style={styles.searchWrap}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by policy number or date"
                placeholderTextColor="rgba(241,232,221,0.4)"
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={10} style={styles.clearBtn}>
                  <Text style={styles.clearText}>✕</Text>
                </Pressable>
              ) : null}
            </View>

            {visible.length === 0 ? (
              <Text style={[type.bodyMuted, styles.empty]}>No policies match "{query.trim()}".</Text>
            ) : null}

            {visible.map((r) => (
              <PolicyRow
                key={r.folder}
                number={r.number}
                dateStr={r.dateStr}
                status={r.status}
                selected={selected.has(r.folder)}
                onToggle={() => r.status !== 'error' && toggle(r.folder)}
                meta={[r.timeStr, r.mediaCount ? `${r.mediaCount} attachment${r.mediaCount === 1 ? '' : 's'}` : null].filter(Boolean).join('  ·  ')}
              />
            ))}
          </GlassCard>

          <View style={{ marginTop: spacing.xl }}>
            <PrimaryButton label="Send selected to Drive" onPress={goUpload} />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              tone="mist"
              label={sharing ? `Zipping… ${Math.round(shareProgress * 100)}%` : 'Share selected as .zip'}
              onPress={shareZip}
              disabled={sharing}
            />
            {sharing ? (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(shareProgress * 100)}%` }]} />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.cardGlassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.mist,
    fontFamily: fonts.body,
  },
  clearBtn: { position: 'absolute', right: spacing.md, padding: 4 },
  clearText: { color: colors.lavender, fontFamily: fonts.bodyMedium, fontSize: 14 },
  empty: { textAlign: 'center', paddingVertical: spacing.lg },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(241,232,221,0.15)',
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.hazeGold, borderRadius: 2 },
});
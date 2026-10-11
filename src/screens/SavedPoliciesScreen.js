import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import GradientBackground from '../components/GradientBackground';
import { GlassCard, StepHeader, PolicyRow } from '../components/Cards';
import { PrimaryButton, Chip } from '../components/Buttons';
import { type, spacing } from '../theme/theme';
import { POLICIES_ROOT, listSavedPolicyFolders, readPolicyMeta } from '../lib/policyStorage';

function parseFolderName(folder) {
  const m = /^(.+)_(\d{2}-\d{2}-\d{4})$/.exec(folder);
  return m ? { number: m[1], dateStr: m[2] } : { number: folder, dateStr: '' };
}

function metaLine(meta) {
  const parts = [];
  if (meta.timeStr) parts.push(meta.timeStr);
  if (meta.mediaCount) parts.push(`${meta.mediaCount} attachment${meta.mediaCount === 1 ? '' : 's'}`);
  return parts.join('  ·  ');
}

export default function SavedPoliciesScreen({ navigation }) {
  const [folders, setFolders] = useState([]);
  const [metaByFolder, setMetaByFolder] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      listSavedPolicyFolders()
        .then(async (names) => {
          const sorted = names.sort().reverse();
          if (!active) return;
          setFolders(sorted);
          const entries = await Promise.all(
            sorted.map(async (folder) => [folder, await readPolicyMeta(`${POLICIES_ROOT}/${folder}`)])
          );
          if (active) setMetaByFolder(Object.fromEntries(entries));
        })
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [])
  );

  const toggle = (folder) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(folder) ? next.delete(folder) : next.add(folder);
      return next;
    });
  };
  const allSelected = selected.size === folders.length && folders.length > 0;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(folders));

  const goUpload = () => {
    if (!selected.size) return Alert.alert('Nothing selected', 'Tick at least one saved policy first.');
    const policies = Array.from(selected).map((folder) => ({
      ...parseFolderName(folder),
      folder,
      folderUri: `${POLICIES_ROOT}/${folder}`,
    }));
    navigation.navigate('DriveUpload', { policies });
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <StepHeader
            step={1}
            total={1}
            title="Saved policies"
            subtitle="Every policy folder already extracted on this device — pick a batch to send to Drive."
          />

          <GlassCard>
            {loading ? (
              <Text style={type.bodyMuted}>Loading…</Text>
            ) : folders.length === 0 ? (
              <Text style={type.bodyMuted}>Nothing saved yet — import a chat export first.</Text>
            ) : (
              <>
                <View style={styles.rowBetween}>
                  <Text style={type.label}>{folders.length} SAVED</Text>
                  <Chip label={allSelected ? 'Clear all' : 'Select all'} selected={allSelected} onPress={toggleAll} />
                </View>
                {folders.map((folder) => {
                  const { number, dateStr } = parseFolderName(folder);
                  return (
                    <PolicyRow
                      key={folder}
                      number={number}
                      dateStr={dateStr}
                      status="saved"
                      selected={selected.has(folder)}
                      onToggle={() => toggle(folder)}
                      meta={metaLine(metaByFolder[folder] || {})}
                    />
                  );
                })}
              </>
            )}
          </GlassCard>

          {folders.length > 0 && (
            <View style={{ marginTop: spacing.xl }}>
              <PrimaryButton label="Send selected to Drive" onPress={goUpload} />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
});

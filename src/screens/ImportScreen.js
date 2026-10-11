import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import GradientBackground from '../components/GradientBackground';
import { GlassCard, StepHeader } from '../components/Cards';
import { PrimaryButton, Chip, GhostButton } from '../components/Buttons';
import { colors, type, spacing } from '../theme/theme';
import { useImport } from '../context/ImportContext';
import { ingestExportZip, ingestSharedItems, cleanupExtractedDir } from '../lib/zipImporter';

export default function ImportScreen({ navigation, route }) {
  const { incomingItems, incomingLabel } = route.params || {};
  const [pickedFile, setPickedFile] = useState(null); // { uri, name } from the document picker
  const [dateFormat, setDateFormat] = useState('DMY');
  const [loading, setLoading] = useState(false);
  const importCtx = useImport();

  const sharedItems = incomingItems || null;
  const displayName = pickedFile ? pickedFile.name : incomingLabel || null;

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/zip', '*/*'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPickedFile({ uri: asset.uri, name: asset.name });
  };

  const parse = async () => {
    if (!pickedFile && !sharedItems) {
      Alert.alert('Choose a file', 'Pick the .zip WhatsApp gave you when you exported the chat.');
      return;
    }
    setLoading(true);
    try {
      if (importCtx.extractedDir) cleanupExtractedDir(importCtx.extractedDir); // drop any leftover from a previous import

      const result = pickedFile
        ? await ingestExportZip(pickedFile.uri, dateFormat)
        : await ingestSharedItems(sharedItems, dateFormat);
      const { extractedDir, messages, participants, messageCount, dateRange, warning } = result;

      if (!participants.length) {
        await cleanupExtractedDir(extractedDir);
        Alert.alert('No senders found', 'This export only contains system messages — nothing to extract policies from.');
        setLoading(false);
        return;
      }
      if (warning) Alert.alert('Heads up', warning);

      importCtx.setExtractedDir(extractedDir);
      importCtx.setSourceName(pickedFile ? pickedFile.name : incomingLabel);
      importCtx.setMessages(messages);
      importCtx.setParticipants(participants);
      importCtx.setDateRange(dateRange);
      importCtx.setSelectedSenders([]);
      navigation.navigate('SenderSelect', { messageCount });
    } catch (error) {
      Alert.alert('Could not read that export', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <StepHeader
            step={1}
            total={3}
            title="Bring in a chat export"
            subtitle="On your phone: open the chat → More → Export chat → Include Media, then upload the .zip here — or share it to Toyam directly from WhatsApp."
          />

          <GlassCard>
            <Text style={type.label}>EXPORTED FILE</Text>
            <Text style={[type.body, styles.fileName]}>{displayName || 'No file selected yet'}</Text>
            <GhostButton label={displayName ? 'Choose a different file' : 'Choose .zip file'} onPress={pickFile} />
          </GlassCard>

          <GlassCard style={{ marginTop: spacing.md }}>
            <Text style={type.label}>DATE FORMAT USED IN THE EXPORT</Text>
            <View style={styles.chipRow}>
              <Chip label="DD/MM/YYYY" selected={dateFormat === 'DMY'} onPress={() => setDateFormat('DMY')} />
              <Chip label="MM/DD/YYYY" selected={dateFormat === 'MDY'} onPress={() => setDateFormat('MDY')} />
            </View>
            <Text style={type.bodyMuted}>Most exports (including India) use DD/MM/YYYY.</Text>
          </GlassCard>

          <View style={{ marginTop: spacing.xl }}>
            <PrimaryButton label="Upload & parse" onPress={parse} loading={loading} disabled={!pickedFile && !sharedItems} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  fileName: { marginTop: 6, marginBottom: spacing.md, color: colors.mist },
  chipRow: { flexDirection: 'row', marginTop: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import GradientBackground from '../components/GradientBackground';
import { GlassCard, StepHeader } from '../components/Cards';
import { PrimaryButton, Chip, GhostButton } from '../components/Buttons';
import { colors, type, spacing } from '../theme/theme';
import { useImport } from '../context/ImportContext';
import { ingestExportZip } from '../lib/zipImporter';

export default function ImportScreen({ navigation, route }) {
  const { incomingUri, incomingName } = route.params || {};
  const [fileUri, setFileUri] = useState(incomingUri || null);
  const [fileName, setFileName] = useState(incomingName || null);
  const [dateFormat, setDateFormat] = useState('DMY');
  const [loading, setLoading] = useState(false);
  const importCtx = useImport();

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/zip', '*/*'], copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    setFileUri(asset.uri);
    setFileName(asset.name);
  };

  const parse = async () => {
    if (!fileUri) {
      Alert.alert('Choose a file', 'Pick the .zip WhatsApp gave you when you exported the chat.');
      return;
    }
    setLoading(true);
    try {
      const { zip, messages, participants, messageCount, dateRange } = await ingestExportZip(fileUri, dateFormat);
      if (!participants.length) {
        Alert.alert('No senders found', 'This export only contains system messages — nothing to extract policies from.');
        setLoading(false);
        return;
      }
      importCtx.setZip(zip);
      importCtx.setSourceName(fileName);
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
            <Text style={[type.body, styles.fileName]}>{fileName || 'No file selected yet'}</Text>
            <GhostButton label={fileName ? 'Choose a different file' : 'Choose .zip file'} onPress={pickFile} />
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
            <PrimaryButton label="Upload & parse" onPress={parse} loading={loading} disabled={!fileUri} />
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

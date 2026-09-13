import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GradientBackground from '../components/GradientBackground';
import { GlassCard, StepHeader } from '../components/Cards';
import { PrimaryButton, GhostButton } from '../components/Buttons';
import { colors, fonts, type, spacing, radius } from '../theme/theme';
import { isSignedIn, signIn, signOut, uploadPolicyToDrive } from '../lib/googleDrive';

export default function DriveUploadScreen({ route, navigation }) {
  const { policies } = route.params;
  const [signedIn, setSignedIn] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    isSignedIn().then(setSignedIn);
  }, []);

  const connect = async () => {
    setConnecting(true);
    try {
      await signIn();
      setSignedIn(true);
    } catch (error) {
      Alert.alert('Google sign-in failed', error.message);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    await signOut();
    setSignedIn(false);
  };

  const upload = async () => {
    if (!folderName.trim()) {
      Alert.alert('Name the Drive folder', 'This is created under "WhatsApp Policies" in your Drive.');
      return;
    }
    setUploading(true);
    setResults(null);
    try {
      const outcome = await uploadPolicyToDrive(policies, folderName.trim(), setProgress);
      setResults(outcome);
      const failed = outcome.filter((r) => r.status === 'failed');
      if (failed.length) {
        Alert.alert('Some uploads failed', `${outcome.length - failed.length} succeeded, ${failed.length} failed. See the list below.`);
      } else {
        Alert.alert('Upload complete', `${outcome.length} polic${outcome.length === 1 ? 'y' : 'ies'} uploaded to "${folderName.trim()}".`);
      }
    } catch (error) {
      Alert.alert('Upload failed', error.message);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <StepHeader step={1} total={1} title="Send to Google Drive" subtitle={`${policies.length} polic${policies.length === 1 ? 'y' : 'ies'} selected.`} />

          <GlassCard>
            <Text style={type.label}>GOOGLE ACCOUNT</Text>
            {signedIn === null ? (
              <Text style={[type.bodyMuted, { marginTop: 8 }]}>Checking…</Text>
            ) : signedIn ? (
              <View style={styles.rowBetween}>
                <Text style={[type.body, { marginTop: 8 }]}>Connected</Text>
                <GhostButton label="Disconnect" onPress={disconnect} />
              </View>
            ) : (
              <View style={{ marginTop: spacing.sm }}>
                <PrimaryButton label="Connect Google Drive" onPress={connect} loading={connecting} />
              </View>
            )}
          </GlassCard>

          <GlassCard style={{ marginTop: spacing.md }}>
            <Text style={type.label}>DRIVE FOLDER NAME</Text>
            <Text style={[type.bodyMuted, { marginTop: 4, marginBottom: spacing.sm }]}>Created under "WhatsApp Policies" in your Drive.</Text>
            <TextInput
              value={folderName}
              onChangeText={setFolderName}
              placeholder="e.g. Client A"
              placeholderTextColor="rgba(241,232,221,0.4)"
              style={styles.input}
            />
          </GlassCard>

          <View style={{ marginTop: spacing.xl }}>
            <PrimaryButton
              label={progress ? `Uploading ${progress.done}/${progress.total}…` : 'Upload to Drive'}
              onPress={upload}
              loading={uploading}
              disabled={!signedIn}
            />
          </View>

          {results ? (
            <GlassCard style={{ marginTop: spacing.lg }}>
              <Text style={type.label}>RESULTS</Text>
              {results.map((r) => (
                <View key={r.policy} style={styles.resultRow}>
                  <Text style={type.body}>Policy #{r.policy}</Text>
                  <Text style={{ color: r.status === 'success' ? colors.success : colors.danger, fontFamily: fonts.bodyMedium }}>
                    {r.status === 'success' ? `${r.files} files` : 'Failed'}
                  </Text>
                </View>
              ))}
              <Text style={[type.bodyMuted, { marginTop: spacing.sm }]}>
                A full log is kept on-device at drive_upload_log.log for later review.
              </Text>
            </GlassCard>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    borderWidth: 1,
    borderColor: colors.cardGlassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.mist,
    fontFamily: fonts.body,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardGlassBorder,
  },
});

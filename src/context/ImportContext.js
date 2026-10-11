import React, { createContext, useContext, useMemo, useState } from 'react';
import { cleanupExtractedDir } from '../lib/zipImporter';

const ImportContext = createContext(null);

export function ImportProvider({ children }) {
  const [extractedDir, setExtractedDir] = useState(null); // on-disk folder from the last native unzip
  const [sourceName, setSourceName] = useState(null); // original file name, for display
  const [messages, setMessages] = useState([]); // parsed messages from the export
  const [participants, setParticipants] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [selectedSenders, setSelectedSenders] = useState([]);
  const [saveResults, setSaveResults] = useState([]); // output of saveExtractedPolicies
  const [selectedPolicyFolders, setSelectedPolicyFolders] = useState([]); // folder names ticked for Drive

  const reset = () => {
    if (extractedDir) cleanupExtractedDir(extractedDir);
    setExtractedDir(null);
    setSourceName(null);
    setMessages([]);
    setParticipants([]);
    setDateRange(null);
    setSelectedSenders([]);
    setSaveResults([]);
    setSelectedPolicyFolders([]);
  };

  const value = useMemo(
    () => ({
      extractedDir,
      setExtractedDir,
      sourceName,
      setSourceName,
      messages,
      setMessages,
      participants,
      setParticipants,
      dateRange,
      setDateRange,
      selectedSenders,
      setSelectedSenders,
      saveResults,
      setSaveResults,
      selectedPolicyFolders,
      setSelectedPolicyFolders,
      reset,
    }),
    [extractedDir, sourceName, messages, participants, dateRange, selectedSenders, saveResults, selectedPolicyFolders]
  );

  return <ImportContext.Provider value={value}>{children}</ImportContext.Provider>;
}

export function useImport() {
  const ctx = useContext(ImportContext);
  if (!ctx) throw new Error('useImport must be used within ImportProvider');
  return ctx;
}

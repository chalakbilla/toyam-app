import React, { createContext, useContext, useMemo, useState } from 'react';

const ImportContext = createContext(null);

export function ImportProvider({ children }) {
  const [zip, setZip] = useState(null); // JSZip instance
  const [sourceName, setSourceName] = useState(null); // original file name, for display
  const [messages, setMessages] = useState([]); // parsed messages from the export
  const [participants, setParticipants] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [selectedSenders, setSelectedSenders] = useState([]);
  const [saveResults, setSaveResults] = useState([]); // output of saveExtractedPolicies
  const [selectedPolicyFolders, setSelectedPolicyFolders] = useState([]); // folder names ticked for Drive

  const reset = () => {
    setZip(null);
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
      zip,
      setZip,
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
    [zip, sourceName, messages, participants, dateRange, selectedSenders, saveResults, selectedPolicyFolders]
  );

  return <ImportContext.Provider value={value}>{children}</ImportContext.Provider>;
}

export function useImport() {
  const ctx = useContext(ImportContext);
  if (!ctx) throw new Error('useImport must be used within ImportProvider');
  return ctx;
}

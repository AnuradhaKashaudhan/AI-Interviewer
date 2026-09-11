import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';

const ATSContext = createContext(null);

const getStorageKey = (userId) => `careerpilot_ats_state_${userId || 'guest'}`;

export const ATSProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || null;

  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [resumeMetadata, setResumeMetadata] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [phase, setPhase] = useState('idle'); // 'idle', 'parsing', 'results'
  const [results, setResults] = useState(null);
  const [mlResult, setMlResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Load persisted state whenever user changes or on initial mount
  useEffect(() => {
    const key = getStorageKey(userId);
    const guestKey = 'careerpilot_ats_state_guest';
    try {
      const saved = localStorage.getItem(key) || sessionStorage.getItem(key) ||
                    localStorage.getItem(guestKey) || sessionStorage.getItem(guestKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.resumeText) setResumeText(parsed.resumeText);
        if (parsed.resumeMetadata) setResumeMetadata(parsed.resumeMetadata);
        if (parsed.jobDescription !== undefined) setJobDescription(parsed.jobDescription);
        if (parsed.phase) setPhase(parsed.phase);
        if (parsed.results) setResults(parsed.results);
        if (parsed.mlResult) setMlResult(parsed.mlResult);

        if (userId && !localStorage.getItem(key)) {
          localStorage.setItem(key, saved);
          sessionStorage.setItem(key, saved);
        }
      }
    } catch (err) {
      console.error('Failed to load ATS state from storage:', err);
    }
  }, [userId]);

  // Persist state to storage when key data changes
  const saveStateToStorage = useCallback(
    (newState) => {
      const key = getStorageKey(userId);
      const guestKey = 'careerpilot_ats_state_guest';
      try {
        const payload = {
          resumeText: newState.resumeText !== undefined ? newState.resumeText : resumeText,
          resumeMetadata: newState.resumeMetadata !== undefined ? newState.resumeMetadata : resumeMetadata,
          jobDescription: newState.jobDescription !== undefined ? newState.jobDescription : jobDescription,
          phase: newState.phase !== undefined ? newState.phase : phase,
          results: newState.results !== undefined ? newState.results : results,
          mlResult: newState.mlResult !== undefined ? newState.mlResult : mlResult,
          updatedAt: new Date().toISOString(),
        };
        const jsonPayload = JSON.stringify(payload);
        localStorage.setItem(key, jsonPayload);
        sessionStorage.setItem(key, jsonPayload);
        localStorage.setItem(guestKey, jsonPayload);
        sessionStorage.setItem(guestKey, jsonPayload);
      } catch (err) {
        console.error('Failed to save ATS state to storage:', err);
      }
    },
    [userId, resumeText, resumeMetadata, jobDescription, phase, results, mlResult]
  );

  const setAtsUpload = useCallback(
    (file, text, metadata = {}) => {
      const fileMeta = {
        fileName: file?.name || metadata.fileName || 'Uploaded_Resume.pdf',
        fileSize: file?.size || metadata.fileSize || 0,
        fileType: file?.type || metadata.fileType || 'application/pdf',
        storagePath: metadata.storagePath || '',
      };

      setResumeFile(file || null);
      setResumeText(text || '');
      setResumeMetadata(fileMeta);
      setError(null);

      saveStateToStorage({
        resumeText: text || '',
        resumeMetadata: fileMeta,
      });
    },
    [saveStateToStorage]
  );

  const updateJobDescription = useCallback(
    (jd) => {
      setJobDescription(jd);
      saveStateToStorage({ jobDescription: jd });
    },
    [saveStateToStorage]
  );

  const setAtsResultsData = useCallback(
    (atsData, mlData, newPhase = 'parsing') => {
      setResults(atsData);
      setMlResult(mlData);
      setPhase(newPhase);

      saveStateToStorage({
        results: atsData,
        mlResult: mlData,
        phase: newPhase,
      });
    },
    [saveStateToStorage]
  );

  const updatePhase = useCallback(
    (newPhase) => {
      setPhase(newPhase);
      saveStateToStorage({ phase: newPhase });
    },
    [saveStateToStorage]
  );

  const updateFixItResults = useCallback(
    (updatedText, updatedScore, updatedSubScores, updatedIssues, updatedServerResults) => {
      setResumeText(updatedText);
      if (results) {
        const newResults = {
          ...results,
          ...(updatedServerResults || {}),
          score: updatedScore !== undefined ? updatedScore : results.score,
          sub_scores: updatedSubScores || results.sub_scores,
          issues: updatedIssues || results.issues,
        };
        setResults(newResults);
        saveStateToStorage({
          resumeText: updatedText,
          results: newResults,
        });
      } else {
        saveStateToStorage({ resumeText: updatedText });
      }
    },
    [results, saveStateToStorage]
  );

  const resetAtsAnalysis = useCallback(() => {
    setResults(null);
    setMlResult(null);
    setPhase('idle');
    setError(null);

    saveStateToStorage({
      results: null,
      mlResult: null,
      phase: 'idle',
    });
  }, [saveStateToStorage]);

  const clearAtsData = useCallback(() => {
    const key = getStorageKey(userId);
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      // Also clean up any legacy keys
      localStorage.removeItem('careerpilot_ats_state_guest');
      sessionStorage.removeItem('careerpilot_ats_state_guest');
    } catch (err) {
      console.error('Failed to clear ATS storage:', err);
    }
    setResumeFile(null);
    setResumeText('');
    setResumeMetadata(null);
    setJobDescription('');
    setPhase('idle');
    setResults(null);
    setMlResult(null);
    setIsAnalyzing(false);
    setError(null);
  }, [userId]);

  return (
    <ATSContext.Provider
      value={{
        resumeFile,
        resumeText,
        resumeMetadata,
        jobDescription,
        phase,
        results,
        mlResult,
        isAnalyzing,
        error,
        setAtsUpload,
        updateJobDescription,
        setAtsResultsData,
        updatePhase,
        updateFixItResults,
        resetAtsAnalysis,
        clearAtsData,
        setIsAnalyzing,
        setError,
      }}
    >
      {children}
    </ATSContext.Provider>
  );
};

export const useATS = () => {
  const context = useContext(ATSContext);
  if (!context) {
    throw new Error('useATS must be used within ATSProvider');
  }
  return context;
};

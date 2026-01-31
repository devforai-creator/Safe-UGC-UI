import { useState, useMemo } from 'react';
import { UGCRenderer } from '@safe-ugc-ui/react';
import { validate } from '@safe-ugc-ui/validator';
import { SAMPLES } from './sample-card';

const sampleNames = Object.keys(SAMPLES);

export function App() {
  const [selectedSample, setSelectedSample] = useState(sampleNames[0]);
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(SAMPLES[sampleNames[0]], null, 2),
  );

  const handleSampleChange = (name: string) => {
    setSelectedSample(name);
    setJsonText(JSON.stringify(SAMPLES[name], null, 2));
  };

  const { card, errors } = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonText);
      const result = validate(parsed);
      return {
        card: result.valid ? parsed : null,
        errors: result.errors,
      };
    } catch (e) {
      return {
        card: null,
        errors: [
          {
            code: 'JSON_PARSE_ERROR',
            message: e instanceof Error ? e.message : 'Invalid JSON',
            path: '',
          },
        ],
      };
    }
  }, [jsonText]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Safe UGC UI</span>
        <span style={styles.headerSub}>Demo Playground</span>
      </div>

      <div style={styles.body}>
        {/* Left: Editor */}
        <div style={styles.editorPane}>
          <div style={styles.paneHeader}>
            <span>Card JSON</span>
            <select
              value={selectedSample}
              onChange={(e) => handleSampleChange(e.target.value)}
              style={styles.sampleSelect}
            >
              {sampleNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <textarea
            style={styles.textarea}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
          {/* Errors */}
          {errors.length > 0 && (
            <div style={styles.errorBox}>
              <div style={styles.errorTitle}>
                {errors.length} error{errors.length > 1 ? 's' : ''}
              </div>
              {errors.slice(0, 10).map((err, i) => (
                <div key={i} style={styles.errorItem}>
                  <span style={styles.errorCode}>{err.code}</span>
                  <span style={styles.errorMsg}>{err.message}</span>
                  {err.path && (
                    <span style={styles.errorPath}>{err.path}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div style={styles.previewPane}>
          <div style={styles.paneHeader}>Preview</div>
          <div style={styles.previewArea}>
            {card ? (
              <UGCRenderer
                card={card}
                containerStyle={{ maxWidth: '100%' }}
              />
            ) : (
              <div style={styles.placeholder}>
                {errors.length > 0
                  ? 'Fix errors to see preview'
                  : 'Enter valid card JSON'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
  },
  header: {
    padding: '12px 20px',
    backgroundColor: '#16213e',
    borderBottom: '1px solid #0f3460',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#00f0ff',
  },
  headerSub: {
    fontSize: 13,
    color: '#666',
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  editorPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #0f3460',
  },
  previewPane: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  paneHeader: {
    padding: '8px 16px',
    fontSize: 12,
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    backgroundColor: '#16213e',
    borderBottom: '1px solid #0f3460',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sampleSelect: {
    backgroundColor: '#0f3460',
    color: '#ccc',
    border: '1px solid #1a4a7a',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 11,
    cursor: 'pointer',
    textTransform: 'none' as const,
    letterSpacing: 0,
    fontWeight: 400,
  },
  textarea: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0a0a12',
    color: '#d4d4d4',
    border: 'none',
    outline: 'none',
    resize: 'none',
    fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    fontSize: 13,
    lineHeight: 1.5,
    tabSize: 2,
  },
  errorBox: {
    maxHeight: 180,
    overflow: 'auto',
    padding: 12,
    backgroundColor: '#1a0a0a',
    borderTop: '1px solid #4a1010',
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#ff4444',
    marginBottom: 8,
  },
  errorItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '6px 0',
    borderBottom: '1px solid #2a1515',
    fontSize: 12,
  },
  errorCode: {
    color: '#ff6666',
    fontFamily: 'monospace',
    fontWeight: 600,
  },
  errorMsg: {
    color: '#cc8888',
  },
  errorPath: {
    color: '#886666',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  previewArea: {
    flex: 1,
    padding: 32,
    overflow: 'auto',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: '#111118',
  },
  placeholder: {
    color: '#444',
    fontSize: 14,
    fontStyle: 'italic',
  },
};

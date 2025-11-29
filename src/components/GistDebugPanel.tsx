import { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from 'react-feather';
import { gistDebugLogger, type DebugLogEntry } from '../lib/gistDebug';
import './GistDebugPanel.css';

interface GistDebugPanelProps {
  readonly onClose?: () => void;
}

export function GistDebugPanel({ onClose }: GistDebugPanelProps) {
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [isEnabled, setIsEnabled] = useState(gistDebugLogger.isEnabled());
  const [filter, setFilter] = useState<
    'all' | 'error' | 'warn' | 'success' | 'info'
  >('all');
  const previousLogsLengthRef = useRef(0);

  useEffect(() => {
    const updateLogs = () => {
      const currentLogs = gistDebugLogger.getLogs();
      // Only update state if logs actually changed
      if (currentLogs.length !== previousLogsLengthRef.current) {
        setLogs(currentLogs);
        previousLogsLengthRef.current = currentLogs.length;
      } else if (currentLogs.length > 0) {
        // Check if content changed (compare timestamps of last log)
        const lastLog = currentLogs.at(-1);
        if (lastLog) {
          setLogs(prevLogs => {
            const previousLastLog = prevLogs.at(-1);
            if (
              !previousLastLog ||
              lastLog.timestamp !== previousLastLog.timestamp
            ) {
              return currentLogs;
            }
            return prevLogs; // No change, return previous state
          });
        }
      }
    };

    // Update logs initially
    updateLogs();

    // Update logs less frequently (every 1 second instead of 500ms)
    const interval = setInterval(updateLogs, 1000);

    return () => clearInterval(interval);
  }, []); // Empty deps - only run on mount/unmount

  // Memoize filtered logs and counts to avoid recalculating on every render
  const filteredLogs = useMemo(() => {
    return filter === 'all' ? logs : logs.filter(log => log.level === filter);
  }, [logs, filter]);

  const { errorCount, warnCount, successCount, infoCount } = useMemo(() => {
    return {
      errorCount: logs.filter(log => log.level === 'error').length,
      warnCount: logs.filter(log => log.level === 'warn').length,
      successCount: logs.filter(log => log.level === 'success').length,
      infoCount: logs.filter(log => log.level === 'info').length,
    };
  }, [logs]);

  const handleToggleDebug = () => {
    if (isEnabled) {
      gistDebugLogger.disable();
    } else {
      gistDebugLogger.enable();
    }
    setIsEnabled(gistDebugLogger.isEnabled());
  };

  const handleClear = () => {
    gistDebugLogger.clear();
    setLogs([]);
  };

  const handleExport = () => {
    const summary = gistDebugLogger.getFlowSummary();
    const exportData = {
      timestamp: new Date().toISOString(),
      enabled: isEnabled,
      summary,
      logs: logs.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp).toISOString(),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gist-debug-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLevelIcon = (level: DebugLogEntry['level']) => {
    switch (level) {
      case 'error':
        return (
          <AlertCircle size={14} className="debug-icon debug-icon--error" />
        );
      case 'warn':
        return (
          <AlertTriangle size={14} className="debug-icon debug-icon--warn" />
        );
      case 'success':
        return (
          <CheckCircle size={14} className="debug-icon debug-icon--success" />
        );
      default:
        return <Info size={14} className="debug-icon debug-icon--info" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  return (
    <div className="gist-debug-panel">
      <div className="gist-debug-header">
        <div className="gist-debug-title">
          <h3>Gist Debug Panel</h3>
          <span className="gist-debug-badge">{logs.length} logs</span>
        </div>
        <div className="gist-debug-actions">
          <button
            onClick={handleToggleDebug}
            className={`gist-debug-toggle ${isEnabled ? 'gist-debug-toggle--enabled' : ''}`}
            title={isEnabled ? 'Désactiver le debug' : 'Activer le debug'}
          >
            {isEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={handleExport}
            className="gist-debug-button"
            title="Exporter les logs"
          >
            <Download size={16} />
          </button>
          <button
            onClick={handleClear}
            className="gist-debug-button"
            title="Effacer les logs"
          >
            <Trash2 size={16} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="gist-debug-button"
              title="Fermer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="gist-debug-stats">
        <button
          onClick={() => setFilter('all')}
          className={`gist-debug-filter ${filter === 'all' ? 'gist-debug-filter--active' : ''}`}
        >
          Tous ({logs.length})
        </button>
        <button
          onClick={() => setFilter('error')}
          className={`gist-debug-filter ${filter === 'error' ? 'gist-debug-filter--active' : ''}`}
        >
          Erreurs ({errorCount})
        </button>
        <button
          onClick={() => setFilter('warn')}
          className={`gist-debug-filter ${filter === 'warn' ? 'gist-debug-filter--active' : ''}`}
        >
          Avertissements ({warnCount})
        </button>
        <button
          onClick={() => setFilter('success')}
          className={`gist-debug-filter ${filter === 'success' ? 'gist-debug-filter--active' : ''}`}
        >
          Succès ({successCount})
        </button>
        <button
          onClick={() => setFilter('info')}
          className={`gist-debug-filter ${filter === 'info' ? 'gist-debug-filter--active' : ''}`}
        >
          Info ({infoCount})
        </button>
      </div>

      <div className="gist-debug-content">
        {filteredLogs.length > 0 ? (
          <div className="gist-debug-logs">
            {filteredLogs.map((log, index) => (
              <div
                key={`${log.timestamp}-${log.step}-${log.level}-${index}`}
                className={`gist-debug-log gist-debug-log--${log.level}`}
              >
                <div className="gist-debug-log-header">
                  <div className="gist-debug-log-meta">
                    {getLevelIcon(log.level)}
                    <span className="gist-debug-log-step">{log.step}</span>
                    <span className="gist-debug-log-time">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                </div>
                <div className="gist-debug-log-message">{log.message}</div>
                {log.error && (
                  <div className="gist-debug-log-error">
                    <strong>Erreur:</strong> {log.error}
                  </div>
                )}
                {log.data && Object.keys(log.data).length > 0 && (
                  <details className="gist-debug-log-data">
                    <summary>
                      Données ({Object.keys(log.data).length} champs)
                    </summary>
                    <pre>{JSON.stringify(log.data, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="gist-debug-empty">
            Aucun log {filter === 'all' ? '' : `de type "${filter}"`} disponible
          </div>
        )}
      </div>
    </div>
  );
}

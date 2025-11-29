import { loadUserProgress } from './cookies';
import { loadAllDeckFieldMappings } from './deckFieldMapping';

export function buildExportPayload(
  progressData = loadUserProgress(),
  mappingsData = loadAllDeckFieldMappings()
) {
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    progress: progressData,
    mappings: mappingsData,
  };
}

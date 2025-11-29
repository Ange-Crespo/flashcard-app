/**
 * Tests for GitHub Gist service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { githubGistService } from '../githubGist';

describe('GitHubGistService', () => {
  beforeEach(() => {
    githubGistService.setGistId('');
  });

  describe('setGistId', () => {
    it('should set the gist ID', () => {
      const gistId = 'test-gist-id';
      githubGistService.setGistId(gistId);
      expect(githubGistService.getGistId()).toBe(gistId);
    });
  });
});

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';

// jsdom doesn't implement matchMedia
window.matchMedia = window.matchMedia || ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as any;

describe('InstallManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('should track games played', async () => {
    const { InstallManager } = await import('../systems/InstallManager');
    InstallManager.incrementGamesPlayed();
    expect(localStorage.getItem('turbohop_games_played')).toBe('1');
    InstallManager.incrementGamesPlayed();
    expect(localStorage.getItem('turbohop_games_played')).toBe('2');
  });

  it('should not show banner when no deferred prompt', async () => {
    const { InstallManager } = await import('../systems/InstallManager');
    localStorage.setItem('turbohop_games_played', '5');
    // canInstall is false (no beforeinstallprompt fired)
    expect(InstallManager.shouldShowBanner()).toBe(false);
  });

  it('should not show banner with fewer than 2 games played', async () => {
    const { InstallManager } = await import('../systems/InstallManager');
    localStorage.setItem('turbohop_games_played', '1');
    expect(InstallManager.shouldShowBanner()).toBe(false);
  });

  it('should track dismissal timestamp', async () => {
    const { InstallManager } = await import('../systems/InstallManager');
    const before = Date.now();
    InstallManager.dismiss();
    const dismissedAt = parseInt(localStorage.getItem('turbohop_install_dismissed_at') || '0', 10);
    expect(dismissedAt).toBeGreaterThanOrEqual(before);
    expect(dismissedAt).toBeLessThanOrEqual(Date.now());
  });

  it('should detect non-standalone mode', async () => {
    const { InstallManager } = await import('../systems/InstallManager');
    expect(InstallManager.isInstalled).toBe(false);
  });

  it('should return false from canInstall when no prompt captured', async () => {
    const { InstallManager } = await import('../systems/InstallManager');
    expect(InstallManager.canInstall).toBe(false);
  });

  it('should return false from promptInstall when no prompt available', async () => {
    const { InstallManager } = await import('../systems/InstallManager');
    const result = await InstallManager.promptInstall();
    expect(result).toBe(false);
  });

  it('should increment from 0 when no previous games', async () => {
    const { InstallManager } = await import('../systems/InstallManager');
    expect(localStorage.getItem('turbohop_games_played')).toBeNull();
    InstallManager.incrementGamesPlayed();
    expect(localStorage.getItem('turbohop_games_played')).toBe('1');
  });
});

// Need vi for resetModules
import { vi } from 'vitest';

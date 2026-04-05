const DISMISS_KEY = 'turbohop_install_dismissed_at';
const GAMES_KEY = 'turbohop_games_played';
const DISMISS_DAYS = 3;
const MIN_GAMES = 2;

class InstallManagerClass {
  private deferredPrompt: any = null;

  constructor() {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
    });
  }

  get isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;
  }

  get canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  shouldShowBanner(): boolean {
    if (this.isInstalled) return false;
    if (!this.canInstall) return false;

    // Check games played
    const gamesPlayed = parseInt(localStorage.getItem(GAMES_KEY) || '0', 10);
    if (gamesPlayed < MIN_GAMES) return false;

    // Check dismissal cooldown
    const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    if (dismissedAt > 0) {
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSince < DISMISS_DAYS) return false;
    }

    return true;
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;
    this.deferredPrompt.prompt();
    const result = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    return result.outcome === 'accepted';
  }

  dismiss(): void {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  incrementGamesPlayed(): void {
    const count = parseInt(localStorage.getItem(GAMES_KEY) || '0', 10);
    localStorage.setItem(GAMES_KEY, String(count + 1));
  }
}

export const InstallManager = new InstallManagerClass();

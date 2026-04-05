const KEYS = {
  REDUCED_MOTION: 'turbohop_reduced_motion',
  COLORBLIND: 'turbohop_colorblind',
  SHOW_FPS: 'turbohop_show_fps',
};

class SettingsSystemClass {
  get reducedMotion(): boolean {
    return localStorage.getItem(KEYS.REDUCED_MOTION) === '1';
  }

  set reducedMotion(val: boolean) {
    localStorage.setItem(KEYS.REDUCED_MOTION, val ? '1' : '0');
  }

  get colorblindMode(): boolean {
    return localStorage.getItem(KEYS.COLORBLIND) === '1';
  }

  set colorblindMode(val: boolean) {
    localStorage.setItem(KEYS.COLORBLIND, val ? '1' : '0');
  }

  get showFps(): boolean {
    return localStorage.getItem(KEYS.SHOW_FPS) === '1';
  }

  set showFps(val: boolean) {
    localStorage.setItem(KEYS.SHOW_FPS, val ? '1' : '0');
  }
}

export const SettingsSystem = new SettingsSystemClass();

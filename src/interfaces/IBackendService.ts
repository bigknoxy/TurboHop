export interface IUser {
  uid: string;
  anonymous: boolean;
  createdAt: Date;
}

export interface IScoreSubmission {
  score: number;
  coins: number;
  stomps: number;
  seed: number;
  replayInput: string;
  timestamp: number;
  dailyChallenge?: boolean;
  challengeId?: string;
}

export interface ILiveGhostData {
  userId: string;
  seed: number;
  inputs: Array<{
    t: number;
    action: 'jump' | 'hold' | 'release';
  }>;
}

export interface IDailyChallenge {
  id: string;
  seed: number;
  date: string;
  active: boolean;
}

export interface ILeaderboardEntry {
  userId: string;
  score: number;
  coins: number;
  stomps: number;
  timestamp: number;
  rank?: number;
}

export interface IAnalyticsEvent {
  name: string;
  params: Record<string, unknown>;
  timestamp: number;
}

export interface IRemoteConfigValue {
  value: unknown;
  source: 'default' | 'remote';
  fetchedAt?: number;
}

export interface IBackendService {
  init(): Promise<void>;
  isReady(): boolean;
  isHealthy(): boolean;
  destroy(): void;

  getUser(): Promise<IUser | null>;
  signInAnonymously(): Promise<IUser>;

  submitScore(submission: IScoreSubmission): Promise<void>;
  getLeaderboard(challengeId?: string, limit?: number): Promise<ILeaderboardEntry[]>;
  getPersonalBest(challengeId?: string): Promise<ILeaderboardEntry | null>;

  getDailyChallenge(): Promise<IDailyChallenge | null>;
  getLiveGhost(userId: string, seed: number): Promise<ILiveGhostData | null>;
  saveLiveGhost(ghost: ILiveGhostData): Promise<void>;

  logEvent(event: IAnalyticsEvent): Promise<void>;
  logEvents(events: IAnalyticsEvent[]): Promise<void>;

  getRemoteConfig(key: string, defaultValue: unknown): Promise<IRemoteConfigValue>;
  fetchRemoteConfig(): Promise<void>;
}

export interface IBackendServiceClass {
  new (): IBackendService;
}

import {
  initializeApp,
  FirebaseApp,
  FirebaseError,
  getApp,
  getApps,
} from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getRemoteConfig,
  type RemoteConfig,
  fetchAndActivate,
  getValue as rcGetValue,
} from 'firebase/remote-config';
import {
  IBackendService,
  IUser,
  IScoreSubmission,
  ILiveGhostData,
  IDailyChallenge,
  ILeaderboardEntry,
  IAnalyticsEvent,
  IRemoteConfigValue,
} from '../interfaces/IBackendService';

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const HEALTH_CHECK_INTERVAL = 60000;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_TIME = 30000;

export class FirebaseService implements IBackendService {
  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;
  private auth: Auth | null = null;
  private remoteConfig: RemoteConfig | null = null;
  private currentUser: IUser | null = null;
  private healthy = false;
  private ready = false;
  private failureCount = 0;
  private circuitBreakerOpen = false;
  private circuitBreakerResetTime: number | null = null;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        if (!FIREBASE_CONFIG.apiKey) {
          console.warn('[Firebase] No API key found, running in offline mode');
          this.ready = true;
          this.healthy = false;
          return;
        }

        const apps = getApps();
        this.app = apps.length > 0 ? apps[0] : initializeApp(FIREBASE_CONFIG);
        this.db = getFirestore(this.app);
        this.auth = getAuth(this.app);
        this.remoteConfig = getRemoteConfig(this.app);

        this.remoteConfig.settings = {
          minimumFetchIntervalMillis: 3600000,
          fetchTimeoutMillis: 30000,
        };

        await this.setupAuthListener();
        this.startHealthCheck();
        this.ready = true;
        this.healthy = true;
      } catch (error) {
        console.error('[Firebase] Initialization failed:', error);
        this.ready = true;
        this.healthy = false;
      }
    })();

    return this.initPromise;
  }

  private async setupAuthListener(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.auth) {
        resolve();
        return;
      }

      const unsubscribe = onAuthStateChanged(this.auth, (user: User | null) => {
        if (user) {
          this.currentUser = {
            uid: user.uid,
            anonymous: user.isAnonymous,
            createdAt: user.metadata.creationTime
              ? new Date(user.metadata.creationTime)
              : new Date(),
          };
        } else {
          this.currentUser = null;
        }
        resolve();
        unsubscribe();
      });
    });
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) return;
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, HEALTH_CHECK_INTERVAL);
  }

  private async checkHealth(): Promise<void> {
    if (this.circuitBreakerOpen) {
      if (this.circuitBreakerResetTime && Date.now() > this.circuitBreakerResetTime) {
        this.circuitBreakerOpen = false;
        this.circuitBreakerResetTime = null;
        this.failureCount = 0;
      }
      return;
    }

    try {
      if (this.db) {
        await getDoc(doc(this.db, '_health', 'check'));
        this.healthy = true;
        this.failureCount = 0;
      }
    } catch {
      this.failureCount++;
      if (this.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
        this.circuitBreakerOpen = true;
        this.circuitBreakerResetTime = Date.now() + CIRCUIT_BREAKER_RESET_TIME;
        this.healthy = false;
      }
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  isHealthy(): boolean {
    return this.healthy && !this.circuitBreakerOpen;
  }

  async getUser(): Promise<IUser | null> {
    return this.currentUser;
  }

  async signInAnonymously(): Promise<IUser> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      const result = await signInAnonymously(this.auth);
      if (!result.user) {
        throw new Error('Sign in failed');
      }

      return {
        uid: result.user.uid,
        anonymous: result.user.isAnonymous,
        createdAt: new Date(),
      };
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async submitScore(submission: IScoreSubmission): Promise<void> {
    if (!this.db || !this.currentUser) {
      throw new Error('Firebase not ready or user not authenticated');
    }

    try {
      const scoreRef = doc(
        collection(this.db, 'users', this.currentUser.uid, 'scores'),
      );
      await setDoc(scoreRef, {
        score: submission.score,
        coins: submission.coins,
        stomps: submission.stomps,
        seed: submission.seed,
        replayInput: submission.replayInput,
        timestamp: serverTimestamp(),
        dailyChallenge: submission.dailyChallenge || false,
        challengeId: submission.challengeId || null,
      });

      if (submission.dailyChallenge && submission.challengeId) {
        const challengeRef = doc(
          this.db,
          'daily_challenges',
          submission.challengeId,
          'submissions',
          this.currentUser.uid,
        );
        await setDoc(challengeRef, {
          score: submission.score,
          coins: submission.coins,
          stomps: submission.stomps,
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async getLeaderboard(
    challengeId?: string,
    limitCount = 100,
  ): Promise<ILeaderboardEntry[]> {
    if (!this.db) {
      throw new Error('Firebase not ready');
    }

    try {
      if (challengeId) {
        const q = query(
          collection(this.db, 'daily_challenges', challengeId, 'submissions'),
          orderBy('score', 'desc'),
          limit(limitCount),
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((docSnapshot, index) => ({
          userId: docSnapshot.id,
          ...docSnapshot.data(),
          rank: index + 1,
        })) as ILeaderboardEntry[];
      } else {
        const q = query(
          collection(this.db, 'scores'),
          orderBy('score', 'desc'),
          limit(limitCount),
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((docSnapshot, index) => ({
          userId: docSnapshot.id,
          ...docSnapshot.data(),
          rank: index + 1,
        })) as ILeaderboardEntry[];
      }
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async getPersonalBest(challengeId?: string): Promise<ILeaderboardEntry | null> {
    if (!this.db || !this.currentUser) {
      return null;
    }

    try {
      if (challengeId) {
        const docRef = doc(
          this.db,
          'daily_challenges',
          challengeId,
          'submissions',
          this.currentUser.uid,
        );
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return {
            userId: this.currentUser.uid,
            ...docSnap.data(),
          } as ILeaderboardEntry;
        }
      } else {
        const q = query(
          collection(this.db, 'users', this.currentUser.uid, 'scores'),
          orderBy('score', 'desc'),
          limit(1),
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return {
            userId: this.currentUser.uid,
            ...doc.data(),
          } as ILeaderboardEntry;
        }
      }
      return null;
    } catch (error) {
      this.recordFailure();
      return null;
    }
  }

  async getDailyChallenge(): Promise<IDailyChallenge | null> {
    if (!this.db) {
      throw new Error('Firebase not ready');
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(this.db, 'daily_challenges'),
        where('date', '==', today),
        where('active', '==', true),
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as IDailyChallenge;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async getLiveGhost(
    userId: string,
    seed: number,
  ): Promise<ILiveGhostData | null> {
    if (!this.db) {
      throw new Error('Firebase not ready');
    }

    try {
      const docRef = doc(
        this.db,
        'users',
        userId,
        'ghosts',
        `seed_${seed}`,
      );
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        userId,
        seed,
        inputs: data.inputs || [],
      } as ILiveGhostData;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async saveLiveGhost(ghost: ILiveGhostData): Promise<void> {
    if (!this.db || !this.currentUser) {
      throw new Error('Firebase not ready or user not authenticated');
    }

    try {
      const ghostRef = doc(
        this.db,
        'users',
        this.currentUser.uid,
        'ghosts',
        `seed_${ghost.seed}`,
      );
      await setDoc(ghostRef, {
        userId: ghost.userId,
        seed: ghost.seed,
        inputs: ghost.inputs,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async logEvent(event: IAnalyticsEvent): Promise<void> {
    await this.logEvents([event]);
  }

  async logEvents(events: IAnalyticsEvent[]): Promise<void> {
    if (!this.db || !this.currentUser || events.length === 0) {
      return;
    }

    try {
      const batchPromises = events.map((event) => {
        const eventRef = doc(collection(this.db!, 'analytics_events'));
        return setDoc(eventRef, {
          userId: this.currentUser!.uid,
          name: event.name,
          params: event.params,
          timestamp: Timestamp.fromMillis(event.timestamp),
          createdAt: serverTimestamp(),
        });
      });

      await Promise.all(batchPromises);
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  async getRemoteConfig(key: string, defaultValue: unknown): Promise<IRemoteConfigValue> {
    if (!this.remoteConfig) {
      return {
        value: defaultValue,
        source: 'default',
      };
    }

    try {
      const firebaseValue = rcGetValue(this.remoteConfig, key);
      return {
        value: firebaseValue.asString() || defaultValue,
        source: firebaseValue.getSource() === 'default' ? 'default' : 'remote',
      };
    } catch {
      return {
        value: defaultValue,
        source: 'default',
      };
    }
  }

  async fetchRemoteConfig(): Promise<void> {
    if (!this.remoteConfig) {
      return;
    }

    try {
      await fetchAndActivate(this.remoteConfig);
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreakerOpen = true;
      this.circuitBreakerResetTime = Date.now() + CIRCUIT_BREAKER_RESET_TIME;
      this.healthy = false;
    }
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.app = null;
    this.db = null;
    this.auth = null;
    this.remoteConfig = null;
    this.currentUser = null;
    this.ready = false;
    this.healthy = false;
  }
}

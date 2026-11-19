import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { callApi, CloudError } from '../services/cloud';

export interface Level {
  id: string;
  name: string;
  location: string;
  description: string;
  unlocked: boolean;
  completed: boolean;
  currentAct: number;
  totalActs: number;
  icon: string;
  color: string;
}

interface ServerLevel {
  id: string;
  name: string;
  completed: boolean;
  currentAct: number;
  totalActs: number;
}

interface Stats {
  completedCount: number;
  totalLevels: number;
  score: number;
}

interface LoginResult {
  openid: string;
  nickname: string;
  avatar: string;
  levels: ServerLevel[];
  stats: Stats;
  isNew: boolean;
}

interface ProgressResult {
  levels: ServerLevel[];
  stats: Stats;
}

interface GameState {
  levels: Level[];
  currentLevelId: string | null;
  currentAct: number;
  openid: string | null;
  nickname: string;
  avatar: string;
  syncEnabled: boolean;
  syncing: boolean;
  setCurrentLevel: (levelId: string) => void;
  setCurrentAct: (act: number) => void;
  completeLevel: (levelId: string) => void;
  progressAct: (levelId: string) => void;
  resetProgress: () => void;
  syncToServer: () => Promise<void>;
  loginFromServer: (nickname?: string, avatar?: string) => Promise<boolean>;
  refreshFromServer: () => Promise<void>;
  submitFeedback: (content: string, contact?: string) => Promise<boolean>;
}

const DEFAULT_LEVELS: Level[] = [
  { id: 'library',   name: '图书馆',   location: '校园中心', description: '魔法图书馆之旅，寻找失落的知识之火',           unlocked: true, completed: false, currentAct: 1, totalActs: 4, icon: '📚', color: '#8B5CF6' },
  { id: 'gym',       name: '体育馆',   location: '校园东区', description: '探索体育馆的秘密，完成体能挑战',             unlocked: true, completed: false, currentAct: 1, totalActs: 4, icon: '🏟️', color: '#6366F1' },
  { id: 'canteen',   name: '食堂',     location: '校园南区', description: '美食大冒险，寻找隐藏的美味',                 unlocked: true, completed: false, currentAct: 1, totalActs: 3, icon: '🍽️', color: '#F59E0B' },
  { id: 'teaching',  name: '食品学院', location: '校园北区', description: '暗穗危机的召唤，守护稻田生机与食品安全',     unlocked: true, completed: false, currentAct: 1, totalActs: 4, icon: '🌾', color: '#F59E0B' },
  { id: 'dormitory', name: '宿舍区',   location: '校园西区', description: '温馨的家园，结交新朋友',                     unlocked: true, completed: false, currentAct: 1, totalActs: 3, icon: '🏠', color: '#EC4899' }
];

const STORAGE_KEY = 'campus-explorer-game';

interface LocalSnapshot {
  levels: Level[];
  openid: string | null;
  nickname: string;
  avatar: string;
}

const loadFromLocal = (): LocalSnapshot => {
  try {
    const stored = Taro.getStorageSync(STORAGE_KEY);
    if (stored) {
      const data = typeof stored === 'string' ? JSON.parse(stored) : stored;
      return {
        levels: data.levels || DEFAULT_LEVELS,
        openid: data.openid || null,
        nickname: data.nickname || '',
        avatar: data.avatar || ''
      };
    }
  } catch (e) {
    console.warn('[Store] 本地缓存读取失败：', e);
  }
  return { levels: DEFAULT_LEVELS, openid: null, nickname: '', avatar: '' };
};

const saveToLocal = (snapshot: LocalSnapshot) => {
  try {
    Taro.setStorageSync(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('[Store] 本地缓存写入失败：', e);
  }
};

/** 把服务端进度合并进本地关卡（保留图标、颜色、描述等展示字段） */
const mergeLevels = (serverLevels: ServerLevel[]): Level[] =>
  DEFAULT_LEVELS.map((def) => {
    const server = (serverLevels || []).find((l) => l.id === def.id);
    if (!server) return def;
    return {
      ...def,
      completed: !!server.completed,
      currentAct: server.currentAct || 1,
      totalActs: server.totalActs || def.totalActs
    };
  });

const initialData = loadFromLocal();

export const useGameStore = create<GameState>()((set, get) => ({
  levels: initialData.levels,
  currentLevelId: null,
  currentAct: 1,
  openid: initialData.openid,
  nickname: initialData.nickname,
  avatar: initialData.avatar,
  syncEnabled: !!initialData.openid,
  syncing: false,

  /**
   * 云函数登录（openid 由云函数从微信上下文获取，前端不参与）
   * 返回 false 表示失败或账号被封禁，此时自动降级为本地单机模式
   */
  loginFromServer: async (nickname?: string, avatar?: string) => {
    try {
      const data = await callApi<LoginResult>('login', { nickname, avatar });
      const levels = mergeLevels(data.levels);
      const snapshot: LocalSnapshot = {
        levels,
        openid: data.openid,
        nickname: data.nickname || nickname || '探索者',
        avatar: data.avatar || avatar || ''
      };
      saveToLocal(snapshot);
      set({
        levels,
        openid: snapshot.openid,
        nickname: snapshot.nickname,
        avatar: snapshot.avatar,
        syncEnabled: true
      });
      console.log('[Store] 云登录成功，openid：', data.openid, data.isNew ? '（新用户）' : '');
      return true;
    } catch (e) {
      if (e instanceof CloudError && e.code === 403) {
        const reason = (e.data && e.data.ban_reason) || '';
        Taro.showModal({
          title: '登录失败',
          content: reason ? `账号已被封禁：${reason}` : '账号已被封禁，请联系管理员',
          showCancel: false
        });
        set({ syncEnabled: false });
        return false;
      }
      console.warn('[Store] 云登录失败，进入本地模式：', e);
      set({ syncEnabled: false });
      return false;
    }
  },

  /** 拉取云端最新进度（用于下拉刷新 / 重新进入小程序时对齐多端进度） */
  refreshFromServer: async () => {
    if (!get().openid) return;
    try {
      const data = await callApi<LoginResult>('getUserInfo', {});
      const levels = mergeLevels(data.levels);
      saveToLocal({
        levels,
        openid: data.openid,
        nickname: data.nickname || get().nickname,
        avatar: data.avatar || get().avatar
      });
      set({
        levels,
        nickname: data.nickname || get().nickname,
        avatar: data.avatar || get().avatar
      });
    } catch (e) {
      console.warn('[Store] 同步云端进度失败：', e);
    }
  },

  setCurrentLevel: (levelId) => {
    set({ currentLevelId: levelId });
    const level = get().levels.find((l) => l.id === levelId);
    if (level) {
      set({ currentAct: level.currentAct });
    }
  },

  setCurrentAct: (act) => {
    const { currentLevelId, levels } = get();
    if (!currentLevelId) {
      set({ currentAct: act });
      return;
    }

    const nextLevels = levels.map((l) =>
      l.id === currentLevelId
        ? { ...l, currentAct: Math.min(Math.max(act, 1), l.totalActs) }
        : l
    );
    const level = nextLevels.find((l) => l.id === currentLevelId)!;

    saveToLocal({ levels: nextLevels, openid: get().openid, nickname: get().nickname, avatar: get().avatar });
    set({ levels: nextLevels, currentAct: level.currentAct });

    void saveProgressToCloud(level);
  },

  completeLevel: (levelId) => {
    const { levels } = get();
    const nextLevels = levels.map((l) =>
      l.id === levelId ? { ...l, completed: true, currentAct: l.totalActs } : l
    );
    const level = nextLevels.find((l) => l.id === levelId);

    saveToLocal({ levels: nextLevels, openid: get().openid, nickname: get().nickname, avatar: get().avatar });
    set({ levels: nextLevels });

    if (level) void saveProgressToCloud(level);
  },

  progressAct: (levelId) => {
    const { levels } = get();
    const level = levels.find((l) => l.id === levelId);
    if (!level) return;

    const newAct = level.currentAct + 1;

    if (newAct > level.totalActs) {
      get().completeLevel(levelId);
      return;
    }

    const nextLevels = levels.map((l) => (l.id === levelId ? { ...l, currentAct: newAct } : l));
    saveToLocal({ levels: nextLevels, openid: get().openid, nickname: get().nickname, avatar: get().avatar });
    set({ levels: nextLevels, currentAct: newAct });

    const updated = nextLevels.find((l) => l.id === levelId);
    if (updated) void saveProgressToCloud(updated);
  },

  /** 把当前全部进度一次性同步到云端 */
  syncToServer: async () => {
    if (!get().openid) return;
    set({ syncing: true });
    try {
      const data = await callApi<ProgressResult>('saveAllProgress', {
        levels: get().levels.map((l) => ({
          levelId: l.id,
          completed: l.completed,
          currentAct: l.currentAct,
          totalActs: l.totalActs
        }))
      });
      const levels = mergeLevels(data.levels);
      saveToLocal({ levels, openid: get().openid, nickname: get().nickname, avatar: get().avatar });
      set({ levels });
      console.log('[Store] 进度已同步到云端');
    } catch (e) {
      console.warn('[Store] 进度同步失败：', e);
    } finally {
      set({ syncing: false });
    }
  },

  /** 重置进度：先清云端再清本地，避免下次登录又被云端旧数据覆盖 */
  resetProgress: () => {
    saveToLocal({ levels: DEFAULT_LEVELS, openid: get().openid, nickname: get().nickname, avatar: get().avatar });
    set({ levels: DEFAULT_LEVELS, currentLevelId: null, currentAct: 1 });

    if (get().openid) {
      callApi('resetProgress', {})
        .then(() => console.log('[Store] 云端进度已重置'))
        .catch((e) => console.warn('[Store] 云端进度重置失败：', e));
    }
  },

  /** 意见反馈，返回是否提交成功 */
  submitFeedback: async (content: string, contact?: string) => {
    try {
      await callApi('submitFeedback', { content, contact });
      return true;
    } catch (e) {
      console.warn('[Store] 反馈提交失败：', e);
      return false;
    }
  }
}));

/** 保存单个关卡进度到云端（失败只告警，不阻塞交互，本地缓存仍然有效） */
async function saveProgressToCloud(level: Level) {
  if (!useGameStore.getState().openid) return;
  try {
    const data = await callApi<ProgressResult>('saveProgress', {
      levelId: level.id,
      levelName: level.name,
      completed: level.completed,
      currentAct: level.currentAct,
      totalActs: level.totalActs
    });
    // 云端会做一次「进度只进不退」的校正，用返回值回滚本地状态
    const merged = mergeLevels(data.levels);
    saveToLocal({
      levels: merged,
      openid: useGameStore.getState().openid,
      nickname: useGameStore.getState().nickname,
      avatar: useGameStore.getState().avatar
    });
    useGameStore.setState({ levels: merged });
  } catch (e) {
    console.warn('[Store] 进度上云失败：', e);
  }
}

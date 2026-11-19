import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGameStore } from '@/stores/gameStore';
import styles from './index.module.scss';

// ==================== 类型定义 ====================

interface ScriptOption {
  letter: string;
  text: string;
}

interface ScriptStep {
  isChapter?: boolean;
  chapter?: string;
  rollIn?: boolean;
  sceneSrc?: string;
  speaker?: string;
  dialog?: string;
  overlay?: boolean;
  overlayIcon?: string;
  overlayIconLarge?: boolean;
  qaMode?: boolean;
  question?: string;
  options?: ScriptOption[];
  answer?: string;
  explain?: string;
  hint?: string;
  quiz?: boolean;
  sortGame?: boolean;
  isEnding?: boolean;
}

interface OptionState {
  letter: string;
  text: string;
  state: string;
}

interface SortSlot {
  slot: number;
  id: number;
  label: string;
  icon: string;
  name: string;
  left: number;
  top: number;
  width: number;
}

interface SortArrow {
  left: number;
  top: number;
  width: number;
}

// ==================== 剧情脚本 ====================

const FULL_INTRO = '欢迎来到食品科学与工程学院，请继续你的探索之旅吧！';
const FULL_ENDING = '恭喜你顺利通关食品科学与工程学院故事剧情，请继续前往化工与材料学院，解锁更多剧情并收获更多知识吧！';

// 剧情脚本：step 依次推进。
// isChapter 为 true 时切换到章节标题画面；overlay 为 true 时铺半透明橙黄遮罩 + 中央图标；
// qaMode 为 true 时进入问答环节（用相框淡黄色背景，不显示剧情画面）。
const SCRIPT: ScriptStep[] = [
  { isChapter: true, chapter: '第一幕：实验楼的异样——霉菌毒素的侵袭' },

  {
    sceneSrc: '/assets/food_scene1.jpg',
    speaker: '旁白',
    dialog: '“你”携带生物学院赠予的“晶核”踏入食品科学与工程学院实验楼，远远便闻到本该清甜的米香里混着一股刺鼻霉味，走廊尽头的实验室门半掩着。'
  },
  {
    sceneSrc: '/assets/food_scene2.jpg',
    speaker: '旁白',
    dialog: '进入实验室后，一道暖黄色的身影慌张钻出。'
  },
  {
    sceneSrc: '/assets/food_scene2.jpg',
    speaker: '稻米小精灵',
    dialog: '勇敢的探索者！请帮帮我！一股霉菌钻进了米酒酿造实验的培养箱和发酵液，让米香变成了霉味，还生出了看不见的毒素！'
  },
  {
    sceneSrc: '/assets/food_scene2.jpg',
    speaker: '你',
    dialog: '别慌，我会找出霉菌和毒素产生的原因，尽力帮助你的。'
  },
  {
    sceneSrc: '/assets/food_scene2.jpg',
    speaker: '旁白',
    dialog: '话音未落，玩家手中的晶核突然亮起柔和白光，光束精准指向实验台上的一本《发酵实验记录手册》。',
    overlay: true,
    overlayIcon: '/assets/food_book.png'
  },
  {
    sceneSrc: '/assets/food_scene2.jpg',
    speaker: '你',
    dialog: '这手册肯定是破局关键！先带它去食品安全检测实验室，查清到底出了什么问题！'
  },
  {
    // 问答环节：答对后画面中央浮现解析文字
    qaMode: true,
    question: '稻谷、粮食储存时，最常见的“看不见的毒素”通常由哪类微生物产生？',
    options: [
      { letter: 'A', text: '乳酸菌' },
      { letter: 'B', text: '黄曲霉（霉菌）' },
      { letter: 'C', text: '酵母菌' },
      { letter: 'D', text: '醋酸菌' }
    ],
    answer: 'B',
    explain: '黄曲霉产生的黄曲霉毒素是粮食中最需警惕的强致癌毒素。'
  },

  { isChapter: true, chapter: '第二幕：检测溯源 —— 快速检测破解霉菌毒素' },

  {
    sceneSrc: '/assets/food_scene3.jpg',
    speaker: '旁白',
    dialog: '你带着手册和采集的样品（发霉的大米样品、浑浊的米酒发酵液、培养箱霉菌刮取物）走进食品安全检测实验室。台面上摆着免疫层析试纸条、取样勺、滴管、试剂，还有一小排标注着“黄曲霉毒素 B1”的快速检测卡。'
  },
  {
    sceneSrc: '/assets/food_scene3.jpg',
    speaker: '稻米小精灵',
    dialog: '这些小纸条和检测卡真的能找出看不见的毒素吗？我总觉得身上的“米香灵气”在慢慢流失……'
  },
  {
    sceneSrc: '/assets/food_scene3.jpg',
    speaker: '你',
    dialog: '当然能！这是食品安全快速检测——用免疫层析试纸条几分钟就能判断有没有黄曲霉毒素，比肉眼可靠多了。'
  },
  {
    // 闯关问答1：答对进入下一问，答错亮出答案后重试，无解读框
    quiz: true,
    qaMode: true,
    question: '本次实验中最该检测的风险因子是？',
    options: [
      { letter: 'A', text: '黄曲霉毒素' },
      { letter: 'B', text: '乳酸菌' },
      { letter: 'C', text: '酵母菌' }
    ],
    answer: 'A'
  },
  {
    // 闯关问答2
    quiz: true,
    qaMode: true,
    question: '最合适的快速检测方法是？',
    options: [
      { letter: 'A', text: '免疫层析试纸条' },
      { letter: 'B', text: '显微镜' },
      { letter: 'C', text: '用鼻子闻' }
    ],
    answer: 'A'
  },
  {
    sceneSrc: '/assets/food_scene3.jpg',
    speaker: '旁白',
    dialog: '试纸条的检测线（T 线）不显色、只有对照线（C 线）显色，判为阳性，检测出黄曲霉毒素 B1 超标。',
    overlay: true,
    overlayIcon: '/assets/food_p8.png'
  },
  {
    sceneSrc: '/assets/food_scene3.jpg',
    speaker: '你',
    dialog: '翻开发酵实验记录手册，手册上写着：“黄曲霉毒素喜高温高湿，常见于受潮发霉的稻谷、玉米、花生；需低温干燥储存，污染样品绝不可用，可用有益微生物竞争性抑制霉菌。”',
    overlay: true,
    overlayIcon: '/assets/food_p9.png',
    overlayIconLarge: true
  },
  {
    sceneSrc: '/assets/food_scene3.jpg',
    speaker: '你',
    dialog: '“我明白了，是黄曲霉毒素和杂菌污染让发酵失败的。手册上给了解决方法：重新规范发酵，再用益生菌压制霉菌，我们再尝试一次吧！”'
  },
  { isChapter: true, chapter: '第三幕：发酵拯救 —— 益生菌与发酵工艺' },
  {
    sceneSrc: '/assets/food_scene4.jpg',
    speaker: '你',
    dialog: '处理掉被污染的发酵液，并把已长杂菌的三角瓶单独隔离后，再按正确工艺重新做一遍。'
  },
  {
    sceneSrc: '/assets/food_scene4.jpg',
    speaker: '稻米小精灵',
    dialog: '发酵工艺的顺序可不能乱：要先浸米、再蒸煮、然后拌曲、控温发酵，最后过滤澄清。点一个图块，再点另一个，就能交换它们的位置，帮我排对吧！'
  },
  { sortGame: true },
  {
    sceneSrc: '/assets/food_scene4.jpg',
    speaker: '旁白',
    dialog: '“你”按照正确排序的米酒酿造流程操作后，三角瓶中散出米香，接下来，是关键的“选菌”环节——'
  },
  {
    // 选菌问答1：发酵菌种
    quiz: true,
    qaMode: true,
    question: '为米酒挑选“发酵菌种”，应该选哪种？',
    options: [
      { letter: 'A', text: '黄曲霉' },
      { letter: 'B', text: '酵母菌' },
      { letter: 'C', text: '大肠杆菌' }
    ],
    answer: 'B'
  },
  {
    // 选菌问答2：抑霉益生菌
    quiz: true,
    qaMode: true,
    question: '挑选“能抑制霉菌的益生菌”，应该用哪种？',
    options: [
      { letter: 'A', text: '植物乳杆菌（乳酸菌）' },
      { letter: 'B', text: '醋酸菌' },
      { letter: 'C', text: '青霉菌' }
    ],
    answer: 'A'
  },
  {
    // 选菌问答3：功能配料
    quiz: true,
    qaMode: true,
    question: '为新一批发酵搭配正确的功能配料，应该选？',
    options: [
      { letter: 'A', text: '糯米 + 酒曲' },
      { letter: 'B', text: '变质陈米' },
      { letter: 'C', text: '糖精' }
    ],
    answer: 'A'
  },
  {
    sceneSrc: '/assets/food_scene4.jpg',
    speaker: '旁白',
    dialog: '按照正确的流程操作后，“你”揭开瓶盖，米香清冽。'
  },
  {
    sceneSrc: '/assets/food_scene4.jpg',
    speaker: '你',
    dialog: '成了！好菌压制了坏菌，米香回来了。被污染的样品坚决弃用、要销毁；没污染的马上低温干燥保存，再用益生菌做生物防控。'
  },
  {
    // 问答（带解读框）：把米变成酒的核心微生物
    qaMode: true,
    question: '酿造米酒/黄酒时，真正负责“把米变成酒”的核心微生物是？',
    options: [
      { letter: 'A', text: '酵母菌' },
      { letter: 'B', text: '黄曲霉' },
      { letter: 'C', text: '大肠杆菌' },
      { letter: 'D', text: '青霉菌' }
    ],
    answer: 'A',
    explain: '酵母菌进行酒精发酵，是酿酒的核心菌种。'
  },
  { isChapter: true, chapter: '第四幕：米酵之心 —— 米香的传承' },
  {
    sceneSrc: '/assets/food_scene5.jpg',
    speaker: '旁白',
    dialog: '重新整理好实验室，被污染的样品被安全销毁，好样品低温干燥入库，发酵瓶里的米酒重新恢复清甜米香。整间实验室仿佛重获新生，连空气里的霉味都消散了。'
  },
  {
    sceneSrc: '/assets/food_scene5.jpg',
    speaker: '旁白',
    dialog: '稻米小精灵的身形重新挺拔，手里拿着一颗泛着暖黄微光的晶体——米酵之心，晶体上还能看到稻穗形状的纹路，凑近还能闻到些许米酒香气。',
    overlay: true,
    overlayIcon: '/assets/food_crystal.png'
  },
  {
    sceneSrc: '/assets/food_scene5.jpg',
    speaker: '稻米小精灵',
    dialog: '（将米酵之心递到玩家手中，声音充满感激）谢谢你帮助我！这颗米酵之心藏着食品学院对食品安全检测与发酵工程的智慧，拿着它，你能更懂‘从田间到餐桌’的守护～要是以后想了解更多食品科学与工程知识，随时来食品学院找我！'
  },
  {
    sceneSrc: '/assets/food_scene5.jpg',
    speaker: '旁白',
    dialog: '“你”接过米酵之心，向小精灵挥手，背后是整洁明亮的实验楼和清甜的米香，稻米小精灵挥舞着稻穗权杖，稻穗在风中发出“沙沙”的送行声。'
  },
  {
    sceneSrc: '/assets/food_scene5.jpg',
    speaker: '你',
    dialog: '从田间到餐桌，守护每一粒米、每一口粮的安全！下一站，化工学院，我来了！'
  },

  // ===== 知识彩蛋：食品学院的冷知识 =====
  { isChapter: true, chapter: '知识彩蛋', rollIn: true },
  {
    hint: '天津科技大学的食品专业在婴幼儿配方乳粉与特殊医学用途配方食品领域也颇有研究。天科大的乳品方向可追溯至 1987 年开设的乳品工艺专业，后发展为乳品工程方向，涉足特殊医学用途配方乳粉与益生菌包埋保护等技术。'
  },
  {
    qaMode: true,
    question: '特殊医学用途配方食品（如特殊配方乳粉）主要服务哪类人群？',
    options: [
      { letter: 'A', text: '健康成年人的日常零食' },
      { letter: 'B', text: '有特殊营养需求的病人/婴儿（如早产儿、过敏婴儿）' },
      { letter: 'C', text: '运动员增肌专用' },
      { letter: 'D', text: '宠物口粮' }
    ],
    answer: 'B',
    explain: '特医食品针对有特殊营养需求的人群，如早产儿、过敏婴儿等。'
  },
  {
    hint: '“发酵工程”是天津科技大学的“国家重点学科”（全国仅有的几个发酵工程博士点之一），其根基可追溯到食品学院建系时的发酵工学专业。'
  },
  {
    qaMode: true,
    question: '天津科技大学的国家重点学科是？',
    options: [
      { letter: 'A', text: '食品科学与工程' },
      { letter: 'B', text: '发酵工程' },
      { letter: 'C', text: '生物工程' },
      { letter: 'D', text: '化学工程' }
    ],
    answer: 'B',
    explain: '发酵工程才是国家重点学科，食品科学与工程是 A 优势学科。'
  },
  {
    hint: '天津科大素有“盐业黄埔”美誉，但它其实属于化工与材料学院的化学工程与工艺专业，并不在食品学院——这是很多人容易搞错的冷知识。'
  },
  {
    qaMode: true,
    question: '天津科大“盐业黄埔”之称的专业属于哪个学院？',
    options: [
      { letter: 'A', text: '食品科学与工程学院' },
      { letter: 'B', text: '化工与材料学院' },
      { letter: 'C', text: '生物工程学院' },
      { letter: 'D', text: '海洋与环境学院' }
    ],
    answer: 'B',
    explain: '盐业方向在化工与材料学院的化学工程与工艺专业。'
  },
  { isEnding: true }
];

// ===== 发酵工艺排序互动 =====
// 步骤（id 1..5 即正确顺序：浸米→蒸煮→拌曲→控温发酵→过滤澄清）
const SORT_STEPS = [
  { id: 1, label: '浸米', icon: '/assets/food_step1_icon.png', name: '/assets/food_step1_name.png' },
  { id: 2, label: '蒸煮', icon: '/assets/food_step2_icon.png', name: '/assets/food_step2_name.png' },
  { id: 3, label: '拌曲', icon: '/assets/food_step3_icon.png', name: '/assets/food_step3_name.png' },
  { id: 4, label: '控温发酵', icon: '/assets/food_step4_icon.png', name: '/assets/food_step4_name.png' },
  { id: 5, label: '过滤澄清', icon: '/assets/food_step5_icon.png', name: '/assets/food_step5_name.png' }
];
// 展板抠图后参考尺寸 1286×905；槽位 = 图标左上角坐标
const SORT_SLOT_POS = [
  { x: 220, y: 85 },   // 浸米
  { x: 645, y: 85 },   // 蒸煮
  { x: 1070, y: 85 },  // 拌曲
  { x: 430, y: 455 },  // 控温发酵
  { x: 860, y: 455 }   // 过滤澄清
];
const SORT_ARROW_POS = [
  { x: 432, y: 182.5 },
  { x: 857, y: 182.5 },
  { x: 645, y: 552.5 },
  { x: 235, y: 552.5 }
];
const SORT_NAME_W = 240;   // 名牌宽（展板像素）
const SORT_ARROW_W = 100;  // 箭头宽（展板像素）
const SORT_BOARD_RPX = 710; // 展板在页面里的显示宽度（rpx）

function buildSortSlots(order: number[]): SortSlot[] {
  const K = SORT_BOARD_RPX / 1286;
  return SORT_SLOT_POS.map((p, slot) => {
    const step = SORT_STEPS.find((s) => s.id === order[slot])!;
    return {
      slot,
      id: step.id,
      label: step.label,
      icon: step.icon,
      name: step.name,
      left: Math.round((p.x - SORT_NAME_W / 2) * K),
      top: Math.round(p.y * K),
      width: Math.round(SORT_NAME_W * K)
    };
  });
}

function buildSortArrows(): SortArrow[] {
  const K = SORT_BOARD_RPX / 1286;
  return SORT_ARROW_POS.map((p) => ({
    left: Math.round(p.x * K),
    top: Math.round(p.y * K),
    width: Math.round(SORT_ARROW_W * K)
  }));
}

// ==================== 主页面 ====================

export default function TeachingPage() {
  const { completeLevel } = useGameStore();

  // 阶段：intro 开幕打字机 | chapter 章节标题 | sort 排序互动 | story 剧情 | ending 通关结尾
  const [phase, setPhase] = useState<'intro' | 'chapter' | 'sort' | 'story' | 'ending'>('intro');
  const [stepIndex, setStepIndex] = useState(0);

  // 开幕
  const [typedText, setTypedText] = useState('');
  const [typedDone, setTypedDone] = useState(false);

  // 章节
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterRoll, setChapterRoll] = useState(false);

  // 剧情
  const [sceneSrc, setSceneSrc] = useState('');
  const [speaker, setSpeaker] = useState('旁白');
  const [dialog, setDialog] = useState('');
  const [typedDialog, setTypedDialog] = useState('');
  const [dialogTyping, setDialogTyping] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [overlayIcon, setOverlayIcon] = useState('');
  const [overlayIconLarge, setOverlayIconLarge] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<OptionState[]>([]);
  const [qaMode, setQaMode] = useState(false);
  const [answer, setAnswer] = useState('');
  const [explain, setExplain] = useState('');
  const [hint, setHint] = useState('');
  const [quiz, setQuiz] = useState(false);
  const [answered, setAnswered] = useState(false);

  // 排序
  const [sortOrder, setSortOrder] = useState<number[]>([]);
  const [sortSlots, setSortSlots] = useState<SortSlot[]>([]);
  const [sortArrows, setSortArrows] = useState<SortArrow[]>([]);
  const [sortSelected, setSortSelected] = useState(-1);
  const [sortSolved, setSortSolved] = useState(false);

  // 结尾
  const [endingText, setEndingText] = useState('');
  const [endingDone, setEndingDone] = useState(false);

  // 定时器
  const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dialogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quizTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (typeTimerRef.current) {
      clearInterval(typeTimerRef.current);
      typeTimerRef.current = null;
    }
    if (dialogTimerRef.current) {
      clearInterval(dialogTimerRef.current);
      dialogTimerRef.current = null;
    }
    if (quizTimerRef.current) {
      clearTimeout(quizTimerRef.current);
      quizTimerRef.current = null;
    }
  }

  function clearDialogTimer() {
    if (dialogTimerRef.current) {
      clearInterval(dialogTimerRef.current);
      dialogTimerRef.current = null;
    }
  }

  // 打字机：逐字显示开幕文字
  function startIntroTypewriter() {
    clearTimers();
    let i = 0;
    const full = FULL_INTRO;
    setTypedText('');
    setTypedDone(false);
    typeTimerRef.current = setInterval(() => {
      i += 1;
      setTypedText(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(typeTimerRef.current!);
        typeTimerRef.current = null;
        setTypedDone(true);
      }
    }, 130);
  }

  // 通关结尾打字机
  function startEndingTypewriter() {
    clearTimers();
    let i = 0;
    const full = FULL_ENDING;
    setEndingText('');
    setEndingDone(false);
    typeTimerRef.current = setInterval(() => {
      i += 1;
      setEndingText(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(typeTimerRef.current!);
        typeTimerRef.current = null;
        setEndingDone(true);
      }
    }, 90);
  }

  // 对话框打字机
  function startDialogTypewriter(full: string) {
    clearDialogTimer();
    if (!full) {
      setTypedDialog('');
      setDialogTyping(false);
      return;
    }
    let i = 0;
    setDialogTyping(true);
    dialogTimerRef.current = setInterval(() => {
      i += 1;
      setTypedDialog(full.slice(0, i));
      if (i >= full.length) {
        clearDialogTimer();
        setDialogTyping(false);
      }
    }, 50);
  }

  function initSortGame() {
    let order = [1, 2, 3, 4, 5];
    do {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = order[i];
        order[i] = order[j];
        order[j] = t;
      }
    } while (order.join(',') === '1,2,3,4,5');

    setPhase('sort');
    setSortOrder(order);
    setSortSlots(buildSortSlots(order));
    setSortArrows(buildSortArrows());
    setSortSelected(-1);
    setSortSolved(false);
  }

  // 应用某一幕剧情（章节标题 / 台词 / 问答），并把字段同步到状态
  function applyStep(index: number) {
    const step = SCRIPT[index];
    if (!step) return;

    // 章节标题画面
    if (step.isChapter) {
      setPhase('chapter');
      setChapterTitle(step.chapter || '');
      setChapterRoll(!!step.rollIn);
      setStepIndex(index);
      return;
    }

    // 排序互动
    if (step.sortGame) {
      setStepIndex(index);
      initSortGame();
      return;
    }

    // 通关结尾
    if (step.isEnding) {
      setPhase('ending');
      setStepIndex(index);
      setEndingText('');
      setEndingDone(false);
      startEndingTypewriter();
      completeLevel('teaching'); // 通关：标记食品学院完成
      return;
    }

    // 普通剧情 / 问答环节
    setPhase('story');
    setStepIndex(index);
    setSceneSrc(step.sceneSrc || '');
    setSpeaker(step.speaker || '');
    setDialog(step.dialog || '');
    setTypedDialog('');
    setDialogTyping(!!step.dialog);
    setOverlay(!!step.overlay);
    setOverlayIcon(step.overlayIcon || '');
    setOverlayIconLarge(!!step.overlayIconLarge);
    setQuestion(step.question || '');
    setOptions((step.options || []).map((o) => ({ letter: o.letter, text: o.text, state: '' })));
    setQaMode(!!(step.qaMode || step.hint));
    setAnswer(step.answer || '');
    setExplain(step.explain || '');
    setHint(step.hint || '');
    setQuiz(!!step.quiz);
    setAnswered(false);
    startDialogTypewriter(step.dialog || '');
  }

  useEffect(() => {
    startIntroTypewriter();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 点击开幕：未打完则直接补全，已打完则进入第一幕章节标题
  function onIntroTap() {
    if (!typedDone) {
      clearTimers();
      setTypedText(FULL_INTRO);
      setTypedDone(true);
      return;
    }
    applyStep(0);
  }

  // 点击章节标题：进入下一段剧情
  function onChapterTap() {
    applyStep(stepIndex + 1);
  }

  // 点击「继续」：台词没打完则先补全，打完则进入下一段剧情
  function onTapNext() {
    if (dialogTyping) {
      clearDialogTimer();
      setTypedDialog(dialog);
      setDialogTyping(false);
      return;
    }
    const next = stepIndex + 1;
    if (next < SCRIPT.length) {
      applyStep(next);
      return;
    }
    Taro.showToast({ title: '剧情待续', icon: 'none' });
  }

  // 点击选项：判定对错，高亮正确/错误选项
  function onTapOption(index: number) {
    if (answered) return;
    const opt = options[index];
    const isCorrect = opt.letter === answer;
    const highlight = options.map((o) => {
      let state = 'optionDim';
      if (o.letter === answer) state = 'optionCorrect';
      else if (o.letter === opt.letter) state = 'optionWrong';
      return { letter: o.letter, text: o.text, state };
    });

    // 闯关问答：答对自动进入下一步；答错亮出正确答案后重试（无解读框）
    if (quiz) {
      if (isCorrect) {
        setAnswered(true);
        setOptions(highlight);
        Taro.showToast({ title: '回答正确！', icon: 'none', duration: 700 });
        quizTimerRef.current = setTimeout(() => {
          quizTimerRef.current = null;
          applyStep(stepIndex + 1);
        }, 750);
      } else {
        setAnswered(true);
        setOptions(highlight);
        Taro.showToast({ title: `正确答案是 ${answer}`, icon: 'none', duration: 1000 });
        quizTimerRef.current = setTimeout(() => {
          quizTimerRef.current = null;
          setOptions(options.map((o) => ({ letter: o.letter, text: o.text, state: '' })));
          setAnswered(false);
        }, 1100);
      }
      return;
    }

    // 普通问答（带解读框）：作答后锁定并显示解读
    setAnswered(true);
    setOptions(highlight);
    Taro.showToast({
      title: isCorrect ? '回答正确！' : `正确答案是 ${answer}`,
      icon: 'none'
    });
  }

  // 排序：点一个图块再点另一个交换位置
  function onTapSortPiece(slot: number) {
    if (sortSolved) return;
    if (sortSelected < 0) {
      setSortSelected(slot);
      return;
    }
    if (sortSelected === slot) {
      setSortSelected(-1);
      return;
    }
    const order = sortOrder.slice();
    const t = order[sortSelected];
    order[sortSelected] = order[slot];
    order[slot] = t;
    const solved = order.join(',') === '1,2,3,4,5';
    setSortOrder(order);
    setSortSlots(buildSortSlots(order));
    setSortSelected(-1);
    setSortSolved(solved);
    if (solved) {
      Taro.showToast({ title: '排序成功！', icon: 'success' });
    }
  }

  function onSortContinue() {
    applyStep(stepIndex + 1);
  }

  function onExitToMap() {
    Taro.navigateBack();
  }

  return (
    <View className={styles.page}>
      {/* 开幕：浅色背景 + 中央打字机文字 */}
      {phase === 'intro' && (
        <View className={styles.intro} onClick={onIntroTap}>
          <View className={styles.introLine}>
            <Text className={styles.introText}>{typedText}</Text>
            <Text className={styles.introCursor}>▍</Text>
          </View>
          {typedDone && <Text className={styles.introHint}>轻触屏幕继续</Text>}
        </View>
      )}

      {/* 章节标题：相框中央浮现橙色文字 */}
      {phase === 'chapter' && (
        <View className={styles.frame} onClick={onChapterTap}>
          <View className={styles.frameInner}>
            <View className={styles.chapter}>
              <Text className={`${styles.chapterText} ${chapterRoll ? styles.chapterTextRoll : ''}`}>
                {chapterTitle}
              </Text>
              <View className={styles.chapterHint}>轻触屏幕继续</View>
            </View>
          </View>
        </View>
      )}

      {/* 排序互动：浅米色背景 + 展板 + 可交换图块 */}
      {phase === 'sort' && (
        <View className={styles.sortPage}>
          <Text className={styles.sortTitle}>发酵工艺排序</Text>
          <Text className={styles.sortSubtitle}>点一个图块，再点另一个交换位置，按正确顺序排好</Text>

          <View className={styles.sortBoard}>
            <Image className={styles.sortBoardImg} src='/assets/food_board.png' mode='widthFix' />
            {sortArrows.map((a, i) => (
              <Image
                key={i}
                className={styles.sortArrow}
                src='/assets/food_arrow.png'
                mode='widthFix'
                style={{ left: `${a.left}rpx`, top: `${a.top}rpx`, width: `${a.width}rpx` }}
              />
            ))}
            {sortSlots.map((p) => (
              <View
                key={p.slot}
                className={`${styles.sortPiece} ${sortSelected === p.slot ? styles.sortPieceActive : ''} ${sortSolved ? styles.sortPieceLocked : ''}`}
                style={{ left: `${p.left}rpx`, top: `${p.top}rpx`, width: `${p.width}rpx` }}
                onClick={() => onTapSortPiece(p.slot)}
              >
                <Image className={styles.sortPieceIcon} src={p.icon} mode='widthFix' />
                <Image className={styles.sortPieceName} src={p.name} mode='widthFix' />
              </View>
            ))}
          </View>

          {sortSolved ? (
            <View className={styles.sortSuccess}>
              <Text className={styles.sortSuccessText}>排序成功！</Text>
              <View className={styles.sortContinue} onClick={onSortContinue}>继续 ▼</View>
            </View>
          ) : (
            <Text className={styles.sortFootHint}>把工艺按 浸米 → 蒸煮 → 拌曲 → 控温发酵 → 过滤澄清 排好</Text>
          )}
        </View>
      )}

      {/* 通关结尾：浅黄色背景 + 中央打字机 + 返回按钮 */}
      {phase === 'ending' && (
        <View className={styles.ending}>
          <View className={styles.endingLine}>
            <Text className={styles.endingText}>{endingText}</Text>
            <Text className={styles.endingCursor}>▍</Text>
          </View>
          {endingDone && (
            <View className={styles.endingActions}>
              <View className={styles.endingExit} onClick={onExitToMap}>返回地图</View>
            </View>
          )}
        </View>
      )}

      {/* 剧情阶段：相框 + 对话框 */}
      {phase === 'story' && (
        <View className={styles.frame}>
          <View className={styles.frameInner}>
            {sceneSrc ? (
              <Image className={styles.sceneImg} src={sceneSrc} mode='aspectFill' />
            ) : (
              <View className={styles.scenePlaceholder}>
                {!qaMode && (
                  <>
                    <Text className={styles.sceneEmoji}>🌾</Text>
                    <Text className={styles.sceneTitle}>剧情画面</Text>
                    <Text className={styles.sceneSub}>铺满相框 · 待放入生成的画面</Text>
                  </>
                )}
              </View>
            )}

            {/* 半透明橙黄遮罩 */}
            {overlay && (
              <View className={styles.overlay}>
                {overlayIcon && (
                  <Image
                    className={`${styles.overlayIcon} ${overlayIconLarge ? styles.overlayIconLarge : ''}`}
                    src={overlayIcon}
                    mode='widthFix'
                  />
                )}
              </View>
            )}

            <View className={`${styles.dialogZone} ${qaMode ? styles.dialogZoneCenter : ''}`}>
              {/* 提示框：知识彩蛋作答前的背景介绍 */}
              {hint && (
                <View className={styles.hintBox} onClick={onTapNext}>
                  <Text className={styles.hintTitle}>💡 知识彩蛋</Text>
                  <Text className={styles.hintText}>{hint}</Text>
                  <View className={styles.hintNext}>继续 ▼</View>
                </View>
              )}

              {/* 解读框：作答后显示 */}
              {answered && explain && (
                <View className={styles.qaExplainBox} onClick={onTapNext}>
                  <Text className={styles.qaExplainTitle}>📖 解读</Text>
                  <Text className={styles.qaExplainText}>{explain}</Text>
                  <View className={styles.qaExplainNext}>继续 ▼</View>
                </View>
              )}

              {/* 普通对话 */}
              {!hint && options.length === 0 && (
                <View className={styles.dialog} onClick={onTapNext}>
                  <Text className={styles.speaker}>{speaker}</Text>
                  <View className={styles.dialogBody}>
                    <Text className={styles.dialogText}>
                      {typedDialog}
                      {dialogTyping && <Text className={styles.dialogCursor}>▍</Text>}
                    </Text>
                    {!dialogTyping && <Text className={styles.dialogNext}>▼</Text>}
                  </View>
                </View>
              )}

              {/* 问答 */}
              {!hint && options.length > 0 && (
                <View className={styles.dialog}>
                  <Text className={`${styles.speaker} ${styles.qaSpeaker}`}>❓ 问答</Text>
                  <View className={`${styles.dialogBody} ${styles.qaBody}`}>
                    <Text className={styles.dialogText}>{question}</Text>
                  </View>
                  <View className={styles.options}>
                    {options.map((o, i) => (
                      <View
                        key={o.letter}
                        className={`${styles.option} ${styles[o.state] || ''}`}
                        onClick={() => onTapOption(i)}
                      >
                        <View className={styles.optionLetter}>{o.letter}</View>
                        <Text className={styles.optionText}>{o.text}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

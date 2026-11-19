import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGameStore } from '@/stores/gameStore';
import styles from './index.module.scss';

// ==================== 场景配置 ====================
const ACTS = [
  {
    id: 1,
    title: '第一幕：神秘的召唤',
    subtitle: '踏入天津科技大学图书馆',
    sceneBg: 'night',
    sceneElements: ['moon', 'stars', 'books', 'door'],
    characters: [
      { name: 'player', expression: 'curious', position: 'right' },
      { name: 'bookSpirit', expression: 'mysterious', position: 'left' }
    ],
    dialogues: [
      { speaker: 'player', text: '哇……这就是天科大图书馆吗？好壮观……' },
      { speaker: 'narrator', text: '月光洒在古老的建筑上，你轻轻推开了图书馆的玻璃门——' },
      { speaker: 'player', text: '这里面好大啊，灯光暖暖的，书架上全是书……' },
      { speaker: 'bookSpirit', text: '你终于来了，我等你很久了。' },
      { speaker: 'player', text: '咦？！是谁在说话？' },
      { speaker: 'bookSpirit', text: '我是这座图书馆的守护精灵——书灵。百年来，我守护着这里的知识之火。' },
      { speaker: 'bookSpirit', text: '但不久前，知识之火熄灭了。只有真正的有缘人，才能通过四重考验重新点燃它。' },
      { speaker: 'bookSpirit', text: '你——愿意帮助我吗？' },
      { speaker: 'player', text: '知识之火……好，我试试看！' },
      { speaker: 'bookSpirit', text: '太好了！那么首先，让我带你熟悉一下图书馆的布局……' }
    ],
    gameType: 'click'
  },
  {
    id: 2,
    title: '第二幕：书籍分类大师',
    subtitle: '整理散落的图书',
    sceneBg: 'library',
    sceneElements: ['shelves', 'sparkles', 'books'],
    characters: [
      { name: 'bookSpirit', expression: 'happy', position: 'left' },
      { name: 'player', expression: 'determined', position: 'right' }
    ],
    dialogues: [
      { speaker: 'bookSpirit', text: '第一重考验——书籍分类！' },
      { speaker: 'bookSpirit', text: '你看这些书，全都乱糟糟的堆在一起了。得按类别放回对应的书架才行。' },
      { speaker: 'player', text: '额……这么多？' },
      { speaker: 'bookSpirit', text: '别担心！红色的是文学类、蓝色的是科技类、绿色的是自然科学类。' },
      { speaker: 'bookSpirit', text: '来，先选一本书，再把它放到对应颜色的书架上。试试看！' }
    ],
    gameType: 'sort',
    gameConfig: { target: 6 }
  },
  {
    id: 3,
    title: '第三幕：书架迷宫探险',
    subtitle: '寻找《天科大校史》',
    sceneBg: 'maze',
    sceneElements: ['walls', 'glow', 'dust'],
    characters: [
      { name: 'bookSpirit', expression: 'excited', position: 'left' },
      { name: 'player', expression: 'confused', position: 'right' }
    ],
    dialogues: [
      { speaker: 'bookSpirit', text: '第二关来啦！图书馆深处藏着一本特别的《天科大校史》。' },
      { speaker: 'bookSpirit', text: '但它被藏在了书架迷宫里，你得穿过迷宫才能找到它。' },
      { speaker: 'player', text: '书架迷宫？听起来好酷！' },
      { speaker: 'bookSpirit', text: '用下面的方向键控制移动，找到那本发光的红皮书就行！加油！' }
    ],
    gameType: 'maze',
    gameConfig: { target: 1 }
  },
  {
    id: 4,
    title: '第四幕：点燃知识之火',
    subtitle: '收集散落的知识碎片',
    sceneBg: 'fire',
    sceneElements: ['flame', 'particles', 'light'],
    characters: [
      { name: 'bookSpirit', expression: 'proud', position: 'left' },
      { name: 'player', expression: 'happy', position: 'right' }
    ],
    dialogues: [
      { speaker: 'bookSpirit', text: '太棒了！你找到了《天科大校史》！最后一关就在眼前了！' },
      { speaker: 'bookSpirit', text: '知识之火的碎片散落在图书馆各处。收集它们，让火焰重燃吧！' },
      { speaker: 'player', text: '好！看我的！' },
      { speaker: 'bookSpirit', text: '点击那些发光的✨碎片，全部收集起来！' }
    ],
    gameType: 'collect',
    gameConfig: { target: 5 }
  }
];

// ==================== 动画角色组件 ====================

interface AnimatedCharProps {
  name: string;
  expression: string;
  position: 'left' | 'right';
  isTalking: boolean;
}

function AnimatedCharacter({ name, expression, position, isTalking }: AnimatedCharProps) {
  const isPlayer = name === 'player';
  const isBookSpirit = name === 'bookSpirit';
  
  const getCharStyle = () => {
    if (isBookSpirit) return styles.charBookSpirit;
    if (isPlayer) return styles.charPlayer;
    return styles.charNarrator;
  };

  const getExpressionStyle = () => {
    if (isBookSpirit) {
      switch(expression) {
        case 'mysterious': return styles.expressionMysterious;
        case 'happy': return styles.expressionHappy;
        case 'excited': return styles.expressionExcited;
        case 'proud': return styles.expressionProud;
        default: return '';
      }
    }
    if (isPlayer) {
      switch(expression) {
        case 'curious': return styles.expressionCurious;
        case 'determined': return styles.expressionDetermined;
        case 'confused': return styles.expressionConfused;
        case 'happy': return styles.expressionHappyP;
        default: return '';
      }
    }
    return '';
  };

  return (
    <View className={`${styles.charContainer} ${position === 'left' ? styles.charLeft : styles.charRight} ${isTalking ? styles.charTalking : ''}`}>
      <View className={`${styles.charSprite} ${getCharStyle()} ${getExpressionStyle()}`}>
        <Text className={styles.charEmoji}>
          {isBookSpirit ? '📚' : isPlayer ? '🧑‍🎓' : '🎭'}
        </Text>
        <View className={styles.charGlow} />
        <View className={styles.charSparkles}>
          {[...Array(3)].map((_, i) => (
            <Text key={i} className={styles.charSparkle} style={{ animationDelay: `${i * 0.3}s` }}>✦</Text>
          ))}
        </View>
      </View>
      <Text className={styles.charName}>{isBookSpirit ? '书灵' : isPlayer ? '你' : '旁白'}</Text>
    </View>
  );
}

// ==================== 打字机文本组件 ====================

interface TypewriterTextProps {
  text: string;
  onComplete?: () => void;
  speed?: number;
}

function TypewriterText({ text, onComplete, speed = 40 }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setDisplayed('');
    indexRef.current = 0;
    setIsComplete(false);
    
    const typeChar = () => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1));
        indexRef.current++;
        timerRef.current = setTimeout(typeChar, speed);
      } else {
        setIsComplete(true);
      }
    };
    
    timerRef.current = setTimeout(typeChar, 300);
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, speed]);

  const handleClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isComplete) {
      // 打字未完成：仅补全文字，不推进对话
      setDisplayed(text);
      setIsComplete(true);
    } else {
      // 文字已完整：推进到下一条对话
      onComplete?.();
    }
  };

  return (
    <View className={styles.typewriter} onClick={handleClick}>
      <Text className={styles.typewriterText}>{displayed}</Text>
      {!isComplete && <Text className={styles.typewriterCursor}>|</Text>}
      {isComplete && <Text className={styles.typewriterHint}>点击继续 →</Text>}
    </View>
  );
}

// ==================== 场景背景组件 ====================

interface SceneBackgroundProps {
  sceneBg: string;
  elements: string[];
}

function SceneBackground({ sceneBg, elements }: SceneBackgroundProps) {
  return (
    <View className={`${styles.sceneBg} ${styles[`scene_${sceneBg}`]}`}>
      {/* 星空闪烁 */}
      {elements.includes('stars') && (
        <View className={styles.starrySky}>
          {[...Array(30)].map((_, i) => (
            <View key={i} className={styles.star} style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
              width: `${Math.random() * 4 + 2}rpx`,
              height: `${Math.random() * 4 + 2}rpx`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }} />
          ))}
        </View>
      )}
      
      {/* 月亮 */}
      {elements.includes('moon') && (
        <View className={styles.moonContainer}>
          <View className={styles.moon} />
          <View className={styles.moonGlow} />
        </View>
      )}
      
      {/* 飘浮的书 */}
      {elements.includes('books') && (
        <View className={styles.floatingBooks}>
          {[...Array(5)].map((_, i) => (
            <Text key={i} className={styles.floatingBook} style={{
              left: `${15 + i * 18}%`,
              animationDelay: `${i * 0.5}s`,
              fontSize: `${40 + Math.random() * 20}rpx`
            }}>
              {['📖', '📕', '📗', '📘', '📙'][i]}
            </Text>
          ))}
        </View>
      )}
      
      {/* 门 */}
      {elements.includes('door') && (
        <View className={styles.doorContainer}>
          <View className={styles.door}>
            <Text className={styles.doorEmoji}>🚪</Text>
          </View>
        </View>
      )}
      
      {/* 书架 */}
      {elements.includes('shelves') && (
        <View className={styles.shelvesBg}>
          {[...Array(4)].map((_, i) => (
            <View key={i} className={styles.shelfBg} style={{
              left: `${10 + i * 25}%`,
              height: `${100 + Math.random() * 50}rpx`,
              animationDelay: `${i * 0.2}s`
            }}>
              <Text className={styles.shelfEmoji}>📚</Text>
            </View>
          ))}
        </View>
      )}
      
      {/* 闪光粒子 */}
      {elements.includes('sparkles') && (
        <View className={styles.sparkleField}>
          {[...Array(8)].map((_, i) => (
            <Text key={i} className={styles.sparkleParticle} style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`
            }}>✨</Text>
          ))}
        </View>
      )}
      
      {/* 迷宫墙壁装饰 */}
      {elements.includes('walls') && (
        <View className={styles.mazeDecor}>
          {[...Array(6)].map((_, i) => (
            <View key={i} className={styles.mazeWallDecor} style={{
              left: `${Math.random() * 90 + 5}%`,
              top: `${Math.random() * 80 + 10}%`,
              transform: `rotate(${Math.random() * 90}deg)`
            }} />
          ))}
        </View>
      )}
      
      {/* 发光效果 */}
      {elements.includes('glow') && (
        <View className={styles.glowField}>
          <View className={styles.glowOrb} style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 40}%`,
            animationDelay: `${Math.random() * 2}s`
          }} />
          <View className={styles.glowOrb} style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 40}%`,
            animationDelay: `${Math.random() * 2}s`
          }} />
        </View>
      )}
      
      {/* 尘埃粒子 */}
      {elements.includes('dust') && (
        <View className={styles.dustField}>
          {[...Array(10)].map((_, i) => (
            <View key={i} className={styles.dustParticle} style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }} />
          ))}
        </View>
      )}
      
      {/* 火焰效果 */}
      {elements.includes('flame') && (
        <View className={styles.flameField}>
          <View className={styles.flameBase} />
          <View className={styles.flameInner} />
          <View className={styles.flameGlow} />
        </View>
      )}
      
      {/* 光柱 */}
      {elements.includes('light') && (
        <View className={styles.lightBeams}>
          {[...Array(3)].map((_, i) => (
            <View key={i} className={styles.lightBeam} style={{
              left: `${20 + i * 30}%`,
              animationDelay: `${i * 0.3}s`
            }} />
          ))}
        </View>
      )}
      
      {/* 飘浮粒子 */}
      {elements.includes('particles') && (
        <View className={styles.particleField}>
          {[...Array(12)].map((_, i) => (
            <Text key={i} className={styles.particleFloat} style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              fontSize: `${20 + Math.random() * 20}rpx`
            }}>
              {['✦', '✧', '·', '✦', '✧'][i % 5]}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ==================== 书籍分类游戏 ====================

interface SortGameProps {
  onComplete: (success: boolean) => void;
}

function SortGame({ onComplete }: SortGameProps) {
  const [books, setBooks] = useState([
    { id: 1, color: 'red', placed: false },
    { id: 2, color: 'blue', placed: false },
    { id: 3, color: 'green', placed: false },
    { id: 4, color: 'red', placed: false },
    { id: 5, color: 'blue', placed: false },
    { id: 6, color: 'green', placed: false }
  ]);
  const [selectedBook, setSelectedBook] = useState<number | null>(null);
  const [placedCount, setPlacedCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [shakeShelf, setShakeShelf] = useState<string | null>(null);

  const handleBookClick = (id: number) => {
    if (books.find(b => b.id === id)?.placed) return;
    setSelectedBook(id);
  };

  const handleShelfClick = (shelfColor: string) => {
    if (selectedBook === null) return;
    const book = books.find(b => b.id === selectedBook);
    if (book && book.color === shelfColor && !book.placed) {
      setBooks(prev => prev.map(b => b.id === selectedBook ? { ...b, placed: true } : b));
      setPlacedCount(prev => {
        const newCount = prev + 1;
        if (newCount >= 6) {
          setTimeout(() => {
            setShowResult(true);
            setTimeout(() => onComplete(true), 800);
          }, 500);
        }
        return newCount;
      });
      setSelectedBook(null);
    } else if (book) {
      setShakeShelf(shelfColor);
      setTimeout(() => setShakeShelf(null), 500);
      Taro.showToast({ title: '放错书架了！再试试', icon: 'none' });
      setSelectedBook(null);
    }
  };

  const shelfLabels: Record<string, string> = {
    red: '文学类',
    blue: '科技类',
    green: '自然科学类'
  };

  return (
    <View className={`${styles.gamePanel} ${showResult ? styles.gameComplete : ''}`}>
      <View className={styles.gameHeader}>
        <Text className={styles.gameTitle}>📚 书籍分类</Text>
        <Text className={styles.gameProgress}>
          <Text className={styles.progressNum}>{placedCount}</Text>
          <Text className={styles.progressSep}>/</Text>
          <Text className={styles.progressTotal}>6</Text>
        </Text>
      </View>
      
      <View className={styles.shelvesRow}>
        {['red', 'blue', 'green'].map(color => (
          <View
            key={color}
            className={`${styles.sortShelf} ${styles[`shelfColor_${color}`]} ${shakeShelf === color ? styles.shelfShake : ''}`}
            onClick={() => handleShelfClick(color)}
          >
            <Text className={styles.sortShelfIcon}>
              {color === 'red' ? '📖' : color === 'blue' ? '🔬' : '🌿'}
            </Text>
            <Text className={styles.sortShelfLabel}>{shelfLabels[color]}</Text>
          </View>
        ))}
      </View>

      <View className={styles.booksRow}>
        {books.map(book => (
          <View
            key={book.id}
            className={`${styles.sortBook} ${styles[`bookColor_${book.color}`]} ${book.placed ? styles.bookPlacedAnim : ''} ${selectedBook === book.id ? styles.bookSelectedAnim : ''}`}
            onClick={() => handleBookClick(book.id)}
          >
            <Text className={styles.sortBookIcon}>📖</Text>
          </View>
        ))}
      </View>

      {selectedBook !== null && (
        <View className={styles.selectedHint}>
          <Text className={styles.hintIcon}>👆</Text>
          <Text className={styles.hintText}>请点击对应颜色的书架</Text>
        </View>
      )}
    </View>
  );
}

// ==================== 迷宫游戏 ====================

interface MazeGameProps {
  onComplete: (success: boolean) => void;
}

function MazeGame({ onComplete }: MazeGameProps) {
  const [position, setPosition] = useState({ x: 1, y: 1 });
  const [found, setFound] = useState(false);
  const [showResult, setShowResult] = useState(false);
  
  const maze = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1]
  ];
  
  const targetPos = { x: 5, y: 5 };

  const handleMove = (dx: number, dy: number) => {
    if (found) return;
    const nx = position.x + dx;
    const ny = position.y + dy;
    if (nx >= 0 && nx < 7 && ny >= 0 && ny < 7 && maze[ny][nx] === 0) {
      setPosition({ x: nx, y: ny });
      if (nx === targetPos.x && ny === targetPos.y) {
        setFound(true);
        setTimeout(() => {
          setShowResult(true);
          setTimeout(() => onComplete(true), 800);
        }, 500);
      }
    }
  };

  return (
    <View className={`${styles.gamePanel} ${showResult ? styles.gameComplete : ''}`}>
      <View className={styles.gameHeader}>
        <Text className={styles.gameTitle}>🏛️ 书架迷宫</Text>
        <Text className={styles.gameHint}>找到发光的目标</Text>
      </View>
      
      <View className={styles.mazeDisplay}>
        {maze.map((row, y) => (
          <View key={y} className={styles.mazeRow}>
            {row.map((cell, x) => (
              <View key={x} className={`${styles.mazeCell} ${cell === 1 ? styles.mazeWall : styles.mazePath} ${position.x === x && position.y === y ? styles.mazePlayer : ''} ${targetPos.x === x && targetPos.y === y ? styles.mazeTarget : ''}`}>
                {position.x === x && position.y === y && (
                  <Text className={styles.mazePlayerIcon}>🧑‍🎓</Text>
                )}
                {targetPos.x === x && targetPos.y === y && !found && (
                  <Text className={styles.mazeTargetIcon}>📕</Text>
                )}
                {targetPos.x === x && targetPos.y === y && found && (
                  <Text className={styles.mazeFoundIcon}>✨</Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>

      <View className={styles.mazeControls}>
        <View className={styles.mazeCtrlRow}>
          <View className={styles.mazeBtn} onClick={() => handleMove(0, -1)}>↑</View>
        </View>
        <View className={styles.mazeCtrlRow}>
          <View className={styles.mazeBtn} onClick={() => handleMove(-1, 0)}>←</View>
          <View className={`${styles.mazeBtn} ${styles.mazeBtnCenter}`}>⬤</View>
          <View className={styles.mazeBtn} onClick={() => handleMove(1, 0)}>→</View>
        </View>
        <View className={styles.mazeCtrlRow}>
          <View className={styles.mazeBtn} onClick={() => handleMove(0, 1)}>↓</View>
        </View>
      </View>
    </View>
  );
}

// ==================== 收集游戏 ====================

interface CollectGameProps {
  target: number;
  onComplete: (success: boolean) => void;
}

function CollectGame({ target, onComplete }: CollectGameProps) {
  const [particles, setParticles] = useState([
    { id: 1, x: 15, y: 20, collected: false },
    { id: 2, x: 75, y: 15, collected: false },
    { id: 3, x: 45, y: 55, collected: false },
    { id: 4, x: 10, y: 70, collected: false },
    { id: 5, x: 80, y: 65, collected: false }
  ]);
  const [collected, setCollected] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const handleCollect = (id: number) => {
    const p = particles.find(p => p.id === id);
    if (p && !p.collected) {
      setParticles(prev => prev.map(p => p.id === id ? { ...p, collected: true } : p));
      setCollected(prev => {
        const newCount = prev + 1;
        if (newCount >= target) {
          setTimeout(() => {
            setShowResult(true);
            setTimeout(() => onComplete(true), 800);
          }, 500);
        }
        return newCount;
      });
    }
  };

  return (
    <View className={`${styles.gamePanel} ${showResult ? styles.gameComplete : ''}`}>
      <View className={styles.gameHeader}>
        <Text className={styles.gameTitle}>🔥 知识之火</Text>
        <Text className={styles.gameProgress}>
          <Text className={styles.progressNum}>{collected}</Text>
          <Text className={styles.progressSep}>/</Text>
          <Text className={styles.progressTotal}>{target}</Text>
        </Text>
      </View>

      <View className={styles.collectField}>
        {/* 火焰中心 */}
        <View className={styles.collectCenter}>
          <View className={`${styles.collectFlame} ${collected >= 1 ? styles.flameStage1 : ''} ${collected >= 3 ? styles.flameStage2 : ''} ${collected >= 5 ? styles.flameStage3 : ''}`}>
            <Text className={styles.flameEmoji}>🔥</Text>
          </View>
        </View>

        {/* 碎片 */}
        {particles.map(p => (
          <View
            key={p.id}
            className={`${styles.shard} ${p.collected ? styles.shardCollected : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onClick={() => handleCollect(p.id)}
          >
            <Text className={styles.shardIcon}>✨</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ==================== 庆祝动画 ====================

function CelebrationOverlay({ onBack }: { onBack: () => void }) {
  const emojis = ['🎉', '✨', '🌟', '🎊', '⭐', '🔥', '💫', '📚'];

  return (
    <View className={styles.celebrationOverlay}>
      {/* 彩带 */}
      {[...Array(15)].map((_, i) => (
        <View key={i} className={styles.celebrationRibbon} style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${i * 0.15}s`,
          backgroundColor: ['#FBBF24', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444', '#EC4899'][i % 6]
        }} />
      ))}
      
      {/* 飘浮表情 */}
      {[...Array(10)].map((_, i) => (
        <Text key={i} className={styles.celebrationEmoji} style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${i * 0.2}s`,
          fontSize: `${30 + Math.random() * 30}rpx`
        }}>
          {emojis[i % emojis.length]}
        </Text>
      ))}

      <View className={styles.celebrationCenter}>
        <View className={styles.celebrationIconWrap}>
          <Text className={styles.celebMainIcon}>🔥</Text>
        </View>
        <Text className={styles.celebTitle}>知识之火重燃！</Text>
        <Text className={styles.celebSubtitle}>恭喜完成图书馆关卡</Text>
        <Text className={styles.celebDesc}>你成功通过了四重考验</Text>
        <Text className={styles.celebDesc}>体育馆关卡已解锁！</Text>
        
        <View className={styles.celebButton} onClick={onBack}>
          <Text className={styles.celebButtonText}>返回地图</Text>
        </View>
      </View>
    </View>
  );
}

// ==================== 主页面 ====================

export default function LibraryPage() {
  const { currentAct, setCurrentAct, progressAct, completeLevel, levels } = useGameStore();
  const [dialogIndex, setDialogIndex] = useState(0);
  const [showGame, setShowGame] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [sceneTransition, setSceneTransition] = useState(false);
  const [actVisible, setActVisible] = useState(true);
  const [playerSays, setPlayerSays] = useState('');
  const [showActTitle, setShowActTitle] = useState(false);

  const level = levels.find(l => l.id === 'library');
  const startingAct = level?.currentAct || 1;
  const actData = ACTS[currentAct - 1];

  // 初始化和切换 Act
  useEffect(() => {
    setDialogIndex(0);
    setShowGame(false);
    setActVisible(true);
    setShowActTitle(false);
    
    // 展示 Act 标题动画
    setShowActTitle(true);
    const timer = setTimeout(() => setShowActTitle(false), 2500);
    return () => clearTimeout(timer);
  }, [currentAct]);

  useEffect(() => {
    setCurrentAct(startingAct);
  }, []);

  // 对话框完成
  const handleDialogComplete = () => {
    if (!actData?.dialogues) return;
    setDialogIndex(prev => {
      if (prev >= actData.dialogues.length - 1) {
        setShowGame(true);
        return prev;
      }
      return prev + 1;
    });
  };

  // 游戏完成
  const handleGameComplete = (success: boolean) => {
    if (success) {
      if (currentAct < ACTS.length) {
        // 切换 Act
        setSceneTransition(true);
        setTimeout(() => {
          setActVisible(false);
          setSceneTransition(false);
          progressAct('library');
        }, 800);
      } else {
        completeLevel('library');
        setTimeout(() => setShowCelebration(true), 1000);
      }
    }
  };

  // 下一幕
  const handleNextAct = () => {
    if (currentAct < ACTS.length) {
      setCurrentAct(currentAct + 1);
    } else {
      Taro.navigateBack();
    }
  };

  // 当前角色是否为说话者
  const currentDialogue = actData.dialogues[dialogIndex];
  const isTalking = (name: string) => currentDialogue?.speaker === name;

  if (showCelebration) {
    return <CelebrationOverlay onBack={() => Taro.navigateBack()} />;
  }

  return (
    <View className={styles.page}>
      {/* Act 标题展示 */}
      {showActTitle && (
        <View className={styles.actTitleScreen}>
          <Text className={styles.actTitleMain}>{actData.title}</Text>
          <Text className={styles.actTitleSub}>{actData.subtitle}</Text>
          <View className={styles.actTitleDecor}>
            {[...Array(5)].map((_, i) => (
              <Text key={i} className={styles.actTitleStar} style={{ animationDelay: `${i * 0.2}s` }}>✦</Text>
            ))}
          </View>
        </View>
      )}

      {/* 场景背景 */}
      <SceneBackground sceneBg={actData.sceneBg} elements={actData.sceneElements} />

      {/* 场景切换动画 */}
      {sceneTransition && (
        <View className={styles.sceneTransition}>
          <View className={styles.transitionCurtain} />
        </View>
      )}

      {/* 角色区 */}
      {!showGame && !showActTitle && !sceneTransition && (
        <View className={styles.charactersStage}>
          {actData.characters.map((char, idx) => (
            <AnimatedCharacter
              key={idx}
              name={char.name}
              expression={char.expression}
              position={char.position as 'left' | 'right'}
              isTalking={isTalking(char.name)}
            />
          ))}
        </View>
      )}

      {/* 对话区 */}
      {!showGame && !showActTitle && !sceneTransition && currentDialogue && (
        <View className={styles.dialogueArea}>
          <View className={styles.dialogueBox}>
            <Text className={styles.dialogueSpeaker}>
              {currentDialogue.speaker === 'bookSpirit' ? '📚 书灵' :
               currentDialogue.speaker === 'player' ? '🧑‍🎓 你' : '🎭 旁白'}
            </Text>
            <TypewriterText
              text={currentDialogue.text}
              onComplete={handleDialogComplete}
              speed={35}
            />
          </View>
        </View>
      )}

      {/* 游戏区 */}
      {showGame && !sceneTransition && (
        <View className={styles.gameArea}>
          {actData.gameType === 'click' && (
            <View className={styles.clickStart}>
              <View className={styles.clickIcon}>
                <Text className={styles.clickEmoji}>📚</Text>
              </View>
              <Text className={styles.clickTitle}>准备就绪</Text>
              <Text className={styles.clickDesc}>你已了解图书馆的基本布局，准备好了吗？</Text>
              <View className={styles.clickBtn} onClick={() => handleGameComplete(true)}>
                <Text className={styles.clickBtnText}>开始挑战 →</Text>
              </View>
            </View>
          )}
          {actData.gameType === 'sort' && <SortGame onComplete={handleGameComplete} />}
          {actData.gameType === 'maze' && <MazeGame onComplete={handleGameComplete} />}
          {actData.gameType === 'collect' && (
            <CollectGame target={actData.gameConfig?.target || 5} onComplete={handleGameComplete} />
          )}
        </View>
      )}

      {/* 进度条 */}
      <View className={styles.progressBarTop}>
        <View className={styles.progressTrack}>
          <View className={styles.progressFill} style={{ width: `${(currentAct / ACTS.length) * 100}%` }} />
        </View>
        <Text className={styles.progressLabel}>第 {currentAct}/{ACTS.length} 幕</Text>
      </View>
    </View>
  );
}
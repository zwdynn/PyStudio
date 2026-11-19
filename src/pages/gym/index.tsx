import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useGameStore } from '@/stores/gameStore';
import styles from './index.module.scss';

const ACTS = [
  {
    id: 1,
    title: '第一幕：体育馆的召唤',
    subtitle: '初次踏入神秘的体育馆',
    background: 'linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)',
    content: [
      { speaker: '旁白', text: '阳光明媚的午后，你来到了学校的体育馆。这是一个充满活力的地方，各种运动设施一应俱全。' },
      { speaker: '你', text: '哇，体育馆好大啊！听说这里藏着很多秘密...' },
      { speaker: '神秘声音', text: '欢迎来到体育馆，新生！我是这里的守护者。要了解体育馆的秘密，你需要通过四个挑战。' },
      { speaker: '守护者', text: '准备好了吗？让我们开始吧！' }
    ],
    task: '点击开始探索',
    gameType: 'click',
    target: 1,
    reward: '获得体育馆入场券'
  },
  {
    id: 2,
    title: '第二幕：体能挑战',
    subtitle: '测试你的运动能力',
    background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
    content: [
      { speaker: '守护者', text: '第一关是体能挑战！体育馆有很多运动区域，你需要了解它们的位置。' },
      { speaker: '守护者', text: '请在3秒内找到正确的运动区域图标！' }
    ],
    task: '快速选择正确的运动图标',
    gameType: 'quiz',
    quiz: {
      question: '哪个是篮球运动的图标？',
      options: ['⚽', '🏀', '🏈', '⚾'],
      answer: 1
    },
    target: 3,
    reward: '解锁篮球馆区域'
  },
  {
    id: 3,
    title: '第三幕：团队合作',
    subtitle: '学会与他人协作',
    background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
    content: [
      { speaker: '守护者', text: '体育馆不仅是运动的地方，更是团队合作的舞台。' },
      { speaker: '守护者', text: '请在规定时间内点击屏幕，模拟团队协作的默契度！' }
    ],
    task: '在10秒内尽可能多地点击',
    gameType: 'clicker',
    target: 20,
    reward: '获得团队合作徽章'
  },
  {
    id: 4,
    title: '第四幕：体育馆的秘密',
    subtitle: '揭开最后的真相',
    background: 'linear-gradient(180deg, #EC4899 0%, #DB2777 100%)',
    content: [
      { speaker: '守护者', text: '恭喜你通过了所有挑战！现在我要告诉你体育馆的秘密。' },
      { speaker: '守护者', text: '体育馆不仅是锻炼身体的地方，更是培养意志、结交朋友的场所。每一滴汗水都是成长的印记。' },
      { speaker: '你', text: '我明白了！谢谢守护者！' },
      { speaker: '守护者', text: '去吧，新生！探索更多校园的奥秘吧！' }
    ],
    task: '完成体育馆探索',
    gameType: 'finish',
    reward: '体育馆探索完成'
  }
];

interface DialogBoxProps {
  speaker: string;
  text: string;
  onComplete: () => void;
}

function DialogBox({ speaker, text, onComplete }: DialogBoxProps) {
  return (
    <View className={styles.dialogBox}>
      <Text className={styles.speaker}>{speaker}</Text>
      <Text className={styles.dialogText}>{text}</Text>
      <View className={styles.nextBtn} onClick={onComplete}>
        <Text className={styles.nextText}>继续 →</Text>
      </View>
    </View>
  );
}

interface ClickerGameProps {
  target: number;
  timeLimit: number;
  onComplete: (success: boolean) => void;
}

function ClickerGame({ target, timeLimit, onComplete }: ClickerGameProps) {
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete(count >= target);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, count, target, onComplete]);

  const handleClick = () => {
    setCount(prev => prev + 1);
  };

  return (
    <View className={styles.clickerGame}>
      <Text className={styles.gameTitle}>团队合作挑战</Text>
      <Text className={styles.gameSubtitle}>快速点击屏幕！</Text>
      <View className={styles.clickerStats}>
        <Text className={styles.statItem}>次数: {count} / {target}</Text>
        <Text className={styles.statItem}>时间: {timeLeft}s</Text>
      </View>
      <View className={styles.clickArea} onClick={handleClick}>
        <Text className={styles.clickHint}>点击这里！</Text>
      </View>
    </View>
  );
}

interface QuizGameProps {
  question: string;
  options: string[];
  answer: number;
  onComplete: (success: boolean) => void;
}

function QuizGame({ question, options, answer, onComplete }: QuizGameProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelected(index);
    setShowResult(true);
    setTimeout(() => {
      onComplete(index === answer);
    }, 1000);
  };

  return (
    <View className={styles.quizGame}>
      <Text className={styles.gameTitle}>知识问答</Text>
      <Text className={styles.question}>{question}</Text>
      <View className={styles.optionsList}>
        {options.map((option, index) => (
          <View
            key={index}
            className={`${styles.option} ${selected === index ? (index === answer ? styles.correct : styles.wrong) : ''}`}
            onClick={() => handleSelect(index)}
          >
            <Text className={styles.optionText}>{option}</Text>
          </View>
        ))}
      </View>
      {showResult && selected !== null && (
        <Text className={selected === answer ? styles.resultSuccess : styles.resultFail}>
          {selected === answer ? '✓ 正确！' : '✗ 错误！'}
        </Text>
      )}
    </View>
  );
}

export default function GymPage() {
  const { currentAct, setCurrentAct, progressAct, completeLevel, levels } = useGameStore();
  const [dialogIndex, setDialogIndex] = useState(0);
  const [showGame, setShowGame] = useState(false);
  const [gameResult, setGameResult] = useState<boolean | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [currentActData, setCurrentActData] = useState(ACTS[0]);

  const level = levels.find(l => l.id === 'gym');
  const startingAct = level?.currentAct || 1;

  useEffect(() => {
    setCurrentActData(ACTS[currentAct - 1]);
    setDialogIndex(0);
    setShowGame(false);
    setGameResult(null);
    setShowReward(false);
  }, [currentAct]);

  useEffect(() => {
    setCurrentAct(startingAct);
  }, []);

  const handleDialogComplete = () => {
    if (dialogIndex < currentActData.content.length - 1) {
      setDialogIndex(prev => prev + 1);
    } else {
      setShowGame(true);
    }
  };

  const handleGameComplete = (success: boolean) => {
    setGameResult(success);
    if (success) {
      setShowReward(true);
      if (currentAct < ACTS.length) {
        progressAct('gym');
      } else {
        completeLevel('gym');
      }
    }
  };

  const handleNextAct = () => {
    if (currentAct < ACTS.length) {
      setCurrentAct(currentAct + 1);
    } else {
      Taro.showToast({ title: '恭喜完成体育馆关卡！', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 2000);
    }
  };

  const handleRetry = () => {
    setShowGame(false);
    setGameResult(null);
    setDialogIndex(currentActData.content.length - 1);
  };

  return (
    <View className={styles.page} style={{ background: currentActData.background }}>
      <View className={styles.actHeader}>
        <Text className={styles.actTitle}>{currentActData.title}</Text>
        <Text className={styles.actSubtitle}>{currentActData.subtitle}</Text>
        <View className={styles.progressBar}>
          <View className={styles.progressFill} style={{ width: `${(currentAct / ACTS.length) * 100}%` }}></View>
        </View>
        <Text className={styles.progressText}>第 {currentAct} / {ACTS.length} 幕</Text>
      </View>

      <View className={styles.contentArea}>
        {!showGame && !showReward && (
          <DialogBox
            speaker={currentActData.content[dialogIndex].speaker}
            text={currentActData.content[dialogIndex].text}
            onComplete={handleDialogComplete}
          />
        )}

        {showGame && !showReward && gameResult === null && (
          <>
            {currentActData.gameType === 'click' && (
              <View className={styles.clickStartGame}>
                <Text className={styles.gameTask}>{currentActData.task}</Text>
                <View className={styles.startButton} onClick={() => handleGameComplete(true)}>
                  <Text className={styles.startText}>开始探索</Text>
                </View>
              </View>
            )}
            {currentActData.gameType === 'quiz' && currentActData.quiz && (
              <QuizGame
                question={currentActData.quiz.question}
                options={currentActData.quiz.options}
                answer={currentActData.quiz.answer}
                onComplete={handleGameComplete}
              />
            )}
            {currentActData.gameType === 'clicker' && (
              <ClickerGame
                target={currentActData.target}
                timeLimit={10}
                onComplete={handleGameComplete}
              />
            )}
            {currentActData.gameType === 'finish' && (
              <View className={styles.finishGame}>
                <Text className={styles.finishTitle}>🎉 恭喜完成！</Text>
                <Text className={styles.finishText}>你已成功完成体育馆的所有挑战！</Text>
                <View className={styles.finishButton} onClick={() => handleGameComplete(true)}>
                  <Text className={styles.finishTextBtn}>领取奖励</Text>
                </View>
              </View>
            )}
          </>
        )}

        {showReward && (
          <View className={styles.rewardBox}>
            <Text className={styles.rewardIcon}>🏆</Text>
            <Text className={styles.rewardTitle}>挑战成功！</Text>
            <Text className={styles.rewardText}>{currentActData.reward}</Text>
            <View className={styles.nextButton} onClick={handleNextAct}>
              <Text className={styles.nextBtnText}>
                {currentAct < ACTS.length ? '下一幕 →' : '返回地图'}
              </Text>
            </View>
          </View>
        )}

        {gameResult === false && (
          <View className={styles.failBox}>
            <Text className={styles.failIcon}>😢</Text>
            <Text className={styles.failTitle}>挑战失败</Text>
            <Text className={styles.failText}>别灰心，再试一次吧！</Text>
            <View className={styles.retryButton} onClick={handleRetry}>
              <Text className={styles.retryText}>重试</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
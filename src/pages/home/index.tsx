import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useGameStore } from '@/stores/gameStore'
import styles from './index.module.scss'

interface BuildingConfig {
  id: string
  name: string
  icon: string
  levelId: string
  desc: string
}

const BUILDINGS: BuildingConfig[] = [
  { id: 'library', name: '图书馆', icon: '📚', levelId: 'library', desc: '百年学府的知识殿堂，藏书百万卷，沉浸于书香墨韵之间。' },
  { id: 'gym', name: '体育馆', icon: '🏟️', levelId: 'gym', desc: '挥洒汗水的运动乐园，承办各类体育赛事和文艺活动。' },
  { id: 'canteen', name: '食堂', icon: '🍽️', levelId: 'canteen', desc: '美味汇聚的生活空间，各地特色美食应有尽有。' },
  { id: 'teaching', name: '食品学院', icon: '�', levelId: 'teaching', desc: '暗穗危机的召唤——守护稻田生机与食品安全，破解病菌难题，传承稻米之心。' },
  { id: 'dormitory', name: '宿舍区', icon: '🏠', levelId: 'dormitory', desc: '温馨舒适的家园港湾，同学们最温暖的落脚点。' },
]

const BANNER_TEXT = '🎉 新生季开启 · 图书馆本周延长开放至22点 · 体育馆免费开放 · 食堂新增特色窗口'

const POS_KEY = 'campus-map-positions-v4'

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  library: { x: 25, y: 72 },
  gym: { x: 48, y: 78 },
  canteen: { x: 58, y: 68 },
  teaching: { x: 72, y: 75 },
  dormitory: { x: 88, y: 70 },
}

function loadPositions() {
  try {
    const stored = Taro.getStorageSync(POS_KEY)
    if (stored) return typeof stored === 'string' ? JSON.parse(stored) : stored
  } catch (e) {}
  return DEFAULT_POSITIONS
}

function savePositions(positions: Record<string, { x: number; y: number }>) {
  try {
    Taro.setStorageSync(POS_KEY, positions)
  } catch (e) {}
}

const ZOOM = 1.0
const MIN_ZOOM = 1.0  // 最小可缩小到原始尺寸
const MAX_ZOOM = 3.0

export default function HomePage() {
  const { levels, setCurrentLevel, loginFromServer } = useGameStore()
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [editMode, setEditMode] = useState(false)
  const [positions, setPositions] = useState(loadPositions())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null)
  const mapPanRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number; moved: boolean } | null>(null)
  const [screenSize, setScreenSize] = useState({ w: 375, h: 667 })
  const [mapSize, setMapSize] = useState({ w: 469, h: 667 })
  const [selectedLevel, setSelectedLevel] = useState<BuildingConfig | null>(null)
  const [bannerOffset, setBannerOffset] = useState(0)
  const [bannerWidth, setBannerWidth] = useState(0)
  const [showInfoCard, setShowInfoCard] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(ZOOM)  // 跟踪当前缩放级别
  const baseMapSizeRef = useRef({ w: 469, h: 667 })  // 基础地图大小（ZOOM=1.5时）

  // 启动时连接后端服务器登录
  useEffect(() => {
    loginFromServer()
  }, [])

  useEffect(() => {
    Taro.getSystemInfo({
      success: (res) => {
        const sw = res.windowWidth
        const sh = res.windowHeight
        setScreenSize({ w: sw, h: sh })
        Taro.getImageInfo({
          src: '/assets/campus-map.jpg',
          success: (info) => {
            const ratio = info.width / info.height
            const mw = Math.round(sh * ratio * ZOOM)
            const mh = Math.round(sh * ZOOM)
            baseMapSizeRef.current = { w: mw, h: mh }  // 保存基础大小
            setMapSize({ w: mw, h: mh })
            setOffset({
              x: mw > sw ? -Math.round((mw - sw) / 2) : Math.round((sw - mw) / 2),
              y: -Math.round((mh - sh) / 2),
            })
          },
          fail: () => {
            baseMapSizeRef.current = { w: sw, h: sh }
            setMapSize({ w: sw, h: sh })
          },
        })
      },
    })
  }, [])

  // Animated scrolling banner
  useEffect(() => {
    if (bannerWidth === 0) return
    const textLen = BANNER_TEXT.length * 20
    const speed = 30
    let raf: number
    let last = performance.now()
    const animate = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setBannerOffset((prev) => {
        const next = prev - speed * dt
        return next < -textLen ? 0 : next
      })
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [bannerWidth])

  const clampOffset = useCallback(
    (x: number, y: number) => {
      const maxX = mapSize.w - screenSize.w
      const maxY = mapSize.h - screenSize.h
      const cx = maxX > 0 ? Math.max(-maxX, Math.min(0, x)) : Math.max(0, Math.min(-maxX, x))
      const cy = maxY > 0 ? Math.max(-maxY, Math.min(0, y)) : Math.max(0, Math.min(-maxY, y))
      return { x: cx, y: cy }
    },
    [mapSize.w, mapSize.h, screenSize.w, screenSize.h]
  )

  const handleMapTouchStart = (e: React.TouchEvent) => {
    if (draggingId) return
    const t = e.touches[0]
    mapPanRef.current = { x: t.clientX, y: t.clientY, offsetX: offset.x, offsetY: offset.y, moved: false }
  }

  const handleMapTouchMove = (e: React.TouchEvent) => {
    if (draggingId || !mapPanRef.current) return
    const t = e.touches[0]
    const dx = t.clientX - mapPanRef.current.x
    const dy = t.clientY - mapPanRef.current.y
    if (!mapPanRef.current.moved && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      mapPanRef.current.moved = true
    }
    const clamped = clampOffset(mapPanRef.current.offsetX + dx, mapPanRef.current.offsetY + dy)
    setOffset(clamped)
  }

  const handleMapTouchEnd = () => { mapPanRef.current = null }

  const handleMarkerTouchStart = (e: React.TouchEvent, id: string) => {
    e.stopPropagation()
    if (!editMode) return
    const t = e.touches[0]
    const pos = positions[id] || { x: 50, y: 50 }
    dragStartRef.current = { x: t.clientX, y: t.clientY, posX: pos.x, posY: pos.y }
    setDraggingId(id)
  }

  const handleMarkerTouchMove = (e: React.TouchEvent) => {
    if (!draggingId || !dragStartRef.current) return
    e.stopPropagation()
    const t = e.touches[0]
    const dx = t.clientX - dragStartRef.current.x
    const dy = t.clientY - dragStartRef.current.y
    const nx = dragStartRef.current.posX + (dx / mapSize.w) * 100
    const ny = dragStartRef.current.posY + (dy / mapSize.h) * 100
    setPositions((prev) => ({ ...prev, [draggingId]: { x: Math.max(2, Math.min(98, nx)), y: Math.max(2, Math.min(98, ny)) } }))
  }

  const handleMarkerTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation()
    if (draggingId) { savePositions(positions); setDraggingId(null); dragStartRef.current = null }
  }

  const handleMarkerClick = useCallback((levelId: string, unlocked: boolean, b: BuildingConfig) => {
    if (editMode) return
    if (mapPanRef.current?.moved) return
    setSelectedLevel(b)
    setShowInfoCard(true)
  }, [editMode])

  const handleEnterLevel = useCallback((levelId: string) => {
    setCurrentLevel(levelId)
    setSelectedLevel(null)
    setShowInfoCard(false)
    Taro.navigateTo({ url: `/pages/${levelId}/index` })
  }, [setCurrentLevel])

  const handleZoomIn = () => {
    const newZoom = Math.min(currentZoom + 0.3, MAX_ZOOM)
    if (newZoom === currentZoom) return
    const ratio = newZoom / currentZoom
    const mw = Math.round(baseMapSizeRef.current.w * (newZoom / ZOOM))
    const mh = Math.round(baseMapSizeRef.current.h * (newZoom / ZOOM))
    setMapSize({ w: mw, h: mh })
    const cx = screenSize.w / 2
    const cy = screenSize.h / 2
    const newOffsetX = offset.x * ratio - (cx * (ratio - 1))
    const newOffsetY = offset.y * ratio - (cy * (ratio - 1))
    setOffset(clampOffset(newOffsetX, newOffsetY))
    setCurrentZoom(newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(currentZoom - 0.3, MIN_ZOOM)
    if (newZoom === currentZoom) return
    const ratio = newZoom / currentZoom
    const mw = Math.round(baseMapSizeRef.current.w * (newZoom / ZOOM))
    const mh = Math.round(baseMapSizeRef.current.h * (newZoom / ZOOM))
    setMapSize({ w: mw, h: mh })
    const cx = screenSize.w / 2
    const cy = screenSize.h / 2
    const newOffsetX = offset.x * ratio - (cx * (ratio - 1))
    const newOffsetY = offset.y * ratio - (cy * (ratio - 1))
    setOffset(clampOffset(newOffsetX, newOffsetY))
    setCurrentZoom(newZoom)
  }

  const completedCount = levels.filter((l) => l.completed).length
  const totalCount = levels.length

  // Generate ambient particles for animation
  const ambientParticles = useMemo(() => {
    const particles = []
    for (let i = 0; i < 12; i++) {
      particles.push({
        id: i,
        type: i % 3 === 0 ? 'star' : i % 3 === 1 ? 'dot' : 'firefly',
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 4 + Math.random() * 8,
        delay: Math.random() * 4,
        duration: 4 + Math.random() * 4,
      })
    }
    return particles
  }, [])

  // Light ray positions
  const lightRays = useMemo(() => [
    { id: 1, x: 15, y: 20, size: 200, opacity: 0.12 },
    { id: 2, x: 70, y: 15, size: 180, opacity: 0.1 },
    { id: 3, x: 45, y: 60, size: 220, opacity: 0.08 },
  ], [])

  return (
    <View className={styles.page}>
      {/* Map layer */}
      <View
        className={styles.mapContainer}
        onTouchStart={handleMapTouchStart}
        onTouchMove={handleMapTouchMove}
        onTouchEnd={handleMapTouchEnd}
        onTouchCancel={handleMapTouchEnd}
      >
        <View
          className={styles.mapContent}
          style={{
            width: `${mapSize.w}px`,
            height: `${mapSize.h}px`,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
          }}
        >
          <Image className={styles.mapImage} src='/assets/campus-map.jpg' mode='aspectFill' />

          {/* Animated light rays for atmosphere */}
          {lightRays.map((ray) => (
            <View
              key={`ray-${ray.id}`}
              className={styles.lightRay}
              style={{
                left: `${ray.x}%`,
                top: `${ray.y}%`,
                width: `${ray.size}rpx`,
                height: `${ray.size}rpx`,
                opacity: ray.opacity,
              }}
            >
              <View className={styles.lightRayInner} />
            </View>
          ))}

          {/* Floating ambient particles */}
          {ambientParticles.map((p) => (
            <View
              key={`particle-${p.id}`}
              className={`${styles.particle} ${
                p.type === 'star' ? styles.particleStar :
                p.type === 'firefly' ? styles.firefly :
                styles.particleDot
              }`}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size * 2}rpx`,
                height: `${p.size * 2}rpx`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                backgroundColor: p.type === 'firefly' ? '#FFE55C' :
                  p.type === 'star' ? 'transparent' : '#FFFFFF',
                boxShadow: p.type === 'firefly' ? '0 0 12rpx 4rpx rgba(255, 229, 92, 0.6)' :
                  p.type === 'star' ? 'none' : '0 0 8rpx 2rpx rgba(255, 255, 200, 0.5)',
              }}
            >
              {p.type === 'star' && (
                <Text style={{ fontSize: `${p.size * 2}rpx`, lineHeight: 1 }}>✨</Text>
              )}
            </View>
          ))}

          {/* Glow spots on map */}
          <View
            className={styles.glowSpot}
            style={{
              left: '25%',
              top: '35%',
              width: '120rpx',
              height: '120rpx',
              background: 'radial-gradient(circle, rgba(255, 255, 200, 0.4) 0%, transparent 70%)',
              animationDelay: '0s',
            }}
          />
          <View
            className={styles.glowSpot}
            style={{
              left: '65%',
              top: '45%',
              width: '150rpx',
              height: '150rpx',
              background: 'radial-gradient(circle, rgba(100, 200, 255, 0.3) 0%, transparent 70%)',
              animationDelay: '1.5s',
            }}
          />
          <View
            className={styles.glowSpot}
            style={{
              left: '45%',
              top: '70%',
              width: '100rpx',
              height: '100rpx',
              background: 'radial-gradient(circle, rgba(255, 200, 150, 0.35) 0%, transparent 70%)',
              animationDelay: '3s',
            }}
          />

          {BUILDINGS.map((b) => {
            const level = levels.find((l) => l.id === b.levelId)
            const unlocked = level?.unlocked ?? false
            const completed = level?.completed ?? false
            const pos = positions[b.id] || { x: 50, y: 50 }

            return (
              <View
                key={b.id}
                className={`${styles.marker} ${!unlocked ? styles.markerLocked : ''} ${editMode ? styles.markerEditable : ''} ${completed ? styles.markerDone : unlocked ? styles.markerActive : ''}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                onTouchStart={(e) => handleMarkerTouchStart(e, b.id)}
                onTouchMove={handleMarkerTouchMove}
                onTouchEnd={handleMarkerTouchEnd}
                onTouchCancel={handleMarkerTouchEnd}
                onClick={() => handleMarkerClick(b.levelId, unlocked, b)}
              >
                {/* Pulse ring */}
                {!editMode && unlocked && <View className={styles.markerPulse} />}

                <View className={`${styles.markerDot} ${completed ? styles.dotDone : unlocked ? styles.dotActive : styles.dotLocked}`}>
                  {completed && <Text className={styles.dotCheck}>✓</Text>}
                  {!completed && unlocked && <Text className={styles.dotIcon}>{b.icon}</Text>}
                  {!unlocked && <Text className={styles.dotLock}>🔒</Text>}
                </View>
                {/* Ripple effect for completed markers */}
                {completed && !editMode && (
                  <>
                    <View className={styles.ripple} style={{ animationDelay: '0s' }} />
                    <View className={styles.ripple} style={{ animationDelay: '1s' }} />
                    <View className={styles.ripple} style={{ animationDelay: '2s' }} />
                  </>
                )}
                <View className={styles.markerLabel}>
                  <Text className={styles.markerLabelText}>{b.name}</Text>
                </View>
              </View>
            )
          })}
        </View>
      </View>

      {/* Top bar */}
      <View className={styles.topBar}>
        <View className={styles.topBarLeft} onClick={() => Taro.navigateBack()}>
          <Text className={styles.topBackIcon}>←</Text>
        </View>
        <View className={styles.topBarTitle}>
          <Text className={styles.topTitleMain}>天津科技大学</Text>
          <Text className={styles.topTitleSub}>
            {editMode ? '编辑模式' : '校园探索之旅'}
          </Text>
        </View>
        <View className={styles.topBarRight} onClick={() => {
          if (editMode) { savePositions(positions); setEditMode(false); Taro.showToast({ title: '已保存', icon: 'success' }) }
          else setEditMode(true)
        }}>
          <Text className={styles.topEditIcon}>{editMode ? '✓' : '✎'}</Text>
        </View>
      </View>

      {/* Scrolling banner */}
      {!editMode && (
        <View className={styles.bannerBar}>
          <View className={styles.bannerIcon}>
            <Text className={styles.bannerIconText}>📢</Text>
          </View>
          <View className={styles.bannerTrack}>
            <View
              className={styles.bannerText}
              style={{ transform: `translateX(${bannerOffset}px)` }}
              onLayout={(e) => setBannerWidth(e.detail.width)}
            >
              <Text>{BANNER_TEXT}</Text>
            </View>
          </View>
          <View className={styles.bannerClose} onClick={() => {}}>
            <Text className={styles.bannerCloseText}>✕</Text>
          </View>
        </View>
      )}

      {/* Progress */}
      {!editMode && (
        <View className={styles.progressWrap}>
          <View className={styles.progressTrack}>
            <View className={styles.progressFill} style={{ width: `${(completedCount / totalCount) * 100}%` }} />
          </View>
          <Text className={styles.progressLabel}>{completedCount} / {totalCount}</Text>
        </View>
      )}

      {/* Right side zoom controls */}
      {!editMode && (
        <View className={styles.sideControls}>
          <View className={styles.sideBtn} onClick={handleZoomIn}>
            <Text className={styles.sideBtnText}>+</Text>
          </View>
          <View className={styles.sideBtn} onClick={handleZoomOut}>
            <Text className={styles.sideBtnText}>−</Text>
          </View>
          <View className={styles.sideBtn} onClick={() => { Taro.showToast({ title: '定位功能开发中', icon: 'none' }) }}>
            <Text className={styles.sideBtnIcon}>📍</Text>
          </View>
        </View>
      )}

      {/* Edit bar */}
      {editMode && (
        <View className={styles.editBar}>
          <Text className={styles.editHint}>拖动按钮对齐图中文字位置，调好后点✓保存</Text>
          <View className={styles.editReset} onClick={() => { setPositions(DEFAULT_POSITIONS); savePositions(DEFAULT_POSITIONS) }}>
            <Text className={styles.editResetText}>重置</Text>
          </View>
        </View>
      )}

      {/* 位置数据显示（编辑模式下） */}
      {editMode && (
        <View className={styles.posDebug}>
          <Text className={styles.posDebugText}>
            {JSON.stringify(positions)}
          </Text>
        </View>
      )}

      {/* Info card bottom sheet */}
      {selectedLevel && !editMode && showInfoCard && (
        <View className={styles.infoOverlay} onClick={() => setShowInfoCard(false)}>
          <View className={styles.infoCard} onClick={(e) => e.stopPropagation()}>
            <View className={styles.infoCardHandle} />
            <View className={styles.infoCardHeader}>
              <View className={styles.infoCardIconWrap}>
                <Text className={styles.infoCardIcon}>{selectedLevel.icon}</Text>
              </View>
              <View className={styles.infoCardTitleWrap}>
                <Text className={styles.infoCardTitle}>{selectedLevel.name}</Text>
                <Text className={styles.infoCardTag}>校园打卡点</Text>
              </View>
              <View className={styles.infoCardClose} onClick={() => setShowInfoCard(false)}>
                <Text className={styles.infoCardCloseIcon}>✕</Text>
              </View>
            </View>
            <Text className={styles.infoCardDesc}>{selectedLevel.desc}</Text>
            <View className={styles.infoCardActions}>
              <View className={styles.infoCardBtn} onClick={() => handleEnterLevel(selectedLevel.levelId)}>
                <Text className={styles.infoCardBtnText}>进入探索 →</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Bottom level cards */}
      <View className={styles.bottomSheet}>
        <ScrollView className={styles.bottomScroll} scrollX enableFlex>
          {levels.map((level) => {
            const b = BUILDINGS.find((b) => b.levelId === level.id)
            return (
              <View
                key={level.id}
                className={`${styles.levelCard} ${!level.unlocked ? styles.levelCardLocked : ''}`}
                onClick={() => {
                  setSelectedLevel(b!)
                  setShowInfoCard(true)
                }}
              >
                <View className={`${styles.levelCardIcon} ${level.completed ? styles.iconDone : ''}`}>
                  {level.completed ? '✓' : b?.icon}
                </View>
                <Text className={styles.levelCardName}>{level.name}</Text>
                <Text className={styles.levelCardStatus}>
                  {level.completed ? '已完成' : '可挑战'}
                </Text>
              </View>
            )
          })}
        </ScrollView>
      </View>
    </View>
  )
}

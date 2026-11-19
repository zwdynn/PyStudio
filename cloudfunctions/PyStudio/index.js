/**
 * PyStudio 云函数 —— 微信云开发统一后端网关
 *
 * 调用方式（小程序端）：
 *   wx.cloud.callFunction({ name: 'PyStudio', data: { action: 'login', nickname: '张三' } })
 *
 * 身份识别：
 *   一律使用 cloud.getWXContext().OPENID（微信在小程序调用时注入，客户端无法伪造），
 *   客户端不需要、也不允许传 openid。
 *
 * 统一返回结构：
 *   { code: 0, msg: '...', data: {...} }        业务成功
 *   { code: 非0, msg: '错误说明', data?: {...} }  业务失败
 *
 * 支持的 action：
 *   health            健康检查（不需要登录）
 *   login             登录 / 自动注册，返回用户信息 + 全部关卡进度
 *   getUserInfo       获取当前用户信息与进度
 *   saveProgress      保存单个关卡进度
 *   saveAllProgress   批量保存进度（本地进度一次性上云）
 *   resetProgress     重置当前用户全部进度
 *   submitFeedback    提交意见反馈
 *   getRanking        探索排行榜
 *   管理端（请求带 admin_password 时自动进入，子动作用 op 指定）：
 *     list / ban / unban / user / stats / feedbacks / resolveFeedback
 */

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// ======================= 配置 =======================

const C_USERS = 'users'
const C_PROGRESS = 'game_progress'
const C_FEEDBACKS = 'feedbacks'

// 必须在云开发控制台手动创建的集合，缺失时返回明确提示而不是 -502005
const REQUIRED_COLLECTIONS = [C_USERS, C_PROGRESS, C_FEEDBACKS]

// 管理员密码：推荐在「云开发控制台 → 云函数 → PyStudio → 函数配置 → 环境变量」设置
// 变量名 ADMIN_PASSWORD；未设置时使用下面的默认值（请务必修改）
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2026'

// 关卡定义（与服务端一致，服务端是唯一权威，客户端只做展示）
const LEVELS = [
  { id: 'library', name: '图书馆', totalActs: 4 },
  { id: 'gym', name: '体育馆', totalActs: 4 },
  { id: 'canteen', name: '食堂', totalActs: 3 },
  { id: 'teaching', name: '食品学院', totalActs: 4 },
  { id: 'dormitory', name: '宿舍区', totalActs: 3 }
]

// ======================= 工具函数 =======================

const ok = (data = null, msg = 'ok') => ({ code: 0, msg, data })
const fail = (code, msg, data) => (data === undefined ? { code, msg } : { code, msg, data })

const clampInt = (value, min, max, fallback) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

const sanitizeText = (value, max = 20) =>
  String(value === undefined || value === null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max)

const sanitizeAvatar = (value) => {
  const s = sanitizeText(value, 512)
  if (!s) return ''
  // 只接受 https/http 图片地址，或云存储 fileID（cloud://）
  if (!/^(https?:\/\/|cloud:\/\/)/i.test(s)) return ''
  return s
}

const isMissingCollection = (err) => {
  const msg = String((err && (err.errMsg || err.message)) || '')
  return msg.indexOf('collection not exists') >= 0 || msg.indexOf('-502005') >= 0
}

let collectionsReady = false

// 集合不存在时先尝试自动创建，失败再给人话提示（避免只看到 -502005）
const ensureCollections = async () => {
  if (collectionsReady) return
  for (const name of REQUIRED_COLLECTIONS) {
    try {
      await db.collection(name).limit(1).get()
    } catch (err) {
      if (!isMissingCollection(err)) continue
      try {
        await db.createCollection(name)
        console.log(`[PyStudio] 集合 ${name} 不存在，已自动创建`)
      } catch (createErr) {
        const reason = (createErr && (createErr.errMsg || createErr.message)) || '未知原因'
        const e = new Error(
          `云数据库集合 "${name}" 不存在，自动创建失败（${reason}），请手动在「云开发控制台 → 数据库」创建`
        )
        e.collection = name
        throw e
      }
    }
  }
  collectionsReady = true
}

// ======================= 数据读取 =======================

const levelDef = (id) => LEVELS.find((l) => l.id === id) || null

const buildLevels = (docs) => {
  const list = docs || []
  return LEVELS.map((def) => {
    const doc = list.find((d) => d && d.levelId === def.id)
    const completed = !!(doc && doc.completed)
    return {
      id: def.id,
      name: def.name,
      unlocked: true,
      completed,
      currentAct: completed ? def.totalActs : clampInt(doc && doc.currentAct, 1, def.totalActs, 1),
      totalActs: def.totalActs
    }
  })
}

const computeStats = (levels) => {
  const completedCount = levels.filter((l) => l.completed).length
  const actSum = levels.reduce((sum, l) => sum + (l.completed ? l.totalActs : l.currentAct) - 1, 0)
  return {
    completedCount,
    totalLevels: levels.length,
    score: completedCount * 100 + actSum * 10
  }
}

const findUser = async (openid) => {
  const { data } = await db.collection(C_USERS).where({ _id: openid }).limit(1).get()
  return (data && data[0]) || null
}

const getProgressDocs = async (openid) => {
  const { data } = await db.collection(C_PROGRESS).where({ openid }).limit(100).get()
  return data || []
}

// 重新统计用户总分并同步到 users 表
const refreshStats = async (openid) => {
  const docs = await getProgressDocs(openid)
  const levels = buildLevels(docs)
  const stats = computeStats(levels)
  await db.collection(C_USERS).doc(openid).update({
    data: {
      score: stats.score,
      completedCount: stats.completedCount,
      updateTime: db.serverDate()
    }
  })
  return { levels, stats }
}

/**
 * 写入单个关卡进度
 * _id 用 openid__levelId，天然幂等，不会产生重复记录。
 * 注意：云函数里 add() 不会自动写入 _openid，所以这里统一使用自定义 openid 字段。
 */
const upsertProgress = async (openid, payload) => {
  const def = levelDef(payload.levelId)
  if (!def) return false

  const docId = `${openid}__${def.id}`
  const incomingCompleted = !!payload.completed
  const incomingAct = incomingCompleted ? def.totalActs : clampInt(payload.currentAct, 1, def.totalActs, 1)

  const { data: existing } = await db.collection(C_PROGRESS).where({ _id: docId }).limit(1).get()

  if (existing && existing.length) {
    const prev = existing[0]
    // 进度只进不退，避免网络乱序把已完成的关卡打回未完成
    const nextCompleted = !!(prev.completed || incomingCompleted)
    const nextAct = nextCompleted
      ? def.totalActs
      : Math.max(clampInt(prev.currentAct, 1, def.totalActs, 1), incomingAct)

    await db.collection(C_PROGRESS).doc(docId).update({
      data: {
        levelName: def.name,
        completed: nextCompleted,
        currentAct: nextAct,
        totalActs: def.totalActs,
        updateTime: db.serverDate()
      }
    })
  } else {
    await db.collection(C_PROGRESS).doc(docId).set({
      data: {
        openid,
        levelId: def.id,
        levelName: def.name,
        completed: incomingCompleted,
        currentAct: incomingAct,
        totalActs: def.totalActs,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
  }
  return true
}

// ======================= 业务处理 =======================

const handleLogin = async (event, openid) => {
  const user = await findUser(openid)

  if (user && user.is_ban === true) {
    return fail(403, '账号已被封禁', { ban_reason: user.ban_reason || '' })
  }

  const nickname =
    sanitizeText(event.nickname, 20) || (user && user.nickname) || `探索者_${openid.slice(-6)}`
  const avatar = sanitizeAvatar(event.avatar) || (user && user.avatar) || ''

  let isNew = false

  if (!user) {
    isNew = true
    await db.collection(C_USERS).doc(openid).set({
      data: {
        openid,
        nickname,
        avatar,
        score: 0,
        completedCount: 0,
        is_ban: false,
        ban_reason: '',
        loginCount: 1,
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        lastLoginTime: db.serverDate()
      }
    })
  } else {
    const upd = {
      nickname,
      updateTime: db.serverDate(),
      lastLoginTime: db.serverDate(),
      loginCount: _.inc(1)
    }
    if (avatar) upd.avatar = avatar
    await db.collection(C_USERS).doc(openid).update({ data: upd })
  }

  const docs = await getProgressDocs(openid)
  const levels = buildLevels(docs)
  const stats = computeStats(levels)

  return ok({ openid, nickname, avatar, levels, stats, isNew }, isNew ? '注册并登录成功' : '登录成功')
}

const handleGetUserInfo = async (event, openid) => {
  const user = await findUser(openid)
  if (!user) return fail(404, '用户不存在，请先登录')
  if (user.is_ban === true) {
    return fail(403, '账号已被封禁', { ban_reason: user.ban_reason || '' })
  }

  const docs = await getProgressDocs(openid)
  const levels = buildLevels(docs)

  return ok({
    openid,
    nickname: user.nickname || '',
    avatar: user.avatar || '',
    levels,
    stats: computeStats(levels),
    isNew: false
  })
}

const handleSaveProgress = async (event, openid) => {
  const user = await findUser(openid)
  if (!user) return fail(404, '用户不存在，请重新登录')
  if (user.is_ban === true) return fail(403, '账号已被封禁')

  if (!levelDef(event.levelId)) return fail(400, '未知关卡 levelId')

  await upsertProgress(openid, event)
  const { levels, stats } = await refreshStats(openid)
  return ok({ levels, stats }, '保存成功')
}

const handleSaveAllProgress = async (event, openid) => {
  const user = await findUser(openid)
  if (!user) return fail(404, '用户不存在，请重新登录')
  if (user.is_ban === true) return fail(403, '账号已被封禁')

  const incoming = Array.isArray(event.levels) ? event.levels.slice(0, 20) : []
  if (!incoming.length) return fail(400, '缺少 levels 数组')

  for (const item of incoming) {
    if (item && levelDef(item.levelId)) {
      await upsertProgress(openid, item)
    }
  }

  const { levels, stats } = await refreshStats(openid)
  return ok({ levels, stats }, '进度已同步')
}

const handleResetProgress = async (openid) => {
  const user = await findUser(openid)
  if (!user) return fail(404, '用户不存在，请重新登录')
  if (user.is_ban === true) return fail(403, '账号已被封禁')

  await db.collection(C_PROGRESS).where({ openid }).update({
    data: {
      completed: false,
      currentAct: 1,
      updateTime: db.serverDate()
    }
  })

  const { levels, stats } = await refreshStats(openid)
  return ok({ levels, stats }, '进度已重置')
}

const handleSubmitFeedback = async (event, openid) => {
  const content = sanitizeText(event.content, 500)
  if (!content) return fail(400, '反馈内容不能为空')

  const user = await findUser(openid)
  if (user && user.is_ban === true) return fail(403, '账号已被封禁')

  await db.collection(C_FEEDBACKS).add({
    data: {
      openid,
      nickname: (user && user.nickname) || '',
      contact: sanitizeText(event.contact, 50),
      content,
      status: 'pending',
      createTime: db.serverDate()
    }
  })

  return ok({ ok: true }, '反馈已提交，感谢你的建议')
}

const handleGetRanking = async (event, openid) => {
  const limit = clampInt(event.limit, 1, 50, 20)
  const { data } = await db
    .collection(C_USERS)
    .orderBy('score', 'desc')
    .orderBy('updateTime', 'asc')
    .limit(limit)
    .get()

  const list = (data || []).map((u, index) => ({
    rank: index + 1,
    nickname: u.nickname || '匿名探索者',
    avatar: u.avatar || '',
    score: u.score || 0,
    completedCount: u.completedCount || 0,
    isSelf: !!openid && u.openid === openid
  }))

  return ok({ list })
}

// ======================= 管理端 =======================

const handleAdmin = async (event) => {
  const sub = event.op || event.action

  if (!event.admin_password || String(event.admin_password) !== ADMIN_PASSWORD) {
    return fail(401, '管理员密码错误')
  }

  switch (sub) {
    case 'list': {
      const page = clampInt(event.page, 1, 10000, 1)
      const pageSize = clampInt(event.pageSize, 1, 100, 20)
      const keyword = sanitizeText(event.keyword, 30)

      let query = db.collection(C_USERS)
      if (keyword) {
        const safe = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const reg = db.RegExp({ regexp: safe, options: 'i' })
        query = query.where(_.or([{ nickname: reg }, { openid: reg }]))
      }

      const { total } = await query.count()
      const { data } = await query
        .orderBy('createTime', 'desc')
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .get()

      return ok({
        list: (data || []).map((u) => ({
          openid: u.openid || u._id,
          nickname: u.nickname || '',
          avatar: u.avatar || '',
          score: u.score || 0,
          completedCount: u.completedCount || 0,
          is_ban: u.is_ban === true,
          ban_reason: u.ban_reason || '',
          loginCount: u.loginCount || 0,
          createTime: u.createTime || null,
          lastLoginTime: u.lastLoginTime || null
        })),
        total,
        page,
        pageSize
      })
    }

    case 'ban': {
      const target = event.target_openid || event.openid
      if (!target) return fail(400, '缺少 openid')

      const user = await findUser(target)
      if (!user) return fail(404, '用户不存在')

      await db.collection(C_USERS).doc(target).update({
        data: {
          is_ban: true,
          ban_reason: sanitizeText(event.ban_reason || event.reason, 50) || '违规操作',
          updateTime: db.serverDate()
        }
      })
      return ok({ openid: target }, '已封禁')
    }

    case 'unban': {
      const target = event.target_openid || event.openid
      if (!target) return fail(400, '缺少 openid')

      const user = await findUser(target)
      if (!user) return fail(404, '用户不存在')

      await db.collection(C_USERS).doc(target).update({
        data: { is_ban: false, ban_reason: '', updateTime: db.serverDate() }
      })
      return ok({ openid: target }, '已解封')
    }

    case 'user': {
      const target = event.target_openid || event.openid
      if (!target) return fail(400, '缺少 openid')

      const user = await findUser(target)
      if (!user) return fail(404, '用户不存在')

      const docs = await getProgressDocs(target)
      const levels = buildLevels(docs)

      return ok({
        user: {
          openid: user.openid || user._id,
          nickname: user.nickname || '',
          avatar: user.avatar || '',
          score: user.score || 0,
          completedCount: user.completedCount || 0,
          is_ban: user.is_ban === true,
          ban_reason: user.ban_reason || '',
          createTime: user.createTime || null,
          lastLoginTime: user.lastLoginTime || null
        },
        levels,
        stats: computeStats(levels)
      })
    }

    case 'stats': {
      const [totalUsers, bannedUsers, pendingFeedback, completedProgress] = await Promise.all([
        db.collection(C_USERS).count(),
        db.collection(C_USERS).where({ is_ban: true }).count(),
        db.collection(C_FEEDBACKS).where({ status: 'pending' }).count(),
        db.collection(C_PROGRESS).where({ completed: true }).count()
      ])

      return ok({
        totalUsers: totalUsers.total,
        bannedUsers: bannedUsers.total,
        pendingFeedback: pendingFeedback.total,
        completedProgress: completedProgress.total
      })
    }

    case 'feedbacks': {
      const { data } = await db
        .collection(C_FEEDBACKS)
        .orderBy('createTime', 'desc')
        .limit(clampInt(event.pageSize, 1, 100, 30))
        .get()

      return ok({
        list: (data || []).map((f) => ({
          _id: f._id,
          openid: f.openid || '',
          nickname: f.nickname || '',
          contact: f.contact || '',
          content: f.content || '',
          status: f.status || 'pending',
          createTime: f.createTime || null
        }))
      })
    }

    case 'resolveFeedback': {
      const id = event.feedback_id || event.id
      if (!id) return fail(400, '缺少 feedback_id')

      await db.collection(C_FEEDBACKS).doc(id).update({
        data: { status: 'done', updateTime: db.serverDate() }
      })
      return ok({ _id: id }, '已标记为已处理')
    }

    default:
      return fail(400, `未知管理端操作：${sub || '(空)'}`)
  }
}

// ======================= 入口 =======================

const normalizeEvent = (event) => {
  let payload = event || {}
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch (e) {
      payload = {}
    }
  }
  // HTTP 触发器常见包装：{ body: '{"action":"list"}' }
  if (payload && typeof payload.body === 'string') {
    try {
      payload = JSON.parse(payload.body)
    } catch (e) {
      /* 保持原样 */
    }
  }
  return payload && typeof payload === 'object' ? payload : {}
}

exports.main = async (event) => {
  const payload = normalizeEvent(event)
  const action = payload.action || 'health'
  const wxContext = cloud.getWXContext() || {}
  const openid = wxContext.OPENID

  try {
    if (action === 'health') {
      return ok({
        openid: openid || null,
        appid: wxContext.APPID || null,
        collections: REQUIRED_COLLECTIONS,
        levels: LEVELS,
        time: Date.now()
      })
    }

    await ensureCollections()

    // 带管理密码的请求走管理端（HTTP 触发器没有 OPENID，靠密码鉴权）
    if (payload.admin_password || action === 'admin') {
      return await handleAdmin(payload)
    }

    if (!openid) {
      return fail(
        401,
        '未获取到 openid：请在小程序内通过 wx.cloud.callFunction 调用（HTTP 直接调用不支持登录类操作）'
      )
    }

    switch (action) {
      case 'login':
        return await handleLogin(payload, openid)
      case 'getUserInfo':
        return await handleGetUserInfo(payload, openid)
      case 'saveProgress':
        return await handleSaveProgress(payload, openid)
      case 'saveAllProgress':
        return await handleSaveAllProgress(payload, openid)
      case 'resetProgress':
        return await handleResetProgress(openid)
      case 'submitFeedback':
        return await handleSubmitFeedback(payload, openid)
      case 'getRanking':
        return await handleGetRanking(payload, openid)
      default:
        return fail(400, `未知 action：${action}`)
    }
  } catch (err) {
    console.error('[PyStudio]', action, err)
    if (err && err.collection) {
      return fail(500, err.message)
    }
    return fail(500, '服务器错误', { error: (err && err.message) || String(err) })
  }
}

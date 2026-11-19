import Taro from '@tarojs/taro'
import { CLOUD_ENV_ID, CLOUD_FUNCTION_NAME } from '../config/cloud'

export const isWeapp = process.env.TARO_ENV === 'weapp'

/** 云函数统一返回结构 */
export interface ApiResponse<T = any> {
  code: number
  msg?: string
  data?: T
}

/** 带业务错误码的异常，便于上层区分「被封禁 / 未登录」等情况 */
export class CloudError extends Error {
  code: number
  data?: any

  constructor(code: number, message: string, data?: any) {
    super(message)
    this.name = 'CloudError'
    this.code = code
    this.data = data
  }
}

let inited = false

/** 最近一次云调用失败的原文，供「云连接自检」展示（手机上看不到 console，只能这样暴露） */
let lastCloudError = ''

export function getLastCloudError(): string {
  return lastCloudError
}

export function clearLastCloudError() {
  lastCloudError = ''
}

/** 把 errCode / errMsg 拼成一句人能读的话 */
function describeError(err: any): string {
  if (!err) return '未知错误'
  const code = err.errCode !== undefined ? `[${err.errCode}] ` : ''
  const msg = err.errMsg || err.message || String(err)
  return `${code}${msg}`
}

/** 兼容取到 wx.cloud（Taro 在 weapp 下会代理，兜底直接读全局 wx） */
function getCloudApi(): any {
  const taroCloud = (Taro as any).cloud
  if (taroCloud) return taroCloud
  const g: any = typeof globalThis !== 'undefined' ? (globalThis as any) : {}
  return g.wx && g.wx.cloud ? g.wx.cloud : null
}

/**
 * 初始化云开发，必须在任何云调用之前执行一次。
 * 在 app.tsx 的 useLaunch 里已经调用过，这里再做幂等保护。
 */
export function initCloud(): boolean {
  if (!isWeapp) {
    console.warn('[Cloud] 非微信小程序环境，云开发不可用（H5 等平台请自行 mock）')
    return false
  }
  if (inited) return true

  const api = getCloudApi()
  if (!api) {
    console.error('[Cloud] 当前基础库不支持云开发，请使用 2.2.3 以上基础库')
    return false
  }

  try {
    api.init({
      env: CLOUD_ENV_ID,
      traceUser: true
    })
    inited = true
    console.log('[Cloud] 云开发初始化完成，环境：', CLOUD_ENV_ID)
    return true
  } catch (err) {
    console.error('[Cloud] 云开发初始化失败：', err)
    return false
  }
}

/**
 * 调用云函数（统一网关 PyStudio）
 *
 * @param action  业务动作，如 login / saveProgress
 * @param payload 业务参数（openid 由云函数从微信上下文读取，无需也不允许前端传）
 */
export async function callApi<T = any>(
  action: string,
  payload?: Record<string, any>
): Promise<T> {
  if (!isWeapp) {
    throw new CloudError(-1, '云开发仅支持微信小程序环境')
  }
  if (!initCloud()) {
    throw new CloudError(-1, '云开发初始化失败')
  }

  const api = getCloudApi()
  if (!api) {
    throw new CloudError(-1, '云开发不可用')
  }

  let res: any
  try {
    res = await api.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: { action, ...(payload || {}) }
    })
  } catch (err: any) {
    // 常见：云函数未部署 / 环境 ID 不对 / 未开通云开发
    console.error(`[Cloud] callFunction ${action} 失败：`, err)
    lastCloudError = `callFunction(${action}) ${describeError(err)}`
    throw new CloudError(-2, lastCloudError)
  }

  const result = res && (res.result as ApiResponse<T>)
  if (!result || typeof result.code !== 'number') {
    lastCloudError = `callFunction(${action}) 返回格式异常：${JSON.stringify(res && res.result).slice(0, 200)}`
    throw new CloudError(-3, '云函数返回格式异常，请检查 PyStudio 云函数是否已正确部署')
  }

  if (result.code !== 0) {
    lastCloudError = `${action} 业务失败 code=${result.code} msg=${result.msg || ''}`
    console.warn(`[Cloud] ${action} 业务失败：`, result.code, result.msg)
    throw new CloudError(result.code, result.msg || '请求失败', result.data)
  }

  lastCloudError = ''
  return result.data as T
}

/**
 * 云连接自检：把「环境 ID / 初始化 / 云函数 / 集合」四环逐个探一遍。
 * 手机上排查问题只靠这个 —— 每一项都带原始错误文本。
 */
export interface DiagnoseItem {
  name: string
  ok: boolean
  detail: string
}

export interface DiagnoseReport {
  envId: string
  items: DiagnoseItem[]
  openid: string
  appid: string
}

export async function diagnoseCloud(): Promise<DiagnoseReport> {
  const items: DiagnoseItem[] = []
  let openid = ''
  let appid = ''

  // ① 运行环境
  items.push({
    name: '运行环境',
    ok: isWeapp,
    detail: isWeapp ? '微信小程序（weapp）' : `当前是 ${process.env.TARO_ENV}，云开发仅 weapp 可用`
  })

  // ② 云开发 API 是否存在
  const api = getCloudApi()
  items.push({
    name: '云开发 API',
    ok: !!api,
    detail: api ? 'wx.cloud 可用' : '取不到 wx.cloud，基础库过低或未开通云开发'
  })
  if (!api) return { envId: CLOUD_ENV_ID, items, openid, appid }

  // ③ init 是否成功（强制重跑一次，拿到真实报错）
  let initOk = false
  let initDetail = ''
  try {
    api.init({ env: CLOUD_ENV_ID, traceUser: true })
    initOk = true
    inited = true
    initDetail = `已用环境 ${CLOUD_ENV_ID} 初始化`
  } catch (err: any) {
    clearLastCloudError()
    lastCloudError = `cloud.init ${describeError(err)}`
    initDetail = describeError(err)
  }
  items.push({ name: '云开发初始化', ok: initOk, detail: initDetail })

  // ④ 云函数是否可调用
  let fnOk = false
  let fnDetail = ''
  try {
    const res = await api.callFunction({
      name: CLOUD_FUNCTION_NAME,
      data: { action: 'health' }
    })
    const result: any = (res && res.result) || {}
    if (result.code === 0 && result.data) {
      fnOk = true
      openid = result.data.openid || ''
      appid = result.data.appid || ''
      fnDetail = `PyStudio 已部署，APPID=${appid || '空'}，OPENID=${openid || '空'}`
    } else {
      fnDetail = `返回异常：${JSON.stringify(result).slice(0, 160)}`
    }
  } catch (err: any) {
    clearLastCloudError()
    lastCloudError = `health ${describeError(err)}`
    fnDetail = describeError(err)
  }
  items.push({ name: '云函数 PyStudio', ok: fnOk, detail: fnDetail })

  // ⑤ 集合是否可读写（用 getUserInfo 探，失败说明集合缺失或无权限）
  if (fnOk && openid) {
    let colOk = false
    let colDetail = ''
    try {
      await callApi('getUserInfo', {})
      colOk = true
      colDetail = 'users / game_progress 可读写'
    } catch (err: any) {
      colDetail = err && err.message ? err.message : '读取失败'
    }
    items.push({ name: '数据库集合', ok: colOk, detail: colDetail })
  } else if (fnOk && !openid) {
    items.push({
      name: '数据库集合',
      ok: false,
      detail: 'OPENID 为空 —— 调用没有经过小程序身份，检查是否用 wx.cloud.callFunction'
    })
  }

  return { envId: CLOUD_ENV_ID, items, openid, appid }
}

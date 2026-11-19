# PyStudio · 校园探索之旅

天津科技大学校园探索类微信小程序：在地图上逛校园、按地点进入闯关剧情，进度通过微信云开发同步到云端。

- 前端：Taro 4 + React 18 + TypeScript + Zustand + Sass
- 后端：微信云开发（云函数 `PyStudio` + 云数据库，无自建服务器）
- 目标平台：微信小程序（`dist/` 为构建产物，`miniprogramRoot` 指向它）

## 功能

| 模块 | 说明 |
| --- | --- |
| 首页地图 | 校园手绘地图、缩放拖拽、地点热区、一键打卡 |
| 登录 | 头像 + 昵称注册，云端建档（`users`，`_id` 即 openid） |
| 关卡 | 图书馆 / 体育馆 / 食堂 / 食品学院 / 宿舍区，每关多幕剧情 |
| 目录与成就 | 通关进度、章节解锁状态 |
| 我的 | 云端昵称头像、手动同步进度、意见反馈、云连接自检 |
| 管理端 | 密码鉴权的用户列表、封禁/解封、统计、反馈处理 |

## 目录结构

```
src/
  pages/            页面（home 地图、login 登录、library/gym/canteen/teaching/dormitory 五个关卡、mine、admin 等）
  components/       通用组件
  stores/gameStore  全局状态（本地缓存 + 云端同步）
  services/cloud.ts 云开发调用层（初始化、统一 callApi、连接自检）
  config/cloud.ts   云开发环境 ID 配置（换环境只改这里）
  styles/           主题与 SCSS 变量
  assets/           地图与插画素材
cloudfunctions/
  PyStudio/         唯一云函数：按 action 路由的统一网关
scripts/
  optimize-assets.js  图片压缩（构建包体积超 2MB 时用）
```

## 本地运行

```bash
npm install
npm run build:weapp      # 一次性构建，产物在 dist/
npm run dev:weapp        # 开发时监听构建
```

用微信开发者工具导入**项目根目录**（`project.config.json` 已把 `miniprogramRoot` 指向 `dist/`），`appid` 换成自己的。

> Taro 4.1.9 在依赖里同时存在 ajv 6 / ajv 8 时，配置校验会卡死（进度条停在 0%、CPU 空转）。`build:weapp` 脚本已经加了 `--no-check`，手动执行 `npx taro build --type weapp` 时也要带上。

## 云开发部署

完整步骤见 [云开发部署说明.md](./云开发部署说明.md)，核心三步：

1. 云开发控制台创建 3 个集合：`users`、`game_progress`、`feedbacks`，权限「仅管理端可读写」（新版云函数也会自动创建）；
2. 右键 `cloudfunctions/PyStudio` →「上传并部署：云端安装依赖」，运行环境选 **Nodejs16.13**；
3. 改 `src/config/cloud.ts` 里的 `CLOUD_ENV_ID` 为自己的环境 ID，重新构建。

部署后在控制台用 `{ "action": "health" }` 测试云函数，返回 `code: 0` 即打通。

## 云函数接口

统一入口 `cloudfunctions/PyStudio`，按 `action` 路由，身份一律取 `cloud.getWXContext().OPENID`（前端不传、也无法伪造 openid）：

| action | 说明 |
| --- | --- |
| `health` | 健康检查，不需要登录 |
| `login` / `getUserInfo` | 登录注册 / 拉取用户与进度 |
| `saveProgress` / `saveAllProgress` | 保存单关 / 批量保存进度（幂等，进度只进不退） |
| `resetProgress` | 重置当前用户进度 |
| `submitFeedback` | 提交意见反馈 |
| `getRanking` | 探索排行榜 |
| `admin` | 管理端，需 `admin_password` + `op`（list / ban / unban / stats / feedbacks） |

数据模型：`users` 用 openid 作 `_id`（一人一条）；`game_progress` 用 `openid__levelId` 作 `_id`（天然幂等）。

## 常见问题

| 现象 | 原因 |
| --- | --- |
| 登录弹「云端连接失败」 | 弹窗里会写明具体原因；也可在「我的 → 云连接自检」逐环排查 |
| `env not exists` | `src/config/cloud.ts` 的环境 ID 与云开发控制台不一致 |
| `集合 "users" 不存在` | 集合没建，或在另一个环境里 |
| 上传报 80051 | 主包超 2MB，执行 `npm run optimize:assets` 并确认 `project.config.json` 里 `minified: true`、`uploadWithSourceMap: false` |

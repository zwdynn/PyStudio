/**
 * 图片资源压缩脚本
 *
 * 背景：小程序主包上限 2MB，本项目图片占了约 1MB，压缩后主包体积下降一半左右。
 *
 * 用法：
 *   npm run optimize:assets          # 压缩 src/assets（原图备份到 _assets_originals/）
 *   npm run optimize:assets -- --force  # 已备份过也重新压缩
 *
 * 规则：
 *   - jpg：宽度超过 1400px 的等比缩小到 1400px，mozjpeg 质量 72，渐进式
 *   - png：调色板量化（256 色）+ 最高压缩，保留透明通道
 *
 * 原图备份在项目根的 _assets_originals/，不会被 Taro 打进 dist（copy 只处理 src/assets）。
 */

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const ROOT = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'src', 'assets')
const BACKUP_DIR = path.join(ROOT, '_assets_originals')

const MAX_WIDTH = 1400
const JPG_QUALITY = 62
const PNG_QUALITY = 70

const force = process.argv.includes('--force')

const kb = (bytes) => `${(bytes / 1024).toFixed(0)}KB`

async function optimize(file) {
  const abs = path.join(SRC_DIR, file)
  const ext = path.extname(file).toLowerCase()
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return null

  const before = fs.statSync(abs).size
  const backup = path.join(BACKUP_DIR, file)

  // 备份原图（只备份一次，避免反复压缩导致画质持续劣化）
  if (!fs.existsSync(backup) || force) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
    if (!fs.existsSync(backup)) fs.copyFileSync(abs, backup)
  }

  const source = fs.existsSync(backup) ? backup : abs
  let pipeline = sharp(source)
  const meta = await pipeline.metadata()

  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true })
  }

  let buffer
  if (ext === '.png') {
    buffer = await pipeline
      .png({ palette: true, quality: PNG_QUALITY, compressionLevel: 9, effort: 10 })
      .toBuffer()
  } else {
    buffer = await pipeline
      .jpeg({ quality: JPG_QUALITY, mozjpeg: true, progressive: true })
      .toBuffer()
  }

  // 压缩没效果就保留原文件
  if (buffer.length >= before) {
    return { file, before, after: before, skipped: true }
  }

  fs.writeFileSync(abs, buffer)
  return { file, before, after: buffer.length }
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('找不到 src/assets')
    process.exit(1)
  }

  const files = fs.readdirSync(SRC_DIR).filter((f) => fs.statSync(path.join(SRC_DIR, f)).isFile())
  let totalBefore = 0
  let totalAfter = 0

  console.log('压缩前 → 压缩后')
  for (const file of files) {
    const r = await optimize(file)
    if (!r) continue
    totalBefore += r.before
    totalAfter += r.after
    const flag = r.skipped ? '（跳过，压缩无收益）' : ''
    console.log(`  ${file.padEnd(26)} ${kb(r.before).padStart(6)} → ${kb(r.after).padStart(6)} ${flag}`)
  }

  console.log(
    `\n合计：${kb(totalBefore)} → ${kb(totalAfter)}，节省 ${kb(totalBefore - totalAfter)}`
  )
  console.log(`原图备份：${path.relative(ROOT, BACKUP_DIR)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

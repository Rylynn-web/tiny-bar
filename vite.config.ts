import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const layoutPath = fileURLToPath(new URL('./src/config/layout.json', import.meta.url))

/**
 * 布局编辑器的保存接口：POST /__layout/save，把 { items } 写回 src/config/layout.json。
 * apply: 'serve' —— 只在开发服务器上存在，生产构建里没有这个接口。
 */
function layoutSavePlugin(): Plugin {
  let skipNextReload = false
  return {
    name: 'tavern-layout-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__layout/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('只接受 POST')
          return
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          try {
            const data = JSON.parse(body)
            const valid =
              Array.isArray(data?.items) &&
              data.items.every(
                (i: { id?: unknown; type?: unknown; position?: unknown; rotationY?: unknown }) =>
                  typeof i.id === 'string' &&
                  typeof i.type === 'string' &&
                  Array.isArray(i.position) &&
                  i.position.length === 3 &&
                  typeof i.rotationY === 'number',
              )
            const room = data.room
            const roomValid =
              room === undefined || (typeof room?.width === 'number' && typeof room?.depth === 'number')
            if (!valid || !roomValid)
              throw new Error('数据格式不对：需要 { room?: { width, depth }, items: [{ id, type, position: [x,y,z], rotationY }] }')
            // 每个物件一行，方便看 diff
            const lines = data.items.map((i: unknown) => `    ${JSON.stringify(i)}`).join(',\n')
            const roomLine = room ? `  "room": ${JSON.stringify({ width: room.width, depth: room.depth })},\n` : ''
            skipNextReload = true
            await writeFile(layoutPath, `{\n${roomLine}  "items": [\n${lines}\n  ]\n}\n`)
            res.end('ok')
          } catch (err) {
            res.statusCode = 400
            res.end(err instanceof Error ? err.message : String(err))
          }
        })
      })
    },
    // 编辑器自己保存时，页面里已经是最新状态，不要因为文件变化而重载（会丢掉撤销历史）
    handleHotUpdate(ctx) {
      if (ctx.file === layoutPath && skipNextReload) {
        skipNextReload = false
        return []
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), layoutSavePlugin()],
})

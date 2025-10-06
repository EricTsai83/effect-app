// 匯入跨平台檔案系統與路徑服務，以及 Effect 基礎建設
import { FileSystem, Path } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import type { PlatformError } from "@effect/platform/Error"
import { Console, Context, Effect, Layer } from "effect"

// 定義快取服務的 Tag；對外暴露 lookup 用於讀取指定 key 的字串內容
class Cache extends Context.Tag("Cache")<Cache, {
  readonly lookup: (key: string) => Effect.Effect<string, PlatformError>
}>() {}

// 建立快取服務的實作
const cacheLive = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const cacheDir = path.join("src", "day24", "cache")
  yield* fs.makeDirectory(cacheDir, { recursive: true })

  const lookup = (key: string) => fs.readFileString(path.join(cacheDir, key))

  return { lookup }
})

// 將實作包成 Layer，並提供 Node 檔案系統與 Path 依賴
const CacheLayer = Layer.effect(Cache, cacheLive).pipe(
  Layer.provide(NodeFileSystem.layer),
  Layer.provide(Path.layer)
)

// 主程式：取得快取服務 → 讀取資料 → 確保結尾換行 → 輸出到 stdout
const program = Effect.gen(function*() {
  const cache = yield* Cache
  const data = yield* cache.lookup("my-key")
  const line = data.endsWith("\n") ? data : `${data}\n`
  process.stdout.write(line)
}).pipe(Effect.catchAllCause((cause) => Console.log(cause)))

const runnable = program.pipe(Effect.provide(CacheLayer))

// 執行程式
Effect.runFork(runnable)

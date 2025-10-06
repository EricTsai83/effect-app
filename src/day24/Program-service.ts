// 匯入跨平台檔案系統與路徑與 Effect 主要 API
import { FileSystem, Path } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { Console, Effect, Layer } from "effect"

// 以 Effect.Service 定義快取服務，並在 effect 區塊中提供實作
class Cache extends Effect.Service<Cache>()("Cache", {
  effect: Effect.gen(function*() {
    // 取得檔案系統與路徑服務
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    // 快取目錄位置（專案內的 src/day24/cache）
    const cacheDir = path.join("src", "day24", "cache")
    const lookup = (key: string) => fs.readFileString(path.join(cacheDir, key))

    return { lookup }
  }),
  // 宣告此服務啟動時所需的外部依賴 Layer
  dependencies: [NodeFileSystem.layer, Path.layer]
}) {}

// 主程式：讀取快取並將結果輸出到 stdout（確保結尾換行）
const program = Effect.gen(function*() {
  const cache = yield* Cache
  const data = yield* cache.lookup("my-key")
  const line = data.endsWith("\n") ? data : `${data}\n`
  process.stdout.write(line)
}).pipe(Effect.catchAllCause((cause) => Console.log(cause)))

const runnable = program.pipe(Effect.provide(Cache.Default))

// 啟動程式
Effect.runFork(runnable)

// 測試：注入測試依賴(Injecting Test Dependencies)
{
  const FileSystemTest = FileSystem.layerNoop({
    readFileString: () => Effect.succeed("File Content...")
  })

  const TestLayer = Cache.DefaultWithoutDependencies.pipe(
    Layer.provide(FileSystemTest),
    Layer.provide(Path.layer)
  )

  const runnable = program.pipe(
    Effect.provide(TestLayer)
  )

  Effect.runFork(runnable)
}

// 測試：直接 mock服務本身(Mocking the Service Directly)
{
  // 建立假的 Cache
  const cache = new Cache({
    lookup: () => Effect.succeed("Cache Content...")
  })

  const runnable = program.pipe(Effect.provideService(Cache, cache))

  Effect.runFork(runnable)
}

{
  // Layer that includes all required dependencies
  //
  //      ┌─── Layer<Cache, PlatformError, never>
  //      ▼
  const _layer = Cache.Default

  // Layer without dependencies, requiring them to be provided externally
  //
  //      ┌─── Layer<Cache, PlatformError, FileSystem.FileSystem | Path.Path>
  //      ▼
  const _layerNoDeps = Cache.DefaultWithoutDependencies
}

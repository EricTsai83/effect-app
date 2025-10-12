import { Cause, Console, Duration, Effect, Exit } from "effect"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

// 情境（Scenario）
// - 觸發：執行此腳本。
// - 資源：在「腳本目錄」下的 `temp/` 建立唯一暫存子資料夾（upload-xxxxxx）。
// - 寫入：把 `content` 內容寫入該暫存夾中的 `${fileName}.txt`。
// - 前處理：模擬處理延遲 3000ms（例如：驗證、轉檔、縮圖）。
// - 成功：輸出完成訊息（目前為 Console.log），流程結束。
// - 失敗：回傳錯誤（Effect.fail），流程結束。
// - 清理：無論成功或失敗，皆會清理本次建立的暫存資料夾（ensuring / acquireRelease / scoped）。
// - 紀錄：
//   2) onExit：成功或失敗都記錄結果（目前範例保留為示意）。
//   3) onError：僅在錯誤時記錄詳細 Cause（目前範例保留為示意）。
//   4) acquireUseRelease：以 acquire/use/release 簡化資源生命週期（範例保留為示意）。
//   5) scoped：以 Scope 自動管理 acquire/release，並統一 onExit/onError 行為（目前啟用）。

// 模擬前處理
function simulatePreprocessing(filePath: string, fileContents: string, delayMs: number = 3000) {
  return Effect.gen(function*() {
    yield* Effect.tryPromise({
      try: async () => {
        await fs.writeFile(filePath, fileContents)
      },
      catch: (e) => new Error(`write file failed: ${String(e)}`)
    })
    yield* Effect.sleep(Duration.millis(delayMs))
  })
}
// 實際情境的資源：上傳暫存基底目錄
function getScriptDirectory() {
  return path.dirname(fileURLToPath(import.meta.url))
}

// 建立唯一暫存資料夾
function createUniqueUploadTempDirectory(baseTmpDir: string) {
  return Effect.tryPromise({
    try: async () => {
      const tempBaseDir = path.join(baseTmpDir, "temp")
      await fs.mkdir(tempBaseDir, { recursive: true })
      return await fs.mkdtemp(path.join(tempBaseDir, "upload-"))
    },
    catch: (e) => new Error(`mkdtemp failed: ${String(e)}`)
  })
}

// 清理暫存資料夾
function cleanupTempBaseDirectory(baseTmpDir: string) {
  return Effect.tryPromise({
    try: async () => {
      await fs.rm(baseTmpDir, { recursive: true, force: true })
    },
    catch: (e) => new Error(`cleanup failed: ${String(e)}`)
  })
}

// 獲取資源
function acquireUploadResource() {
  return Effect.sync(() => {
    const scriptDir = getScriptDirectory()
    const fileName = "tmp-ensuring"
    const content = "隨便的文本，嘿嘿"
    return { fileName, baseDir: scriptDir, content }
  })
}

type UploadResource = {
  readonly fileName: string
  readonly baseDir: string
  readonly content: string
}

// 使用資源
function useUploadWork(resource: UploadResource) {
  return Effect.gen(function*() {
    const tmpDir = yield* createUniqueUploadTempDirectory(resource.baseDir)
    const rawPath = path.join(tmpDir, `${resource.fileName}.txt`)
    yield* simulatePreprocessing(rawPath, resource.content, 3000)

    const pass = true
    if (!pass) {
      return yield* Effect.fail(new Error(`${resource.content} failed`))
    }
    yield* Console.log(`${resource.content}: done`)
  })
}

// 釋放資源
function releaseUploadResource(resource: UploadResource) {
  return Effect.ignore(cleanupTempBaseDirectory(path.join(resource.baseDir, "temp")))
}

// 1) 先用 Effect.ensuring（總是執行收尾工作）
{
  const program = Effect.gen(function*() {
    const resource = yield* acquireUploadResource()
    const body = useUploadWork(resource)
    return yield* body.pipe(Effect.ensuring(releaseUploadResource(resource)))
  })
  Effect.runFork(program)
}

// 2) 疊加 Effect.onExit（記錄成功/失敗）─ 同樣以資源為核心
{
  const exitHandler = Effect.onExit((exit) =>
    Exit.match(exit, {
      onSuccess: () => Console.log("Cleanup completed: success"),
      onFailure: (cause) => Console.log(`Cleanup completed: ${Cause.pretty(cause)}`)
    })
  )

  const program = Effect.gen(function*() {
    const resource = yield* acquireUploadResource()
    const body = useUploadWork(resource)
    return yield* body.pipe(Effect.ensuring(releaseUploadResource(resource)))
  }).pipe(exitHandler)

  Effect.runFork(program)
}

// 3) 再疊加 Effect.onError（僅在錯誤時做事）─ 同樣以資源為核心
{
  const exitHandler = Effect.onExit((exit) =>
    Exit.match(exit, {
      onSuccess: () => Console.log("Cleanup completed: success"),
      onFailure: (cause) => Console.log(`Cleanup completed: ${Cause.pretty(cause)}`)
    })
  )
  const errorHandler = Effect.onError((cause) => Console.log(`Only on error: ${Cause.pretty(cause)}`))

  const program = Effect.gen(function*() {
    const resource = yield* acquireUploadResource()
    const body = useUploadWork(resource)
    return yield* body.pipe(Effect.ensuring(releaseUploadResource(resource)))
  }).pipe(exitHandler, errorHandler)

  Effect.runFork(program)
}

// 4) 以 Effect.acquireUseRelease 管理資源生命週期
{
  const exitHandler = Effect.onExit((exit) =>
    Exit.match(exit, {
      onSuccess: () => Console.log("Cleanup completed: success"),
      onFailure: (cause) => Console.log(`Cleanup completed: ${Cause.pretty(cause)}`)
    })
  )
  const errorHandler = Effect.onError((cause) => Console.log(`Only on error: ${Cause.pretty(cause)}`))

  const program = Effect.acquireUseRelease(
    acquireUploadResource(),
    (resource) => useUploadWork(resource),
    releaseUploadResource
  )

  Effect.runFork(program.pipe(exitHandler, errorHandler))
}

// 5) 以 Scope 管理生命週期
{
  const exitHandler = Effect.onExit((exit) =>
    Exit.match(exit, {
      onSuccess: () => Console.log("Cleanup completed: success"),
      onFailure: (cause) => Console.log(`Cleanup completed: ${Cause.pretty(cause)}`)
    })
  )
  const errorHandler = Effect.onError((cause) => Console.log(`Only on error: ${Cause.pretty(cause)}`))

  const program = Effect.scoped(
    Effect.gen(function*() {
      const resource = yield* Effect.acquireRelease(acquireUploadResource(), releaseUploadResource)
      yield* useUploadWork(resource)
    })
  ).pipe(exitHandler, errorHandler)

  Effect.runFork(program)
}

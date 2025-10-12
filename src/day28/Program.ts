import { Console, Effect, Exit, Scope } from "effect"
import * as fs from "node:fs/promises"
import type { FileHandle } from "node:fs/promises"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

{
  const demoManualScope = Effect.gen(function*() {
    const scope = yield* Scope.make()
    yield* Scope.addFinalizer(scope, Console.log("Finalizer 1"))
    yield* Scope.addFinalizer(scope, Console.log("Finalizer 2"))
    yield* Scope.close(scope, Exit.succeed("scope closed"))
  })

  Effect.runFork(demoManualScope)
}

{
  // 執行時註冊一個 finalizer
  const withFinalizer = Effect.gen(function*() {
    yield* Effect.addFinalizer(() => Console.log("Last!"))
    yield* Console.log("First")
  })

  // 以 scoped 提供 Scope 包住的地方界定資源範疇
  //                       ┌─── const scoped: <void, never, Scope>(effect: Effect.Effect<void, never, Scope>) => Effect.Effect<void, never, never>
  //                       ▼
  Effect.runFork(Effect.scoped(withFinalizer))
}

{
  const fineGrained = Effect.gen(function*() {
    // 在這裡就結束該 Scope
    yield* Effect.scoped(Effect.addFinalizer(() => Console.log("Last!"))) // finalizer 註冊後，因 Scope 關閉而執行
    yield* Console.log("First")
  })

  Effect.runFork(fineGrained)
}

{
  // 取得運行腳本的路徑
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  // 檔案路徑
  const targetPath = path.join(scriptDir, "1-what-is-a-program.ts")

  // 資源取得（Acquire）：以唯讀方式開啟檔案，成功時產生 FileHandle
  const acquireReadOnlyFileHandle = Effect.tryPromise({
    try: () => fs.open(targetPath, "r"),
    catch: () => new Error("Failed to open file")
  }).pipe(Effect.tap(() => Console.log("File opened")))

  // 資源釋放（Release）：接收與 acquire 相同的 FileHandle 並關閉
  const closeFile = (fileHandle: FileHandle) =>
    Effect.promise(() => fileHandle.close()).pipe(Effect.tap(() => Console.log("File closed")))

  // 資源使用（Use）：在作用域內使用同一個 FileHandle
  const useFile = (fileHandle: FileHandle) => Console.log(`Using File: ${fileHandle.fd}`)

  // Acquire → Use → Release 皆由 acquireRelease 與 scoped 自動串接
  const program = Effect.scoped(
    Effect.acquireRelease(acquireReadOnlyFileHandle, closeFile).pipe(
      Effect.flatMap(useFile)
    )
  )

  Effect.runFork(program)
}

{
  // 取得運行腳本的路徑
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  // 檔案路徑
  const targetPath = path.join(scriptDir, "1-what-is-a-program.ts")

  const acquireReadOnlyFileHandle = Effect.tryPromise({
    try: () => fs.open(targetPath, "r"),
    catch: () => new Error("Failed to open file")
  }).pipe(Effect.tap(() => Console.log("File opened")))

  const closeFile = (fileHandle: FileHandle) =>
    Effect.promise(() => fileHandle.close()).pipe(Effect.tap(() => Console.log("File closed")))

  const useFile = (fileHandle: FileHandle) => Console.log(`Using File: ${fileHandle.fd}`)

  const program = Effect.acquireUseRelease(acquireReadOnlyFileHandle, useFile, closeFile)

  Effect.runFork(program)
}

{
  // 取得運行腳本的路徑
  const scriptDir = path.dirname(fileURLToPath(import.meta.url))
  // 檔案路徑
  const targetPath = path.join(scriptDir, "1-what-is-a-program.ts")

  // 與 day27 命名對齊
  const acquireReadOnlyFileHandle = Effect.tryPromise({
    try: () => fs.open(targetPath, "r"),
    catch: () => new Error("Failed to open file")
  }).pipe(Effect.tap(() => Console.log("File opened")))

  const closeFile = (fileHandle: FileHandle) =>
    Effect.promise(() => fileHandle.close()).pipe(Effect.tap(() => Console.log("File closed")))

  const fileHandle = Effect.acquireRelease(acquireReadOnlyFileHandle, closeFile)

  // 安全：在同一個 Scope 內取得並使用（對應「請求內」拿到連線就用完）
  const programSafe = Effect.scoped(
    Effect.gen(function*() {
      const handle = yield* fileHandle // 此處仍在 Scope 內
      yield* Console.log("Using file (safe)")
      const buf = yield* Effect.tryPromise(() => handle.readFile())
      yield* Console.log(buf.toString())
    })
  )

  Effect.runFork(programSafe)
  // 輸出：
  // File opened
  // Using file (safe)
  // const hello = "Hello, World!"
  // console.log(hello)
  // File closed

  // 風險：Scope 已關閉，但之後還拿著 handle 使用（像把連線把手外洩到背景任務）
  const programRisky = Effect.gen(function*() {
    const handle = yield* Effect.scoped(fileHandle) // 在這裡 Scope 已關閉
    yield* Console.log("Using file after scope closed (risky)")
    // 直接觀察 scope 外的把手狀態（純展示用，不代表可用）
    yield* Console.log(handle)
    yield* Effect.tryPromise({
      try: () => handle.readFile(),
      catch: () => "readFile failed"
    }).pipe(
      Effect.tapError((e) => Console.log(e))
    )
  })

  // 建議：不要這樣寫（範例僅為展示風險）
  Effect.runFork(programRisky)
  // 輸出：
  // File opened
  // File closed
  // Using file after scope closed (risky)
  // FileHandle {
  //   _events: [Object: null prototype] {},
  //   _eventsCount: 0,
  //   _maxListeners: undefined,
  //   close: [Function: close],
  //   [Symbol(shapeMode)]: false,
  //   [Symbol(kCapture)]: false,
  //   [Symbol(kHandle)]: FileHandle {},
  //   [Symbol(kFd)]: -1,
  //   [Symbol(kRefs)]: 0,
  //   [Symbol(kClosePromise)]: undefined
  // }
}

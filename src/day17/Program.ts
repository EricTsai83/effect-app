import { Effect, Option } from "effect"

// Timeout
{
  // 1 秒完成的任務（會成功）
  const makeShortTask = () => {
    return Effect.gen(function*() {
      console.log("[短任務] 開始")
      yield* Effect.sleep("1 second")
      console.log("[短任務] 結束")
      return "OK"
    })
  }

  // 2 秒完成的任務（若時限太短會逾時）
  const makeLongTask = () => {
    return Effect.gen(function*() {
      console.log("[長任務] 開始")
      yield* Effect.sleep("2 seconds")
      console.log("[長任務] 結束")
      return "DONE"
    })
  }

  const runBasicTimeout = async (): Promise<void> => {
    console.log("\n--- DEMO：基本 timeout 行為 ---")

    // A) 在時限內完成 ⇒ 成功
    const ok = await Effect.runPromise(
      makeShortTask().pipe(Effect.timeout("3 seconds"))
    )
    console.log("時限內完成 =>", ok) // "OK"

    // B) 超過時限 ⇒ 以 TimeoutException 失敗
    const exit = await Effect.runPromiseExit(
      makeLongTask().pipe(Effect.timeout("1 second"))
    )
    console.log(exit)
    console.log("逾時結果 exit._tag =>", exit._tag) // "Failure"
  }

  runBasicTimeout().catch(console.error)
}

// Option
{
  // 建立有值的 Option
  const some1 = Option.some(1)
  console.log("建立有值的 Option =>", some1)
  // { _id: 'Option', _tag: 'Some', value: 1 }

  // 建立沒有值的 Option
  const none = Option.none()
  console.log("建立沒有值的 Option =>", none)
  // { _id: 'Option', _tag: 'None' }
}

{
  // 約 2 秒完成的任務
  const makeProcessingTask = () => {
    return Effect.gen(function*() {
      console.log("[任務] 開始處理...")
      yield* Effect.sleep("2 seconds")
      console.log("[任務] 處理完成。")
      return "Result"
    })
  }

  const runTimeoutOption = async () => {
    console.log("\n--- DEMO：timeoutOption（Some / None） ---")

    const task = makeProcessingTask()

    const results = await Effect.runPromise(
      Effect.all([
        task.pipe(Effect.timeoutOption("3 seconds")), // 有足夠時間 ⇒ Some("Result")
        task.pipe(Effect.timeoutOption("1 second")) // 時限太短 ⇒ None
      ])
    )

    console.log("results", results)
  }

  runTimeoutOption().catch(console.error)
}

{
  // 可中斷的任務
  const interruptibleTask = () => {
    return Effect.gen(function*() {
      console.log("[可中斷] 開始")
      yield* Effect.sleep("2 seconds")
      console.log("[可中斷] 結束")
    })
  }

  // 不可中斷的任務（整段包在 uninterruptible）
  const uninterruptibleTask = () => {
    const work = Effect.gen(function*() {
      console.log("[不可中斷] 進入")
      yield* Effect.sleep("2 seconds")
      console.log("[不可中斷] 離開")
    })
    return Effect.uninterruptible(work)
  }

  // 測試可中斷任務
  const testInterruptibleTask = async () => {
    console.log("\n=== 測試 1：可中斷任務 + timeout ===")
    console.log("預期：任務會被中斷，不會看到「結束」訊息")

    const ex1 = await Effect.runPromiseExit(
      interruptibleTask().pipe(Effect.timeout("1 second"))
    )
    console.log("結果:", ex1._tag)
    if (ex1._tag === "Failure") {
      console.log("失敗原因:", ex1.cause._tag)
      if (ex1.cause._tag === "Fail") {
        console.log("TimeoutException:", ex1.cause.error)
      }
    }
  }

  // 測試不可中斷任務
  const testUninterruptibleTask = async () => {
    console.log("\n=== 測試 2：不可中斷任務 + timeout ===")
    console.log("預期：任務不會被中斷，會看到「離開」訊息")

    const ex2 = await Effect.runPromiseExit(
      uninterruptibleTask().pipe(Effect.timeout("1 second"))
    )
    console.log("結果:", ex2._tag)
    if (ex2._tag === "Failure") {
      console.log("失敗原因:", ex2.cause._tag)
      if (ex2.cause._tag === "Fail") {
        console.log("TimeoutException:", ex2.cause.error)
      }
    }
  }

  // 執行測試
  testInterruptibleTask().catch(console.error)

  setTimeout(() => {
    testUninterruptibleTask().catch(console.error)
  }, 3000)
}

import { Effect, Either } from "effect"

const formatTime = (date: Date) => {
  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  })
}

const longRunningTask = () =>
  Effect.gen(function*() {
    console.log(`[斷線示範] 開始工作 (${formatTime(new Date())})`)
    yield* Effect.sleep("2 seconds")
    console.log(`[斷線示範] 工作完成（在背景收尾） (${formatTime(new Date())})`)
  }).pipe(Effect.uninterruptible) // 關鍵：讓任務不可中斷

{
  // 測試 1: 沒有 Effect.disconnect
  console.log("=== 測試 1: 沒有 Effect.disconnect ===")
  const exit1 = await Effect.runPromiseExit(
    longRunningTask().pipe(Effect.timeout("1 second"))
  )
  console.log("結果:", exit1._tag)

  // 等待一下看看是否有背景任務
  console.log("等待 3 秒看是否有背景任務...")
  await new Promise((resolve) => setTimeout(resolve, 3000))
}

{
  // 測試 2: 有 Effect.disconnect
  console.log("\n=== 測試 2: 有 Effect.disconnect ===")
  const timedEffect = longRunningTask().pipe(
    Effect.disconnect, // 關鍵：允許工作在背景完成
    Effect.timeout("1 second")
  )
  const exit2 = await Effect.runPromiseExit(timedEffect)
  console.log("結果:", exit2._tag)

  // 等待一下讓背景任務完成
  console.log("等待 3 秒讓背景任務完成...")
  await new Promise((resolve) => setTimeout(resolve, 3000))
}

// Effect.timeoutTo
{
  const task = Effect.gen(function*() {
    console.log("Start processing...")
    yield* Effect.sleep("2 seconds") // Simulates a delay in processing
    console.log("Processing complete.")
    return "Result"
  })

  const program = task.pipe(
    Effect.timeoutTo({
      duration: "1 second",
      onSuccess: (result) => Either.right(result),
      onTimeout: () => Either.left("Timed out!")
    })
  )

  Effect.runPromise(program).then(console.log)
}

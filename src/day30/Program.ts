import { Console, Effect, Fiber } from "effect"

function withTiming<A, E, R>(effect: Effect.Effect<A, E, R>) {
  return Effect.gen(function*() {
    const startedAt = Date.now()
    const value = yield* effect
    const elapsedMs = Date.now() - startedAt
    yield* Console.log(`耗時 ${elapsedMs} ms`)
    return value
  })
}

function validateOrder(orderId: number) {
  return Effect.gen(function*() {
    yield* Console.log(`訂單 #${orderId}：驗證中`)
    yield* Effect.sleep("50 millis")
    yield* Console.log(`訂單 #${orderId}：驗證完成`)
    return orderId
  })
}

function reserveInventory(orderId: number) {
  return Effect.gen(function*() {
    yield* Console.log(`訂單 #${orderId}：保留庫存`)
    yield* Effect.sleep("100 millis")
    yield* Console.log(`訂單 #${orderId}：庫存已保留`)
    return orderId
  })
}

function chargePayment(orderId: number) {
  return Effect.gen(function*() {
    yield* Console.log(`訂單 #${orderId}：付款請款`)
    yield* Effect.sleep("150 millis")
    yield* Console.log(`訂單 #${orderId}：付款成功`)
    return orderId
  })
}

function createShipment(orderId: number) {
  return Effect.gen(function*() {
    yield* Console.log(`訂單 #${orderId}：建立出貨單`)
    yield* Effect.sleep("120 millis")
    yield* Console.log(`訂單 #${orderId}：出貨單建立完成`)
    return orderId
  })
}

function sendNotifications(orderId: number) {
  return Effect.gen(function*() {
    yield* Console.log(`訂單 #${orderId}：寄送通知（Email / SMS）`)
    yield* Effect.sleep("80 millis")
    yield* Console.log(`訂單 #${orderId}：通知完成`)
    return orderId
  })
}

function processOrder(orderId: number) {
  return Effect.gen(function*() {
    const validatedId = yield* validateOrder(orderId)
    const reservedId = yield* reserveInventory(validatedId)
    const chargedId = yield* chargePayment(reservedId)
    return chargedId
  })
}

// 範例 1：依序處理（示範批次處理 3 筆訂單）
{
  const program = Effect.all([
    processOrder(101),
    processOrder(102),
    processOrder(103)
  ])

  Effect.runFork(withTiming(program))
}

// 範例 2：限制併發為 2（符合外部金流/物流 API 的速率限制）
{
  const program = Effect.all(
    [
      processOrder(201),
      processOrder(202),
      processOrder(203)
    ],
    { concurrency: 2 }
  )

  Effect.runFork(withTiming(program))
}

// 範例 3：完全不設限（所有訂單同時處理）
// 三筆同時開始，理想情況約 ~200ms 完成。
{
  const program = Effect.all(
    [
      processOrder(301),
      processOrder(302),
      processOrder(303)
    ],
    { concurrency: "unbounded" }
  )

  Effect.runFork(withTiming(program))
}

// 範例 4：多階段實務流程（父子流程繼承併發）：
// 階段 A：付款（限流 2）→ 階段 B：出貨與通知（沿用限流 2）
{
  function processBatchPhased() {
    return Effect.gen(function*() {
      // 階段 A：先對第一批訂單進行「驗證 / 保留庫存 / 請款」
      const paid = yield* Effect.all(
        [401, 402, 403, 404, 405].map((id) =>
          Effect.gen(function*() {
            yield* validateOrder(id)
            yield* reserveInventory(id)
            yield* chargePayment(id)
            return id
          })
        ),
        { concurrency: 2 }
      )

      // 階段 B：對已付款清單建立出貨與通知，沿用上一層的併發設定
      const shippedAndNotified = yield* Effect.all(
        paid.map((id) =>
          Effect.gen(function*() {
            yield* createShipment(id)
            yield* sendNotifications(id)
            return id
          })
        ),
        { concurrency: "inherit" }
      )

      return shippedAndNotified
    })
  }

  Effect.runFork(withTiming(processBatchPhased()))
}

{
  // 範例：併發下的中斷（訂單批次）
  // 說明：當某一支併發中的工作「被中斷或自我中斷」，同批次併發的其他工作也會被中斷。
  function processSingleOrder(orderId: number) {
    return Effect.gen(function*() {
      yield* Console.log(`訂單 #${orderId}：開始處理`)
      // 先執行基本處理（驗證 / 庫存 / 請款）
      const paidId = yield* processOrder(orderId)

      // 模擬風險控管：若 id 命中規則，主動中斷該工作
      if (paidId === 502) {
        yield* Console.log(`訂單 #${paidId}：風險控管觸發，開始中斷`)
        return yield* Effect.interrupt
      }

      // 通常情況：建立出貨單並寄送通知
      yield* createShipment(paidId)
      yield* sendNotifications(paidId)
      yield* Console.log(`訂單 #${paidId}：完成`)
      return paidId
    }).pipe(
      Effect.onInterrupt(() => Console.log(`訂單 #${orderId}：已中斷（釋放/回滾資源）`))
    )
  }

  const batchProgram = Effect.forEach([501, 502, 503], (id) => processSingleOrder(id), {
    concurrency: "unbounded"
  })

  Effect.runPromiseExit(batchProgram).then((exit) => console.log(JSON.stringify(exit, null, 2)))
}

{
  const child = Effect.sleep("1 second").pipe(
    Effect.onInterrupt(() => Console.log("child cleanup"))
  )

  const parent = Effect.gen(function*() {
    const fiber = yield* Effect.fork(
      Effect.all([child, child, child], { concurrency: "unbounded" })
    )
    yield* Effect.sleep("150 millis")
    yield* Fiber.interrupt(fiber) // 中斷父 → 子任務也被中斷
  })

  Effect.runFork(parent)
}

{
  // 競速示範：較快者勝出、較慢者被中斷
  const fasterCandidate = Effect.succeed("較快任務").pipe(
    Effect.delay("100 millis"),
    Effect.tap(Console.log("較快任務：完成")),
    Effect.onInterrupt(() => Console.log("較快任務：被中斷"))
  )

  const slowerCandidate = Effect.succeed("較慢任務").pipe(
    Effect.delay("300 millis"),
    Effect.tap(Console.log("較慢任務：完成")),
    Effect.onInterrupt(() => Console.log("較慢任務：被中斷"))
  )

  // 在競速下，勝者的值會被回傳；落敗者會被中斷並觸發 onInterrupt
  Effect.runFork(
    Effect.race(fasterCandidate, slowerCandidate).pipe(
      Effect.tap(Console.log)
    )
  )
}

{
  // 競速（raceAll）：誰先完成且成功就採用，其餘自動中斷
  const task1 = Effect.fail("任務1").pipe(
    Effect.delay("100 millis"),
    Effect.tap(Console.log("任務1 完成")),
    Effect.onInterrupt(() => Console.log("任務1 已中斷"))
  )

  const task2 = Effect.succeed("任務2").pipe(
    Effect.delay("200 millis"),
    Effect.tap(Console.log("任務2 完成")),
    Effect.onInterrupt(() => Console.log("任務2 已中斷"))
  )

  const task3 = Effect.succeed("任務3").pipe(
    Effect.delay("150 millis"),
    Effect.tap(Console.log("任務3 完成")),
    Effect.onInterrupt(() => Console.log("任務3 已中斷"))
  )

  const program = Effect.raceAll([task1, task2, task3])

  Effect.runPromiseExit(program).then(console.log)
}

{
  // 競速（raceFirst）：只要有一個完成就採用，不管成功與否，其餘自動中斷
  const task1 = Effect.fail("任務1").pipe(
    Effect.delay("100 millis"),
    Effect.tap(Console.log("任務1 完成")),
    Effect.onInterrupt(() => Console.log("任務1 已中斷").pipe(Effect.delay("100 millis")))
  )

  const task2 = Effect.succeed("任務2").pipe(
    Effect.delay("200 millis"),
    Effect.tap(Console.log("任務2 完成")),
    Effect.onInterrupt(() => Console.log("任務2 已中斷").pipe(Effect.delay("100 millis")))
  )

  const program = Effect.raceFirst(task1, task2).pipe(
    Effect.tap(Console.log("更多後續工作..."))
  )

  Effect.runPromiseExit(program).then(console.log)
}

import { Cause, Duration, Effect, Either, Exit, Option } from "effect"

const USER_ID = null

const maybeUserId = Option.fromNullable(USER_ID)

const greeting = Option.match(maybeUserId, {
  onSome: (id) => `Hi, ${id}`,
  onNone: () => "Guest"
})

const userIdOrDefault = Option.getOrElse(maybeUserId, () => "unknown")

// console.log(greeting)
// console.log(userIdOrDefault)

const isPositive = (n: number) => n > 0

// 顯式用 some/none 建立
function _parsePositiveExplicit(n: number): Option.Option<number> {
  return isPositive(n) ? Option.some(n) : Option.none()
}

// 用 liftPredicate 更簡潔：回傳 (b: number) => Option<number>
const _parsePositive = Option.liftPredicate(isPositive)

{
  // 建立與基本使用
  function parseIntegerEither(s: string) {
    const n = Number(s)
    if (!Number.isInteger(n)) {
      return Either.left("not an int")
    }
    return Either.right(n)
  }

  const rightValue = Either.right(1)
  const leftValue = Either.left("oops")

  // 右偏映射（成功路）
  const mapped = Either.map(rightValue, (n) => n + 1)

  // 鏈接（成功路）
  const chained = Either.flatMap(parseIntegerEither("42"), (n) => Either.right(n + 1))

  // 轉換錯誤（左路）
  const normalizedErr = Either.mapLeft(parseIntegerEither("x"), (e) => ({ message: e }))

  // 明確處理兩個分支
  const rendered = Either.match(parseIntegerEither("foo"), {
    onRight: (n) => `ok: ${n}`,
    onLeft: (err) => `error: ${err}`
  })

  function describeEither(e: Either.Either<unknown, unknown>) {
    return Either.match(e, {
      onRight: (value) => ({ tag: "Right", value }),
      onLeft: (error) => ({ tag: "Left", error })
    })
  }

  // console.log("rightValue:", describeEither(rightValue))
  // console.log("leftValue:", describeEither(leftValue))
  // console.log("mapped:", describeEither(mapped))
  // console.log("chained:", describeEither(chained))
  // console.log("normalizedErr:", describeEither(normalizedErr))
  // console.log("rendered:", rendered)
}

{
  // 1) 同步執行並取得 Exit（成功）
  const okExit = Effect.runSyncExit(Effect.succeed(42))

  // 2) 同步執行並取得 Exit（失敗）
  const errExit = Effect.runSyncExit(Effect.fail("my error"))

  // 3) 匹配特定 Exit 並加以處理成功與失敗情境
  //         ┌─── string
  //         ▼
  const renderedOk = Exit.match(okExit, {
    onSuccess: (value) => `Success: ${value}`,
    onFailure: (cause) => `Failure: ${Cause.pretty(cause)}`
  })
  //         ┌─── string
  //         ▼
  const renderedErr = Exit.match(errExit, {
    onSuccess: (value) => `Success: ${value}`,
    onFailure: (cause) => `Failure: ${Cause.pretty(cause)}`
  })

  // 4) 直接回傳 Exit（多用於測試或模擬）
  //         ┌─── Exit<number, never>
  //         ▼
  const directSuccess = Exit.succeed(1)
  //         ┌─── Exit<never, string>
  //         ▼
  const directFailure = Exit.failCause(Cause.fail("boom"))

  // console.log("renderedOk:", renderedOk)
  // console.log("renderedErr:", renderedErr)
  // console.log("directSuccess:", directSuccess)
  // console.log("directFailure:", directFailure)
}

{
  // // 1) 建立帶有不同 Cause 的 Effect
  // //    - Fail（可預期錯誤，會決定錯誤通道型別 E）
  // //    - Die（缺陷，不會影響 E，因此 error channel 為 never）

  // //      ┌─── Effect<never, never, never>
  // //      ▼
  // const asDie = Effect.failCause(Cause.die(new Error("Boom!")))
  // //      ┌─── Effect<never, string, never>
  // //      ▼
  // const asFail = Effect.failCause(Cause.fail("Oops"))

  // // 2) 取得 Effect 的 Cause 並做處理（集中觀測）
  // const program = Effect.fail("error 1")

  // const allCauseEffect = Effect.catchAllCause(program, (cause) =>
  //   Effect.succeed({
  //     pretty: Cause.pretty(cause), // string
  //     failures: Cause.failures(cause), // Chunk<string>
  //     defects: Cause.defects(cause) // Chunk<unknown>
  //   }))

  // const allCause = Effect.runSync(allCauseEffect)
  // console.log("all causes:", allCause)

  // // // 3) 對 Cause 進行模式比對（按分支精準處理）
  // // const cause = Cause.fail("boom")
  // // //        ┌─── string
  // // //        ▼
  // // const analyzed = Cause.match(cause, {
  // //   onEmpty: "Empty",
  // //   onFail: (e) => `Fail(${String(e)})`,
  // //   onDie: (d) => `Die(${String(d)})`,
  // //   onInterrupt: (fiberId) => `Interrupt(${String(fiberId)})`,
  // //   onSequential: (l, r) => `Sequential(${l} -> ${r})`,
  // //   onParallel: (l, r) => `Parallel(${l} | ${r})`
  // // })
  // // console.log("analyzed:", analyzed)

  // // Empty：沒有任何錯誤
  // const empty = Cause.empty
  // const label = Cause.match(empty, {
  //   onEmpty: "Empty",
  //   onFail: () => "Fail",
  //   onDie: () => "Die",
  //   onInterrupt: () => "Interrupt",
  //   onSequential: () => "Sequential",
  //   onParallel: () => "Parallel"
  // })
  // console.log("empty:", label)

  // // Interrupt：超時情境（避免意外重試）
  // // 模擬外部呼叫：需要 2 秒才會失敗
  // const callPayment = Effect.delay(Effect.fail("gateway overloaded"), Duration.seconds(2))

  // // 加上 1 秒超時（逾時會產生 Interrupt）
  // const withTimeout = Effect.timeout(callPayment, Duration.seconds(1))

  // // 只要是 Interrupt，我們回傳 504／不要重試；Fail 則可依商務決策重試
  // const InterruptHandled = Effect.catchAllCause(withTimeout, (cause) =>
  //   Effect.succeed(
  //     Cause.match(cause, {
  //       onInterrupt: () => ({ status: 504, message: "Payment Timeout" }),
  //       onFail: (e) => ({ status: 400, message: String(e) }),
  //       onDie: () => ({ status: 500, message: "Unexpected defect" }),
  //       onEmpty: { status: 200, message: "OK" },
  //       onSequential: (l, r) => ({ status: 500, message: `seq: ${l.message} -> ${r.message}` }),
  //       onParallel: (l, r) => ({ status: 500, message: `par: ${l.message} | ${r.message}` })
  //     })
  //   ))

  // Effect.runPromise(InterruptHandled).then((result) => {
  //   console.log("Interrupt Handled:", result)
  // })

  // // Parallel：並行批次（一次看見多個錯誤）
  // // 同時呼叫多個後端（可能同時失敗）
  // const userCall = Effect.fail("user: db unavailable")
  // const ordersCall = Effect.die(new Error("orders: decoder bug"))

  // const parallelCalls = Effect.all([userCall, ordersCall], { concurrency: 2 })

  // const report = Effect.catchAllCause(parallelCalls, (cause) =>
  //   Effect.succeed({
  //     failures: Array.from(Cause.failures(cause)),
  //     defects: Array.from(Cause.defects(cause))
  //   }))

  // // Effect.runPromiseExit(report).then(console.log)

  // // Sequential：順序補救也失敗
  // // 先失敗 A，catch 後嘗試補救 B，但 B 也失敗 → Sequential(A -> B)
  // const programSeq = Effect.failCause(
  //   Cause.fail("Oh no!") // A
  // ).pipe(
  //   Effect.ensuring(Effect.failCause(Cause.die("Boom!"))) // B
  // )
  // Effect.runPromiseExit(programSeq).then(console.log)
}

{
  // 3) 實務：集中觀測 + 模式比對（邊界收斂）

  // 範例程式：你可以替換成實際工作流程的 Effect
  const program = Effect.fail("error 1")

  const handled = Effect.catchAllCause(program, (cause) => {
    // 先「集中觀測」Cause 的全貌（供記錄或追蹤）
    const observed = { // 將 Cause 轉為易讀/可處理的摘要
      pretty: Cause.pretty(cause), // 轉為可讀多行字串，適合 console/log
      failures: Array.from(Cause.failures(cause)), // 可預期錯誤（由 fail 等）
      defects: Array.from(Cause.defects(cause)) // 非預期錯誤/缺陷（die 等）
    }

    // 再用「模式比對」把失敗分支化，收斂成邊界需要的結構
    const result = Cause.match(cause, {
      onFail: (e) => ({ status: 400, message: String(e) }),
      onDie: () => ({ status: 500, message: "Unexpected defect" }),
      onInterrupt: () => ({ status: 504, message: "Timeout" }),
      onEmpty: { status: 200, message: "OK" },
      onSequential: (l, r) => ({ status: 500, message: `seq: ${l.message} -> ${r.message}` }),
      onParallel: (l, r) => ({ status: 500, message: `par: ${l.message} | ${r.message}` })
    })

    return Effect.succeed({ observed, result })
  })

  console.log("集中觀測 + 模式比對:", Effect.runSync(handled))
}

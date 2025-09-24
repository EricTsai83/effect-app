import { Console, Effect } from "effect"

/**
 * 以 Effect 形式取得目前時間（毫秒）。
 * @returns Effect<number, never> 代表目前時間戳（ms）的純同步 Effect
 */
const now = Effect.sync(() => Date.now())

/**
 * 簡單錯誤類別：執行超過門檻時拋出。
 */
class TooSlowError extends Error {
  readonly name = "TooSlowError"
  constructor(readonly elapsedMs: number, readonly thresholdMs: number) {
    super(`Too slow: ${elapsedMs}ms (> ${thresholdMs}ms)`)
  }
}

/**
 * 為傳入的 Effect 加上執行時間量測與日誌，並支援簡單錯誤分流。
 *
 * 行為：
 * - 執行前記錄起始時間。
 * - 先印出 "start running..."。
 * - 成功後印出耗時（毫秒）。
 * - 若提供 thresholdMs 且耗時超過門檻，回傳 TooSlowError（錯誤分流）。
 * - 原本的失敗錯誤不改變，直接向外拋出（維持語意）。
 *
 * @template A 成功值型別（與原 Effect 相同）
 * @template E 失敗錯誤型別（與原 Effect 相同）
 * @template R 需求環境（與原 Effect 相同）
 * @param self 要被量測與記錄日誌的 Effect
 * @param thresholdMs 門檻（毫秒）；超過則以 TooSlowError 失敗
 * @returns Effect<A, E | TooSlowError, R>
 */
const elapsed = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  thresholdMs?: number
): Effect.Effect<A, E | TooSlowError, R> =>
  now.pipe(
    Effect.andThen((start) =>
      Console.log("start running...").pipe(
        Effect.andThen(() => self),
        // 注意：這裡只處理成功分支；若 self 失敗，錯誤會直接外拋（維持語意）。
        Effect.andThen((value) =>
          now.pipe(
            Effect.andThen((end) =>
              Console.log(`elapsed: ${end - start}ms`).pipe(
                Effect.andThen(() =>
                  thresholdMs !== undefined && end - start > thresholdMs
                    ? Effect.fail(new TooSlowError(end - start, thresholdMs))
                    : Effect.succeed(value)
                )
              )
            )
          )
        )
      )
    )
  )

const elapsedGen = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  thresholdMs?: number
): Effect.Effect<A, E | TooSlowError, R> =>
  Effect.gen(function*() {
    const start = yield* now
    yield* Console.log("start running...")
    const value: A = yield* self
    const end = yield* now
    const elapsedMs = end - start
    yield* Console.log(`elapsed: ${elapsedMs}ms`)
    // 早退：若超過門檻，直接以 TooSlowError 失敗返回（錯誤分流）。
    if (thresholdMs !== undefined && elapsedMs > thresholdMs) {
      return yield* Effect.fail(new TooSlowError(elapsedMs, thresholdMs))
    }
    return value
  })

// 成功案例：不超過門檻（或不設定門檻）
Effect.all([
  elapsed(Effect.succeed("OK"), 1000),
  elapsedGen(Effect.succeed("OK"), 1000)
]).pipe(
  Effect.matchEffect({
    onSuccess: ([a, b]) => Console.log(`success: ${a}, ${b}`),
    onFailure: (err) => Console.log(`unexpected error: ${String(err)}`)
  }),
  Effect.runSync
)

// 錯誤案例：超過門檻 → TooSlowError
function busyWait(ms: number): void {
  const start = Date.now()
  while (Date.now() - start < ms) void 0
}

const slowSelf = Effect.sync(() => {
  busyWait(30)
  return 42
})

Effect.all([
  elapsed(slowSelf, 5),
  elapsedGen(slowSelf, 5)
]).pipe(
  Effect.matchEffect({
    onSuccess: () => Console.log("unexpected success"),
    onFailure: (err) => Console.log(String(err))
  }),
  Effect.runSync
)

const elapsedDo = <A, E, R>(
  self: Effect.Effect<A, E, R>,
  thresholdMs?: number
): Effect.Effect<A, E | TooSlowError, R> =>
  Effect.Do.pipe(
    Effect.bind("start", () => now),
    Effect.tap(() => Console.log("start running...")),
    Effect.bind("result", () => self),
    Effect.bind("end", () => now),
    Effect.tap(({ end, start }) => Console.log(`elapsed: ${end - start}ms`)),
    Effect.flatMap(({ end, result, start }) =>
      thresholdMs !== undefined && end - start > thresholdMs
        ? Effect.fail(new TooSlowError(end - start, thresholdMs))
        : Effect.succeed(result)
    )
  )

Effect.all([
  elapsedDo(slowSelf, 5)
]).pipe(
  Effect.matchEffect({
    onSuccess: () => Console.log("unexpected success"),
    onFailure: (err) => Console.log(String(err))
  }),
  Effect.runSync
)

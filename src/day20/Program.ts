import { Context, Effect, Option } from "effect"

// 以唯一字串識別建立 Tag
class Random extends Context.Tag("MyRandomService")<
  Random,
  // service 會回傳一個 number 的 Effect
  { readonly next: Effect.Effect<number> }
>() {}

class Logger extends Context.Tag("MyLoggerService")<
  Logger,
  { readonly log: (message: string) => Effect.Effect<void> }
>() {}

{
  //      ┌─── Effect<void, never, Random>
  //      ▼
  const program = Effect.gen(function*() {
    const random = yield* Random
    const randomNumber = yield* random.next
    console.log(`random number: ${randomNumber}`)
  })

  // Providing the implementation
  //
  //      ┌─── Effect<void, never, never>
  //      ▼
  const runnable = Effect.provideService(program, Random, {
    next: Effect.sync(() => Math.random())
  })

  Effect.runSync(runnable)
}

{
  // 將 program 改成有用到 Random 與 Logger 兩個服務
  const program = Effect.gen(function*() {
    const random = yield* Random
    const logger = yield* Logger

    const randomNumber = yield* random.next

    yield* logger.log(String(randomNumber))
  })

  // program 的需求是 Random | Logger
  const runnable = program.pipe(
    Effect.provideService(Random, {
      next: Effect.sync(() => Math.random())
    }),
    Effect.provideService(Logger, {
      log: (message) => Effect.sync(() => console.log(`[${new Date().toLocaleString()}] ${message}`))
    })
  )

  Effect.runSync(runnable)
}

{
  const program = Effect.gen(function*() {
    const random = yield* Random
    const logger = yield* Logger

    const randomNumber = yield* random.next

    yield* logger.log(String(randomNumber))
  })

  const context = Context.empty().pipe(
    Context.add(Random, { next: Effect.sync(() => Math.random()) }),
    Context.add(Logger, {
      log: (message) => Effect.sync(() => console.log(`[${new Date().toLocaleString()}] ${message}`))
    })
  )

  const runnable = Effect.provide(program, context)
  Effect.runSync(runnable)
}

{
  //      ┌─── Effect.Effect<void, never, never>
  //      ▼
  const program = Effect.gen(function*() {
    const maybeRandom = yield* Effect.serviceOption(Random)
    const randomNumber = Option.isNone(maybeRandom)
      ? -1 :
      yield* maybeRandom.value.next
    console.log(randomNumber)
  })

  // 未提供 Random → 輸出 -1
  Effect.runSync(program)

  // 有提供 Random → 輸出真的隨機數
  Effect.runSync(
    Effect.provideService(program, Random, {
      next: Effect.sync(() => Math.random())
    })
  )
}

{
  // 被測函式：回傳一個隨機數（方便斷言）
  const drawNumber = Effect.gen(function*() {
    const random = yield* Random
    return yield* random.next
  })

  // 測試：固定回傳 0.5
  const testEffect = drawNumber.pipe(
    Effect.provideService(Random, { next: Effect.succeed(0.5) })
  )

  console.log(Effect.runSync(testEffect)) // 0.5
}

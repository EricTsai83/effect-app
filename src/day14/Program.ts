import { Console, Effect } from "effect"

class FooError {
  readonly _tag = "FooError"
  constructor(readonly message = "Foo failed") {}
}

class BarError {
  readonly _tag = "BarError"
  constructor(readonly message = "Bar failed") {}
}

const conditions = [true, true, true] as [boolean, boolean, boolean]

const errors = Effect.gen(function*() {
  if (conditions[0]) {
    return yield* Effect.fail(new FooError())
  } else if (conditions[1]) {
    return yield* Effect.fail(new BarError())
  } else if (conditions[2]) {
    return yield* Effect.die("Boom") // 非期望錯誤
  }
  return "Success"
})

// Effect.runSync(errors)

/**
node:internal/modules/run_main:123
    triggerUncaughtException(
    ^

[Error: {"_tag":"FooError","message":"Foo failed"}] {
  name: '(FiberFailure) Error',
  [Symbol(effect/Runtime/FiberFailure)]: Symbol(effect/Runtime/FiberFailure),
  [Symbol(effect/Runtime/FiberFailure/Cause)]: {
    _tag: 'Fail',
    error: FooError { _tag: 'FooError', message: 'Foo failed' }
  }
}
*/

{
  const _program = Effect.gen(function*() {
    yield* Console.log("1")
    return yield* Effect.fail(new Error("Boom")) // 這行會失敗，程式短路
    yield* Console.log("2") // 這行不會執行
  })

  // Effect.runPromise(program).catch((e) => console.error("program:", e))
}

{
  // 統一處理所有期望錯誤
  const program = errors.pipe(
    Effect.catchAll((e) => Effect.succeed(`Handled ${e._tag}`))
  )
  Effect.runSync(program) // 什麼輸出沒有
  Effect.runPromise(program).then(console.log) // -> "Handled FooError"
}

{
  //       ┌─── Effect.Effect<string, never, never>
  //       ▼
  const program = errors.pipe(
    Effect.catchTags({
      FooError: () => Effect.succeed("Handled Foo"),
      BarError: () => Effect.succeed("Handled Bar")
    })
  )
  Effect.runSync(program)
}

{
  //       ┌─── Effect.Effect<string, BarError, never>
  //       ▼
  const program = errors.pipe(
    Effect.catchTags({
      FooError: () => Effect.succeed("Handled Foo")
    })
  )
  Effect.runSync(program)
}

{
  // orElse：失敗時提供替代的成功 Effect
  //       ┌─── Effect.Effect<string, never, never>
  //       ▼
  const _program1 = errors.pipe(Effect.orElse(() => Effect.succeed("Handled")))

  class MyError extends Error {}
  // orElseFail：把任何期望錯誤映射成單一新錯誤
  //       ┌─── Effect.Effect<string, MyError, never>
  //       ▼
  const _program2 = errors.pipe(Effect.orElseFail(() => new MyError()))

  // mapError：轉換錯誤（仍是失敗），保留失敗語義
  //       ┌─── Effect.Effect<string, Error, never>
  //       ▼
  const _program3 = errors.pipe(
    Effect.mapError((oldErr) => new Error(`error: ${String(oldErr)}`))
  )

  // match：把成功/失敗折疊成一個純值
  //       ┌─── Effect.Effect<string, never, never>
  //       ▼
  const _program4 = errors.pipe(
    Effect.match({
      onSuccess: (x) => `success: ${x}`,
      onFailure: (e) => `handled error: ${e}`
    })
  )

  // matchEffect：像 match，但回傳 Effect，兩側更有彈性
  //       ┌─── Effect.Effect<string, never, never>
  //       ▼
  const _program5 = errors.pipe(
    Effect.matchEffect({
      onSuccess: (x) => Effect.succeed(`success: ${x}`),
      onFailure: (e) => Effect.succeed(`handled error: ${e}`)
    })
  )

  // firstSuccessOf：多個候選 Effect，取第一個成功者，如果全部失敗會回傳最後一個失敗結果
  //       ┌─── Effect.Effect<string, Error, never>
  //       ▼
  const _program6 = Effect.firstSuccessOf([
    Effect.fail(new Error("fail")),
    Effect.succeed("success")
  ])
}

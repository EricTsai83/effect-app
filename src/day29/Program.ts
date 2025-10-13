import { Effect, Fiber } from "effect"

// function makeTask(name: string, delayMs: number, value: number) {
//   return Effect.gen(function*() {
//     yield* Console.log(`[${name}] start`)
//     yield* Effect.sleep(`${delayMs} millis`)
//     yield* Console.log(`[${name}] done`)
//     return value
//   })
// }

// const program = Effect.gen(function*() {
//   // 1) fork：啟動子任務，立即回傳 Fiber 把手
//   const fiberA = yield* Effect.fork(makeTask("A", 800, 1))
//   const fiberB = yield* Effect.fork(makeTask("B", 1200, 2))

//   // 背景不斷提供 working 信號，幫助觀察
//   const spinnerFiber = yield* Effect.fork(
//     Effect.forever(
//       Effect.sleep("200 millis").pipe(Effect.tap(() => Console.log("working...")))
//     ).pipe(Effect.ensuring(Console.log("spinner cleanup")))
//   )

//   // 2) 在 join 之前，父流程可自由插入其他邏輯
//   yield* Console.log("Parent doing other work")
//   yield* Effect.sleep("500 millis")
//   yield* Console.log("Parent done, now waiting for results")

//   // 3) Fiber.join：阻塞等待成功值（錯誤會以失敗重新拋出）
//   const a = yield* Fiber.join(fiberA)
//   const exitA = yield* Fiber.await(fiberA)
//   yield* Console.log(exitA)
//   const b = yield* Fiber.join(fiberB)
//   const exitB = yield* Fiber.await(fiberB)
//   yield* Console.log(exitB)

//   // 4) 取得把手即可取消背景 spinner
//   yield* Fiber.interrupt(spinnerFiber)

//   const sum = a + b
//   yield* Console.log(`sum: ${sum}`)

//   return sum
// })

// Effect.runFork(program)
// 輸出：
// Parent doing other work
// [A] start
// [B] start
// working...
// working...
// Parent done, now waiting for results
// working...
// [A] done
// { _id: 'Exit', _tag: 'Success', value: 1 }
// working...
// working...
// [B] done
// { _id: 'Exit', _tag: 'Success', value: 2 }
// spinner cleanup
// sum: 3

{
  const program = Effect.gen(function*() {
    const fiber1 = yield* Effect.fork(Effect.succeed("報表已產生"))
    const fiber2 = yield* Effect.fork(Effect.succeed("通知已送出"))

    const fiber = Fiber.zip(fiber1, fiber2)

    const tuple = yield* Fiber.join(fiber)
    console.log(tuple)
  })

  Effect.runFork(program)
}

{
  const program = Effect.gen(function*() {
    const fiber1 = yield* Effect.fork(Effect.succeed("咖啡已煮好"))
    const fiber2 = yield* Effect.fork(Effect.succeed("可頌已出爐"))

    // 使用 zipWith 將兩個字串自訂合併為一句話
    const fiber = Fiber.zipWith(fiber1, fiber2, (a, b) => `${a}，接著是${b}，早餐準備完成 🎉`)
    const message = yield* Fiber.join(fiber)
    console.log(message)
  })

  Effect.runFork(program)
}

{
  const program = Effect.gen(function*() {
    // 啟動一個會失敗的 Fiber
    const fiber1 = yield* Effect.fork(Effect.fail("主要任務失敗：網路逾時"))
    // 再啟動另一個會成功的 Fiber
    const fiber2 = yield* Effect.fork(Effect.succeed("使用備援方案成功：回傳快取結果"))

    // 如果 fiber1 失敗，就改用 fiber2 的結果
    const fiber = Fiber.orElse(fiber1, fiber2)
    const message = yield* Fiber.join(fiber)
    console.log(message)
  })

  Effect.runFork(program)
}

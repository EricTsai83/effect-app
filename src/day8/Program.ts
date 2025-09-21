import { Effect, Exit, Fiber } from "effect"

// try {
//   Effect.runSync(Effect.fail("my error"))
// } catch (e) {
//   console.error(e) // (FiberFailure) Error: my error
// }

// try {
//   Effect.runSync(Effect.promise(() => Promise.resolve(1)))
// } catch (e) {
//   console.error(e) // (FiberFailure) AsyncFiberException: Fiber #0 cannot be resolved synchronously. This is caused by using runSync on an effect that performs async work
// }

// const program = Effect.runSyncExit(Effect.succeed(1))

// console.log(program)

// function wait(ms: number): Promise<string> {
//   return new Promise((resolve) => setTimeout(() => resolve("resolved!"), ms))
// }
// //         ┌─── Promise<string>
// //         ▼
// const asyncProgram = Effect.runPromise(
//   Effect.promise(() => wait(10))
// )
// asyncProgram.then((value) => console.log(value))

// //       ┌─── Promise<never>
// //       ▼
// const asyncProgram = Effect.runPromise(Effect.fail("my error")).catch(console.error)
// console.log(asyncProgram)

// 一個會在 1 秒後完成的效果
const program = Effect.async<number>((resume) => {
  setTimeout(() => resume(Effect.succeed(42)), 1000)
})

// 啟動背景 fiber
const fiber = Effect.runFork(program)

// 0.5 秒後嘗試中斷
setTimeout(() => {
  Effect.runFork(Fiber.interrupt(fiber))
}, 500)

// 等待 fiber 結束並檢查是否被中斷
Effect.runPromise(Fiber.await(fiber)).then((exit) => {
  console.log("Exit:", exit)
  console.log("是否被中斷:", Exit.isInterrupted(exit)) // 期望為 true
})

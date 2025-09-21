import { Effect, Fiber } from "effect"
import * as NodeFS from "node:fs"

//         ┌─── number
//         ▼
function divide(a: number, b: number) {
  if (b === 0) throw new Error("Cannot divide by zero")
  //      ┌─── number
  //      ▼
  const result = a / b
  return result
}

divide(10, 2)
//          ┌─── Effect.Effect<never, Error, never> | Effect.Effect<number, never, never>
//          ▼
function divideEff(a: number, b: number) {
  if (b === 0) {
    //      ┌─── Effect.Effect<never, Error, never>
    //      ▼
    const error = Effect.fail(new Error("Cannot divide by zero"))
    return error
  }

  //       ┌─── Effect.Effect<number, never, never>
  //       ▼
  const success = Effect.succeed(a / b)
  return success
}

Effect.runSync(divideEff(10, 2))

//                                ┌─── 0.123456...
//                                ▼
const randomEff = Effect.succeed(Math.random())
console.log(Effect.runSync(randomEff)) // 與前面的 Math.random() 結果相同（被固定住了）

function drawRandom() {
  return Effect.sync(() => Math.random())
}
//      ┌─── Effect.Effect<number, never, never>
//      ▼
const program = drawRandom()
Effect.runSync(program)

//      ┌─── Effect.Effect<never, never, never>
//      ▼
const NEVER = Effect.sync(() => {
  throw new Error("will cause a defect")
})
Effect.runSync(NEVER)

//      ┌─── Effect.Effect<never, UnknownException, never>
//      ▼
const program2 = Effect.try(() => {
  throw new Error("effect will automatically catch the error")
})
Effect.runSync(program2)

class JsonParseError extends Error {}

//       ┌─── Effect.Effect<any, JsonParseError, never>
//       ▼
const program3 = Effect.try({
  try: () => JSON.parse("invalid json"),
  catch: (_unknownError) => new JsonParseError("json parse error")
})
Effect.runSync(program3)

function wait(ms: number): Promise<string> {
  return new Promise((resolve) => setTimeout(() => resolve("resolved!"), ms))
}
//       ┌─── Effect.Effect<string, never, never>
//       ▼
const program4 = Effect.promise(() => wait(1000))
Effect.runPromise(program4)

//          ┌─── Effect.Effect<Response, UnknownException, never>
//          ▼
function getTodo(id: number) {
  // Will catch any errors and propagate them as UnknownException
  return Effect.tryPromise(() => fetch(`https://jsonplaceholder.typicode.com/todos/${id}`))
}

//      ┌─── Effect<Response, UnknownException, never>
//      ▼
const program5 = getTodo(1)
Effect.runPromise(program5)

class FetchError extends Error {}
//       ┌─── Effect.Effect<Response, FetchError, never>
//       ▼
function getTodo2(id: number) {
  return Effect.tryPromise({
    try: () => fetch(`https://jsonplaceholder.typicode.com/todos/${id}`),
    catch: (unknown) => new FetchError(`something went wrong ${unknown}`)
  })
}
//       ┌─── Effect.Effect<Response, FetchError, never>
//       ▼
const program6 = getTodo2(1)
Effect.runPromise(program6)

//          ┌─── Effect.Effect<Buffer<ArrayBufferLike>, Error, never>
//          ▼
function readFile(filename: string) {
  return Effect.async<Buffer, Error>((resume) => {
    NodeFS.readFile(filename, (error, data) => {
      if (error) {
        resume(Effect.fail(error))
      } else {
        resume(Effect.succeed(data))
      }
    })
  })
}
//       ┌─── Effect.Effect<Buffer<ArrayBufferLike>, Error, never>
//       ▼
const program7 = readFile("package.json")
Effect.runPromise(program7)

// Advanced Usage
// Simulates a long-running operation to write to a file
const writeFileWithCleanup = (filename: string, data: string) =>
  Effect.async<void, Error>((resume) => {
    const writeStream = NodeFS.createWriteStream(filename)

    // Start writing data to the file
    writeStream.write(data)

    // When the stream is finished, resume with success
    writeStream.on("finish", () => resume(Effect.void))

    // In case of an error during writing, resume with failure
    writeStream.on("error", (err) => resume(Effect.fail(err)))

    // Handle interruption by returning a cleanup effect
    return Effect.sync(() => {
      console.log(`Cleaning up ${filename}`)
      NodeFS.unlinkSync(filename)
    })
  })

const program8 = Effect.gen(function*() {
  const fiber = yield* Effect.fork(
    writeFileWithCleanup("example.txt", "Some long data...")
  )
  // Simulate interrupting the fiber after 1 second
  yield* Effect.sleep("1 second")
  yield* Fiber.interrupt(fiber) // This will trigger the cleanup
})

// Run the program
Effect.runPromise(program8)
/*
Output:
Cleaning up example.txt
*/

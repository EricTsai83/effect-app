import { Effect } from "effect"

function divideEff(a: number, b: number): Effect.Effect<number, Error, never> {
  if (b === 0) {
    //      ┌─── Effect.Effect<number, never, never>
    //      ▼
    const error = Effect.fail(new Error("Cannot divide by zero"))
    return error
  }

  //      ┌─── Effect.Effect<number, never, never>
  //      ▼
  const success = Effect.succeed(a / b)
  return success
}

Effect.runPromise(divideEff(10, 0))

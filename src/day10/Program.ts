import { Console, Effect, pipe } from "effect"

{
  //       ┌─── Effect.Effect<number, never, never>
  //       ▼
  const getDate = Effect.sync(() => Date.now())
  //       ┌─── Effect.Effect<string, never, never>
  //       ▼
  const program = pipe(
    getDate, // Effect.Effect<number, never, never>
    Effect.map((x) => x * 2), // Effect.Effect<number, never, never>
    Effect.map((x) => x.toString()), // Effect.Effect<string, never, never>
    Effect.map((x) => x.toUpperCase()) // Effect.Effect<string, never, never>
  )

  console.log(Effect.runSync(program))
}

//       ┌─── Effect.Effect<never, Error, never> | Effect.Effect<number, never, never>
//       ▼
const divide = (a: number, b: number) =>
  b === 0
    ? Effect.fail(new Error("Cannot divide by zero"))
    : Effect.succeed(a / b)
{
  //       ┌─── Effect.Effect<Effect.Effect<number, Error, never>, never, never>
  //       ▼
  const program = pipe(
    // Effect.Effect<number[], never, never>
    Effect.succeed([25, 5]),
    // Effect.Effect<Effect.Effect<never, Error, never> | Effect.Effect<number, never, never>, E, R>
    Effect.map(([a, b]) => divide(a, b))
  )

  const result = Effect.runSync(program)
  console.log(result)
}

{
  const program = pipe(
    Effect.succeed([25, 5] as const),
    Effect.flatMap(([a, b]) => divide(a, b))
  )
  const result = Effect.runSync(program)
  console.log(result)
}

{
  const program = pipe(
    Effect.sync(() => Date.now()),
    Effect.map((x) => x * 2),
    Effect.map((x) => {
      console.log("after double:", x)
      return x
    }),
    Effect.map((x) => x.toString()),
    Effect.map((x) => x.toUpperCase())
  )
  const result = Effect.runSync(program)
  console.log(result)
}

{
  const program = pipe(
    Effect.sync(() => Date.now()),
    Effect.map((x) => x * 2),
    Effect.tap((x) => Effect.sync(() => console.log("after double:", x))),
    Effect.map((x) => x.toString()),
    Effect.map((x) => x.toUpperCase())
  )

  const result = Effect.runSync(program)
  console.log(result)
}

{
  const program = pipe(
    Effect.succeed(5),
    Effect.as("new value")
  )
  Effect.runPromise(program).then(console.log) // "new value"
}

{
  const now = Effect.sync(() => Date.now())
  const yesterday = Effect.sync(() => Date.now() - 24 * 60 * 60 * 1000)

  const arrProgram = pipe(
    Effect.all([now, yesterday]),
    Effect.map(([a, b]) => a + b)
  )

  const objProgram = pipe(
    Effect.all({ a: now, b: yesterday }),
    Effect.map(({ a, b }) => a + b)
  )
  console.log(Effect.runSync(arrProgram))
  console.log(Effect.runSync(objProgram))
}

{
  const keepRight = Effect.zipRight(Effect.succeed(5), Console.log("hi"))
  const keepLeft = Effect.zipLeft(Effect.succeed("hi"), Effect.succeed(10))

  const base = Effect.succeed(5)
  const a = Effect.andThen(base, "ok")
  const b = Effect.andThen(base, Promise.resolve("ok"))
  const c = Effect.andThen(base, Effect.succeed("ok"))
  const d = Effect.andThen(base, (x) => `ok ${x}`)

  console.log("keepRight", Effect.runSync(keepRight)) // undefined
  console.log("keepLeft", Effect.runSync(keepLeft)) // hi
  console.log("a", Effect.runSync(a)) // ok
  console.log("b", Effect.runPromise(b)) // Promise { <pending> }
  console.log("c", Effect.runSync(c)) // ok
  console.log("d", Effect.runSync(d)) // ok 5
}

{
  const programBefore = pipe(
    Effect.sync(() => Date.now()),
    Effect.map((x) => x * 2),
    Effect.flatMap((x) => divide(x, 3)),
    Effect.map((x) => x.toString())
  )

  const programAfter = Effect.gen(function*() {
    const x = yield* Effect.sync(() => Date.now())
    const y = x * 2
    const z = yield* divide(y, 3)
    return z.toString()
  })

  console.log(Effect.runSync(programBefore))
  console.log(Effect.runSync(programAfter))
}

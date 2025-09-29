import { Console, Effect } from "effect"

{
  // const mustBeMinLen = (s: string, min: number) => s.length >= min ? Effect.succeed(s) : Effect.fail(`length < ${min}`)

  // const mustInclude = (s: string, token: string) =>
  //   s.includes(token) ? Effect.succeed(s) : Effect.fail(`missing "${token}"`)

  // const program = Effect.zip(
  //   mustBeMinLen("ab", 3), // 失敗
  //   mustInclude("foobar", "@") // 不會執行（因為左側先失敗
  // )

  // Effect.runSync(
  //   Effect.match(program, {
  //     onSuccess: ([a, b]) => console.log("OK:", a, b),
  //     onFailure: (err) => console.log("ERROR:", err)
  //   })
  // )
}

{
  // const mustBePositive = (n: number, index: number) =>
  //   n > 0 ? Effect.succeed(n) : Effect.fail(`not positive: ${n} at index ${index}`)

  // const numbers = [2, -1, -2, 3]

  // const program = Effect.forEach(numbers, (n, index) => mustBePositive(n, index))

  // Effect.runSync(
  //   Effect.match(program, {
  //     onSuccess: (values) => console.log("OK:", values),
  //     onFailure: (err) => console.log("ERROR:", err)
  //   })
  // )
}

{
  // const getData = (id: number) => id > 1 ? Effect.fail(`Data ${id}`) : Effect.succeed(`Data ${id}`)

  // const program = Effect.all([
  //   getData(1),
  //   getData(2),
  //   getData(3)
  // ])

  // Effect.runSync(
  //   Effect.match(program, {
  //     onSuccess: (results) => console.log("OK:", results),
  //     onFailure: (err) => console.log("ERROR:", err)
  //   })
  // )
}

{
  // 驗證字串是否為整數格式（可選正負號 + 數字）
  const isIntegerString = (s: string) => /^[+-]?\d+$/.test(s) ? Effect.succeed(s) : Effect.fail(`not int: "${s}"`)

  // 驗證數字是否在指定範圍內
  const isWithinRange = (n: number, min: number, max: number) =>
    n >= min && n <= max
      ? Effect.succeed(n)
      : Effect.fail(`out of range [${min}, ${max}]: ${n}`)

  // 將字串解析為整數，先驗證格式再轉換
  const parseToInt = (s: string) => Effect.flatMap(isIntegerString(s), (ok) => Effect.succeed(parseInt(ok, 10)))

  // 使用 Effect.validate 來收集所有驗證錯誤
  // 這會執行所有驗證並收集所有失敗的錯誤，而不是在第一個錯誤時就停止
  const task1 = Effect.flatMap(parseToInt("42"), (n) => isWithinRange(n, 0, 100)) // 成功
  const task2 = parseToInt("abc") // 失敗：不是整數
  const task3 = Effect.flatMap(parseToInt("150"), (n) => isWithinRange(n, 0, 100)) // 失敗：超出範圍

  const program = task1.pipe(
    Effect.validate(task2),
    Effect.validate(task3)
  )

  // 執行 Effect 並處理結果
  Effect.runPromiseExit(program).then(console.log)
}

{
  // //      ┌─── Effect<number, string[], never>
  // //      ▼
  // const program = Effect.validateAll([1, 2, 3, 4, 5], (n) => {
  //   if (n < 4) {
  //     return Console.log(`item ${n}`).pipe(Effect.as(n))
  //   } else {
  //     return Effect.fail(`${n} is not less that 4`)
  //   }
  // })

  // // 執行 Effect 並處理結果
  // Effect.runPromiseExit(program).then(console.log)
}

// 加在這下方
{
  // //      ┌─── Effect<[string[], number[]], never, never>
  // //      ▼
  // const program = Effect.partition([0, 1, 2, 3, 4], (n) => {
  //   if (n % 2 === 0) {
  //     return Effect.succeed(n)
  //   } else {
  //     return Effect.fail(`${n} is not even`)
  //   }
  // })

  // Effect.runPromise(program).then(console.log, console.error)
}

{
  // const program = Effect.validateFirst([1, 2, 3, 4, 5], (n) => {
  //   if (n < 4) {
  //     return Effect.fail(`${n} is not less that 4`)
  //   } else {
  //     return Console.log(`item ${n}`).pipe(Effect.as(n))
  //   }
  // })

  // Effect.runPromise(program).then(console.log, console.error)
}

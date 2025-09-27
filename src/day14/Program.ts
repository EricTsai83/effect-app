import { Effect } from "effect"

// class FooError {
//   readonly _tag = "FooError"
//   constructor(readonly message = "Foo failed") {}
// }

// class BarError {
//   readonly _tag = "BarError"
//   constructor(readonly message = "Bar failed") {}
// }

// const conditions = [true, true, true] as [boolean, boolean, boolean]

// const errors = Effect.gen(function*() {
//   if (conditions[0]) {
//     return yield* Effect.fail(new FooError())
//   } else if (conditions[1]) {
//     return yield* Effect.fail(new BarError())
//   } else if (conditions[2]) {
//     return yield* Effect.die("Boom") // 非期望錯誤
//   }
//   return "Success"
// })

// // Effect.runSync(errors)

// /**
// node:internal/modules/run_main:123
//     triggerUncaughtException(
//     ^

// [Error: {"_tag":"FooError","message":"Foo failed"}] {
//   name: '(FiberFailure) Error',
//   [Symbol(effect/Runtime/FiberFailure)]: Symbol(effect/Runtime/FiberFailure),
//   [Symbol(effect/Runtime/FiberFailure/Cause)]: {
//     _tag: 'Fail',
//     error: FooError { _tag: 'FooError', message: 'Foo failed' }
//   }
// }
// */

// {
//   const _program = Effect.gen(function*() {
//     yield* Console.log("1")
//     return yield* Effect.fail(new Error("Boom")) // 這行會失敗，程式短路
//     yield* Console.log("2") // 這行不會執行
//   })

//   // Effect.runPromise(program).catch((e) => console.error("program:", e))
// }

// {
//   // 統一處理所有期望錯誤
//   const program = errors.pipe(
//     Effect.catchAll((e) => Effect.succeed(`Handled ${e._tag}`))
//   )
//   Effect.runSync(program) // 什麼輸出沒有
//   Effect.runPromise(program).then(console.log) // -> "Handled FooError"
// }

// {
//   //       ┌─── Effect.Effect<string, never, never>
//   //       ▼
//   const program = errors.pipe(
//     Effect.catchTags({
//       FooError: () => Effect.succeed("Handled Foo"),
//       BarError: () => Effect.succeed("Handled Bar")
//     })
//   )
//   Effect.runSync(program)
// }

// {
//   //       ┌─── Effect.Effect<string, BarError, never>
//   //       ▼
//   const program = errors.pipe(
//     Effect.catchTags({
//       FooError: () => Effect.succeed("Handled Foo")
//     })
//   )
//   Effect.runSync(program)
// }

// {
//   // orElse：失敗時提供替代的成功 Effect
//   //       ┌─── Effect.Effect<string, never, never>
//   //       ▼
//   const _program1 = errors.pipe(Effect.orElse(() => Effect.succeed("Handled")))

//   class MyError extends Error {}
//   // orElseFail：把任何期望錯誤映射成單一新錯誤
//   //       ┌─── Effect.Effect<string, MyError, never>
//   //       ▼
//   const _program2 = errors.pipe(Effect.orElseFail(() => new MyError()))

//   // mapError：轉換錯誤（仍是失敗），保留失敗語義
//   //       ┌─── Effect.Effect<string, Error, never>
//   //       ▼
//   const _program3 = errors.pipe(
//     Effect.mapError((oldErr) => new Error(`error: ${String(oldErr)}`))
//   )

//   // match：把成功/失敗折疊成一個純值
//   //       ┌─── Effect.Effect<string, never, never>
//   //       ▼
//   const _program4 = errors.pipe(
//     Effect.match({
//       onSuccess: (x) => `success: ${x}`,
//       onFailure: (e) => `handled error: ${e}`
//     })
//   )

//   // matchEffect：像 match，但回傳 Effect，兩側更有彈性
//   //       ┌─── Effect.Effect<string, never, never>
//   //       ▼
//   const _program5 = errors.pipe(
//     Effect.matchEffect({
//       onSuccess: (x) => Effect.succeed(`success: ${x}`),
//       onFailure: (e) => Effect.succeed(`handled error: ${e}`)
//     })
//   )

//   // firstSuccessOf：多個候選 Effect，取第一個成功者，如果全部失敗會回傳最後一個失敗結果
//   //       ┌─── Effect.Effect<string, Error, never>
//   //       ▼
//   const _program6 = Effect.firstSuccessOf([
//     Effect.fail(new Error("fail")),
//     Effect.succeed("success")
//   ])
// }

// {
//   const mightFail = Effect.sync(() => Math.random()).pipe(
//     Effect.flatMap((r) => r > 0.5 ? Effect.fail(new Error("fail")) : Effect.succeed(r))
//   )
//   Effect.runSync(mightFail)
// }

// {
//   const handledGen1 = Effect.gen(function*() {
//     const r = yield* Effect.sync(() => Math.random())
//     if (r > 0.5) {
//       return yield* Effect.fail(new Error("fail"))
//     }
//     return yield* Effect.succeed(r * 2)
//   }).pipe(Effect.catchAll(() => Effect.succeed(-1)))

//   Effect.runPromise(handledGen1).then((n) => console.log("A:", n))
// }

// {
//   const mightFail = Effect.sync(() => Math.random()).pipe(
//     Effect.flatMap((r) => r > 0.5 ? Effect.fail(new Error("fail")) : Effect.succeed(r))
//   )

//   const handledGen2 = Effect.gen(function*() {
//     const r = yield* pipe(mightFail, Effect.catchAll(() => Effect.succeed(-1)))
//     return r * 2
//   })

//   Effect.runPromise(handledGen2).then((n) => console.log("B:", n))
// }

// {
//   const mightFail = Effect.sync(() => Math.random()).pipe(
//     Effect.flatMap((r) => r > 0.5 ? Effect.fail(new Error("fail")) : Effect.succeed(r))
//   )

//   const handledGen3 = Effect.gen(function*() {
//     const either = yield* Effect.either(mightFail)
//     if (Either.isRight(either)) {
//       return either.right * 2
//     } else {
//       console.error("C error:", either.left.message)
//       return -1
//     }
//   })
//   Effect.runPromise(handledGen3).then((n) => console.log("C:", n))
// }

{
  // ============================================================================
  // 1. 定義網域錯誤類型 (Domain Error Types)
  // ============================================================================
  // 這些是我們應用程式中可能發生的錯誤，每個都有明確的語義

  /** 缺少必要的環境變數設定 */
  class MissingConfigError {
    readonly _tag = "MissingConfigError"
    constructor(readonly key: string) {}
  }

  /** HTTP 請求失敗 */
  class HttpError {
    readonly _tag = "HttpError"
    constructor(readonly status: number, readonly url: string) {}
  }

  /** JSON 解析失敗 */
  class ParseError {
    readonly _tag = "ParseError"
    constructor(readonly reason: string) {}
  }

  // ============================================================================
  // 2. 低層資料來源 (Data Sources)
  // ============================================================================
  // 這些函數負責從外部系統獲取資料，並將可能的錯誤轉換成我們的網域錯誤

  /**
   * 從環境變數中獲取設定值
   * @param key 環境變數的鍵名
   * @returns Effect 成功時返回設定值，失敗時返回 MissingConfigError
   */
  function getConfig(key: string) {
    return Effect.sync(() => process.env[key]).pipe(
      Effect.flatMap((value) =>
        value
          ? Effect.succeed(value)
          : Effect.fail(new MissingConfigError(key))
      )
    )
  }

  /**
   * 模擬 API 回應 - 用於測試不同情況
   * @param url 請求的 URL
   * @returns 模擬的 API 回應資料
   */
  function mockApiResponse(url: string) {
    if (url.includes("/users")) {
      return {
        users: [
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
          { id: 3, name: "Charlie" }
        ]
      }
    }
    if (url.includes("/error")) {
      throw new HttpError(500, url)
    }
    if (url.includes("/invalid")) {
      return "invalid json" // 故意返回無效的 JSON
    }
    return { data: "success" }
  }

  /**
   * 發送 HTTP 請求並解析 JSON 回應
   * @param url 請求的 URL
   * @returns Effect 成功時返回解析後的資料，失敗時返回 HttpError 或 ParseError
   */
  function fetchJson(url: string) {
    return Effect.tryPromise({
      try: async () => {
        // 模擬網路延遲
        await new Promise((resolve) => setTimeout(resolve, 100))

        // 模擬 API 回應
        const data = mockApiResponse(url)

        // 檢查是否為無效的 JSON 格式
        if (typeof data === "string") {
          throw new ParseError("Invalid JSON format")
        }

        return data as unknown
      },
      catch: (error) => {
        // 如果是我們定義的網域錯誤，直接返回
        if (error instanceof HttpError || error instanceof ParseError) {
          return error
        }
        // 其他錯誤轉換為標準 Error
        return new Error(String(error))
      }
    }).pipe(
      // 將非網域錯誤轉換為網域錯誤
      Effect.mapError((error) => {
        if (error instanceof HttpError || error instanceof ParseError) {
          return error
        }
        return new ParseError(error.message ?? "Unknown parse error")
      })
    )
  }

  // ============================================================================
  // 3. 應用層業務邏輯 (Application Layer)
  // ============================================================================
  // 組合低層函數來實現業務需求

  /**
   * 載入用戶列表的業務邏輯
   * 型別：Effect<never, MissingConfigError | HttpError | ParseError, User[]>
   */
  const loadUsers = Effect.gen(function*() {
    // 1. 獲取 API 基礎 URL
    const baseUrl = yield* getConfig("API_BASE") // 可能失敗：MissingConfigError

    // 2. 發送請求獲取用戶資料
    const responseData = yield* fetchJson(`${baseUrl}/users`) // 可能失敗：HttpError | ParseError

    // 3. 提取用戶列表
    const users = (responseData as any).users as Array<{ id: number; name: string }>
    return users
  })

  // ============================================================================
  // 4. 表現層錯誤處理 (Presentation Layer)
  // ============================================================================
  // 將業務錯誤轉換為用戶友好的訊息

  /**
   * 處理載入用戶的結果，將所有可能的錯誤轉換為統一的回應格式
   * 型別：Effect<never, never, { ok: true; users: User[] } | { ok: false; message: string }>
   */
  const programUsers = loadUsers.pipe(
    // 使用 catchTags 精確處理每種錯誤類型
    Effect.catchTags({
      MissingConfigError: (error) =>
        Effect.succeed({
          ok: false,
          message: `缺少設定：${error.key}`
        }),
      HttpError: (error) =>
        Effect.succeed({
          ok: false,
          message: `API 錯誤：${error.status}`
        }),
      ParseError: (error) =>
        Effect.succeed({
          ok: false,
          message: error.reason
        })
    }),
    // 將成功結果包裝成統一的格式
    Effect.map((result) =>
      Array.isArray(result)
        ? { ok: true, users: result }
        : result
    )
  )

  // ============================================================================
  // 5. 測試與示範 (Testing & Demonstration)
  // ============================================================================
  // 展示不同錯誤情況的處理方式

  /**
   * 統一的錯誤處理函數，用於所有測試
   * @param result 處理結果
   * @param testName 測試名稱
   */
  function handleTestResult(result: any, testName: string) {
    if (result.ok && "users" in result) {
      console.log(`✅ ${testName} - 載入成功，用戶數：${result.users.length}`)
      console.log("   用戶列表：", result.users)
    } else if ("message" in result) {
      console.log(`❌ ${testName} - 載入失敗：${result.message}`)
    }
  }

  /**
   * 創建一個會觸發特定錯誤的載入用戶函數
   * @param endpoint API 端點
   * @returns 處理後的 Effect
   */
  function createLoadUsersWithEndpoint(endpoint: string) {
    const loadUsersWithEndpoint = Effect.gen(function*() {
      const baseUrl = yield* getConfig("API_BASE")
      const data = yield* fetchJson(`${baseUrl}${endpoint}`)
      const users = (data as any).users as Array<{ id: number; name: string }>
      return users
    })

    return loadUsersWithEndpoint.pipe(
      Effect.catchAll((error) => {
        if (error instanceof MissingConfigError) {
          return Effect.succeed({ ok: false, message: `缺少設定：${error.key}` })
        }
        if (error instanceof HttpError) {
          return Effect.succeed({ ok: false, message: `API 錯誤：${error.status}` })
        }
        if (error instanceof ParseError) {
          return Effect.succeed({ ok: false, message: error.reason })
        }
        return Effect.succeed({ ok: false, message: `未處理的錯誤：${String(error)}` })
      }),
      Effect.map((result) => (Array.isArray(result) ? { ok: true, users: result } : result))
    )
  }

  /**
   * 執行所有測試案例
   */
  async function runErrorHandlingTests() {
    console.log("🚀 開始執行錯誤處理測試...\n")

    // 測試 1: 正常情況 - 成功載入用戶
    console.log("=== 測試 1: 正常情況 ===")
    process.env.API_BASE = "https://api.example.com"
    const result1 = await Effect.runPromise(programUsers)
    handleTestResult(result1, "正常情況")

    // 測試 2: 缺少環境變數 - 觸發 MissingConfigError
    console.log("\n=== 測試 2: 缺少環境變數 ===")
    delete process.env.API_BASE
    const result2 = await Effect.runPromise(programUsers)
    handleTestResult(result2, "缺少環境變數")

    // 測試 3: HTTP 錯誤 - 觸發 HttpError
    console.log("\n=== 測試 3: HTTP 錯誤 ===")
    process.env.API_BASE = "https://api.example.com"
    const result3 = await Effect.runPromise(createLoadUsersWithEndpoint("/error"))
    handleTestResult(result3, "HTTP 錯誤")

    // 測試 4: JSON 解析錯誤 - 觸發 ParseError
    console.log("\n=== 測試 4: JSON 解析錯誤 ===")
    const result4 = await Effect.runPromise(createLoadUsersWithEndpoint("/invalid"))
    handleTestResult(result4, "JSON 解析錯誤")

    console.log("\n✨ 所有測試完成！")
  }

  // 執行測試
  runErrorHandlingTests().catch(console.error)
}

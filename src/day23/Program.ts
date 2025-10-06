import { Context, Effect, Layer } from "effect"

{
  // // 服務定義：提供讀取設定的方法
  // class Config extends Context.Tag("Config")<
  //   Config,
  //   {
  //     readonly getConfig: Effect.Effect<{
  //       readonly logLevel: string
  //       readonly connection: string
  //     }>
  //   }
  // >() {}

  // //        ┌─── Layer<Config, never, never>
  // //        ▼
  // const ConfigLive = Layer.succeed(Config, {
  //   getConfig: Effect.succeed({
  //     logLevel: "INFO",
  //     connection: "mysql://username:password@hostname:3306/database_name"
  //   })
  // })

  // class Logger extends Context.Tag("Logger")<
  //   Logger,
  //   {
  //     readonly log: (message: string) => Effect.Effect<void>
  //   }
  // >() {}

  // //        ┌─── Layer<Logger, never, Config>
  // //        ▼
  // const LoggerLive = Layer.effect(
  //   Logger,
  //   Effect.gen(function*() {
  //     const config = yield* Config
  //     const { logLevel } = yield* config.getConfig
  //     return {
  //       log(message) {
  //         return Effect.sync(() => {
  //           console.log(`[${logLevel}] ${message}`)
  //         })
  //       }
  //     }
  //   })
  // )

  // class Database extends Context.Tag("Database")<
  //   Database,
  //   { readonly query: (sql: string) => Effect.Effect<unknown> }
  // >() {}

  // //         ┌─── Layer<Database, never, Logger | Config>
  // //         ▼
  // const DatabaseLivePrimary = Layer.effect(
  //   Database,
  //   Effect.gen(function*() {
  //     // 模擬主資料庫失敗，觸發 Layer.catchAll 的降級路徑
  //     return yield* Effect.fail(new Error("Primary database connection failed (simulated)"))
  //   })
  // )

  // //         ┌─── Layer<Database, never, Logger>
  // //         ▼
  // const InMemoryDatabaseLive = Layer.effect(
  //   Database,
  //   Effect.gen(function*() {
  //     const logger = yield* Logger
  //     const connection = "in-memory://db"
  //     return {
  //       query: (sql: string) =>
  //         Effect.gen(function*() {
  //           yield* logger.log(`Executing query (memory): ${sql}`)
  //           return { result: `Results from ${connection}` }
  //         })
  //     }
  //   })
  // )

  // //         ┌─── Layer.Layer<Database, never, Config | Logger>
  // //         ▼
  // const DatabaseLive = DatabaseLivePrimary.pipe(
  //   Layer.catchAll((e) => {
  //     console.log(`Recovering from error\n${String(e)}`)
  //     return InMemoryDatabaseLive
  //   })
  // )

  // //         ┌─── Layer<Config | Logger, never, Config>
  // //         ▼
  // const AppConfigLive = Layer.merge(ConfigLive, LoggerLive)

  // //       ┌─── Layer<Config | Database, never, never>
  // //       ▼
  // const MainLive = DatabaseLive.pipe(
  //   Layer.provide(AppConfigLive),
  //   Layer.provideMerge(ConfigLive)
  // )

  // //      ┌── Effect<unknown, never, Database>
  // //      ▼
  // const program = Effect.gen(function*() {
  //   const database = yield* Database
  //   const result = yield* database.query("SELECT * FROM users")
  //   return result
  // })

  // //      ┌── Effect<unknown, never, never>
  // //      ▼
  // const runnable = Effect.provide(program, MainLive)

  // Effect.runPromise(runnable).then(console.log)
  // /*
  // 輸出:
  // [INFO] Executing query: SELECT * FROM users
  // {
  //   result: 'Results from mysql://username:password@hostname:3306/database_name'
  // }
  // */
}

// 分層備援機制（Layer Fallbacks）示範：
// 目標：優先走「主路徑」（Database），失敗時自動降級到「唯讀路徑」（Cache），最終保底到「空結果」。
// 說明：以 Context.Tag 定義服務契約，以 Layer 建構實作，並用 provide/catchAll 串接降級鏈。
{
  // 服務契約：快取（Read-only）。提供以 key 讀取字串值。
  class Cache extends Context.Tag("Cache")<Cache, {
    readonly get: (key: string) => Effect.Effect<string | undefined>
  }>() {}
  // 服務契約：資料庫。以查詢字串回傳結果清單。
  class Database extends Context.Tag("Database")<Database, {
    readonly find: (q: string) => Effect.Effect<ReadonlyArray<string>>
  }>() {}
  // 服務契約：搜尋。對外暴露單一 run 方法。
  class Search extends Context.Tag("Search")<Search, {
    readonly run: (q: string) => Effect.Effect<ReadonlyArray<string>>
  }>() {}

  // 主路徑：Search 直接委派給 Database（完整功能）
  const SearchLivePrimary = Layer.effect(
    Search,
    Effect.gen(function*() {
      const db = yield* Database
      return {
        run: (q: string) => db.find(q)
      }
    })
  )

  // 次級路徑（唯讀）：Search 透過 Cache 回應。命中快取則回傳命中結果，否則回傳空陣列（對外一致）。
  const SearchReadOnlyLive = Layer.effect(
    Search,
    Effect.gen(function*() {
      const cache = yield* Cache
      return {
        run: (q: string) =>
          Effect.gen(function*() {
            const hit = yield* cache.get(`search:${q}`)
            return hit ? [hit] : []
          })
      }
    })
  )

  // 測試模式：控制各種情境
  // - "dbSuccess": 資料庫可用（主路徑）
  // - "cacheHit": 快取命中（唯讀降級）
  // - "cacheMiss": 快取未命中（最終降級）
  type TestMode = "cacheMiss" | "cacheHit" | "dbSuccess"
  const TEST_MODE = "cacheHit" as TestMode
  const QUERY = "hihi"
  console.log("TEST_MODE", TEST_MODE)

  // 小工具：將多個 Layer 依序串接，若前者失敗則切換到下一個（降級鏈）
  function withFallbacks<S, E, R>(
    first: Layer.Layer<S, E, R>,
    ...fallbacks: ReadonlyArray<Layer.Layer<S, E, R>>
  ): Layer.Layer<S, E, R> {
    return fallbacks.reduce(
      (acc, fb) => acc.pipe(Layer.catchAll(() => fb)),
      first
    )
  }

  function buildCacheLayer(mode: TestMode): Layer.Layer<Cache, unknown, never> {
    // 情境：快取命中時，直接以快取提供資料
    if (mode === "cacheHit") {
      return Layer.effect(
        Cache,
        Effect.succeed({
          get: (key: string) => Effect.succeed(key === `search:${QUERY}` ? `cache:${QUERY}` : undefined)
        })
      )
    }
    // 真實快取（Redis）：此處故意失敗以模擬不可用
    const CacheRedisLive = Layer.effect(
      Cache,
      Effect.fail(new Error("Redis unavailable (simulated)"))
    )
    // 後備快取（記憶體）：永遠可用，但預設沒有資料
    const CacheInMemoryLive = Layer.effect(
      Cache,
      Effect.succeed({
        get: (_key: string) => Effect.succeed<string | undefined>(undefined)
      })
    )
    // 先試 Redis，失敗則降級到記憶體快取
    return CacheRedisLive.pipe(Layer.catchAll(() => CacheInMemoryLive))
  }

  function buildDatabaseLayer(mode: TestMode): Layer.Layer<Database, unknown, never> {
    // 成功情境：資料庫可用
    if (mode === "dbSuccess") {
      return Layer.effect(Database, Effect.succeed({ find: (q: string) => Effect.succeed([`db:${q}`]) }))
    }
    // 失敗情境：模擬主資料庫連線失敗
    return Layer.effect(Database, Effect.fail(new Error("Primary database connection failed (simulated)")))
  }

  // 依 TEST_MODE 建立對應的快取與資料庫 Layer
  const CacheLayer = buildCacheLayer(TEST_MODE)
  const DatabaseLayer = buildDatabaseLayer(TEST_MODE)

  // 最終降級：回傳空清單，維持服務可用性
  const DegradedSearchLive = Layer.succeed(Search, { run: (_q: string) => Effect.succeed([]) })
  // 組合降級鏈：Primary -> ReadOnly -> Degraded
  const SearchLive = withFallbacks(
    SearchLivePrimary.pipe(Layer.provide(DatabaseLayer)),
    SearchReadOnlyLive.pipe(Layer.provide(CacheLayer)),
    DegradedSearchLive
  )

  // 系統注入：此例中只需提供 Search 即可
  const MainLive = SearchLive

  // 應用程式：呼叫 Search.run 並回傳結果
  const program = Effect.gen(function*() {
    const search = yield* Search
    const results = yield* search.run(QUERY)
    return results
  })

  // 提供 Layer 並執行
  const runnable = Effect.provide(program, MainLive)
  Effect.runPromise(runnable).then(console.log).catch(console.error)
}

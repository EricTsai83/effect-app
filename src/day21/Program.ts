import { Context, Effect, Layer } from "effect"
import * as assert from "node:assert"

{
  // // Config 與 Logger：僅作為示意
  // class Config extends Context.Tag("Config")<Config, object>() {}
  // class Logger extends Context.Tag("Logger")<Logger, object>() {}

  // // ❌ 錯誤示範：把依賴暴露在介面中
  // class Database extends Context.Tag("Database")<
  //   Database,
  //   {
  //     readonly query: (
  //       sql: string
  //     ) => Effect.Effect<unknown, never, Config | Logger>
  //   }
  // >() {}

  // // 測試替身 Test Double（假資料庫）
  // const DatabaseTest = Database.of({
  //   query: (_sql) => Effect.succeed([]) // 假裝查詢回傳 []
  // })

  // const test = Effect.gen(function*() {
  //   const database = yield* Database
  //   const result = yield* database.query("SELECT * FROM users")
  //   assert.deepStrictEqual(result, [])
  // })

  // //      ┌── Effect<void, never, Config | Logger>
  // //      ▼
  // const incompleteTestSetup = test.pipe(
  //   Effect.provideService(Database, DatabaseTest)
  // )

  // Effect.runSync(incompleteTestSetup)
}

// 服務定義：提供讀取設定的方法
class Config extends Context.Tag("Config")<
  Config,
  {
    readonly getConfig: Effect.Effect<{
      readonly logLevel: string
      readonly connection: string
    }>
  }
>() {}

//        ┌─── Layer<Config, never, never>
//        ▼
const ConfigLive = Layer.succeed(Config, {
  getConfig: Effect.succeed({
    logLevel: "INFO",
    connection: "mysql://username:password@hostname:3306/database_name"
  })
})

class Logger extends Context.Tag("Logger")<
  Logger,
  {
    readonly log: (message: string) => Effect.Effect<void> 
  }
>() {}

//        ┌─── Layer<Logger, never, Config>
//        ▼
const LoggerLive = Layer.effect(
  Logger,
  Effect.gen(function*() {
    const config = yield* Config
    const { logLevel } = yield* config.getConfig
    return {
      log(message) {
        return Effect.sync(() => {
          console.log(`[${logLevel}] ${message}`)
        })
      }
    }
  })
)

class Database extends Context.Tag("Database")<
  Database,
  { readonly query: (sql: string) => Effect.Effect<unknown> }
>() {}

//         ┌─── Layer<Database, never, Config | Logger>
//         ▼
const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function*() {
    const config = yield* Config
    const logger = yield* Logger
    return {
      query: (sql: string) =>
        Effect.gen(function*() {
          yield* logger.log(`Executing query: ${sql}`)
          const { connection } = yield* config.getConfig
          return { result: `Results from ${connection}` }
        })
    }
  })
)

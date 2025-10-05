import { Context, Effect, Layer } from "effect"

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

//         ┌─── Layer<Config | Logger, never, Config>
//         ▼
const AppConfigLive = Layer.merge(ConfigLive, LoggerLive)

//       ┌─── Layer<Database, never, never>
//       ▼
const _MainLive = DatabaseLive.pipe(
  // 提供 Logger 與（透過 Logger 的需求）Config
  Layer.provide(AppConfigLive),
  // 進一步把 Config 的來源補上
  Layer.provide(ConfigLive)
)

//       ┌─── Layer<Config | Database, never, never>
//       ▼
const MainLive = DatabaseLive.pipe(
  Layer.provide(AppConfigLive),
  Layer.provideMerge(ConfigLive)
)

//      ┌── Effect<unknown, never, Database>
//      ▼
const program = Effect.gen(function*() {
  const database = yield* Database
  const result = yield* database.query("SELECT * FROM users")
  return result
})

//      ┌── Effect<unknown, never, never>
//      ▼
const runnable = Effect.provide(program, MainLive)

Effect.runPromise(runnable).then(console.log)
/*
輸出:
[INFO] Executing query: SELECT * FROM users
{
  result: 'Results from mysql://username:password@hostname:3306/database_name'
}
*/

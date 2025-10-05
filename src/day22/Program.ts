import { Console, Context, Duration, Effect, Layer } from "effect"
import * as http from "http"

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
const _runnable = Effect.provide(program, MainLive)

// Effect.runPromise(runnable).then(console.log)
/*
輸出:
[INFO] Executing query: SELECT * FROM users
{
  result: 'Results from mysql://username:password@hostname:3306/database_name'
}
*/

// 簡化的 HTTP 服務器服務定義（以服務形式暴露 server 實例）
{
  // class HTTPServer extends Context.Tag("HTTPServer")<
  //   HTTPServer,
  //   { readonly server: http.Server }
  // >() {}

  // // 使用 Layer.scoped + acquireRelease 啟動並管理長期存活的服務
  // //         ┌─── Layer<HTTPServer, never, never>
  // //         ▼
  // const HTTPServerLive = Layer.scoped(
  //   HTTPServer,
  //   Effect.acquireRelease(
  //     // acquire: 啟動 HTTP 服務器
  //     Effect.async<{ readonly server: http.Server }>((resume) => {
  //       console.log("🚀 啟動服務器...")
  //       const server = http.createServer((req, res) => {
  //         res.writeHead(200, {
  //           "Content-Type": "text/plain; charset=utf-8"
  //         })
  //         res.end("Hello from Effect Layer! 🌍")
  //       })

  //       server.listen(3000, () => {
  //         console.log("🌐 服務器運行中: http://localhost:3000")
  //         resume(Effect.succeed({ server }))
  //       })
  //     }),
  //     // release: 優雅關閉
  //     ({ server }) =>
  //       Effect.sync(() => {
  //         server.close()
  //         console.log("🛑 服務器已停止")
  //       })
  //   )
  // )

  // // 加入 tap / tapError
  // const ServerLive = HTTPServerLive.pipe(
  //   Layer.tap(() => Console.log({ event: "server:init", ok: true })),
  //   Layer.tap(() => Console.log({ event: "server:ready", port: 3000 }))
  // )

  // // 使用 Layer.launch 啟動長期運行的服務
  // // Layer.launch 會取得資源並保持作用域存活，直到外部終止
  // Effect.runFork(Layer.launch(ServerLive))
}

{
  // // 1) 定義服務：提供一個可呼叫的 ping Effect
  // class ExternalApi extends Context.Tag("ExternalApi")<
  //   ExternalApi,
  //   { readonly ping: Effect.Effect<void, Error, never> }
  // >() {}

  // const ExternalApiLive = Layer.effect(
  //   ExternalApi,
  //   Effect.sync(() => {
  //     const ping = Effect.gen(function*() {
  //       // call httpbin health endpoint
  //       yield* Effect.tryPromise({
  //         try: async () => {
  //           const res = await fetch("https://httpbin.org/status/200")
  //           if (!res.ok) {
  //             throw new Error(`ExternalApi ping failed: ${res.status}`)
  //           }
  //         },
  //         catch: (e) => (e instanceof Error ? e : new Error(String(e)))
  //       })
  //     })
  //     return { ping } as const
  //   })
  // )

  // // 2) 抽出 withWarmup：不改變型別與結果，只在建構時做副作用
  // function withWarmup<ROut, E, RIn>(
  //   layer: Layer.Layer<ROut, E, RIn>,
  //   warmup: (services: Context.Context<ROut>) => Effect.Effect<void>
  // ) {
  //   return layer.pipe(Layer.tap(warmup))
  // }

  // // 2a) Soft warmup：預熱失敗時只記錄，不讓 Layer 失敗
  // const ExternalApiLiveSoftWarmup = withWarmup(ExternalApiLive, (services) =>
  //   Effect.gen(function*() {
  //     const api = Context.get(services, ExternalApi)
  //     yield* api.ping.pipe(
  //       Effect.timeout(Duration.seconds(1)),
  //       Effect.catchAll(() => Console.log({ event: "warmup:api", ok: false }))
  //     )
  //     yield* Console.log({ event: "warmup:api", ok: true })
  //   }).pipe(
  //     // 透過 provideService 消除服務輸入，確保 ExternalApiLiveSoftWarmup 沒有任何輸入
  //     Effect.provideService(ExternalApi, Context.get(services, ExternalApi))
  //   ))

  // // 3) 使用方式
  // const program = Effect.gen(function*() {
  //   yield* Console.log("app started")
  // })

  // // Soft 預熱
  // Effect.runPromise(program.pipe(Effect.provide(ExternalApiLiveSoftWarmup)))
}

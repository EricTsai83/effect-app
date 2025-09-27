import { Effect, Schedule } from "effect"

// 基本重試
// {
//   let count = 0
//   // 模擬一個可能失敗的任務
//   const task = Effect.async<string, Error>((resume) => {
//     if (count <= 2) {
//       count++
//       console.log("failure")
//       resume(Effect.fail(new Error()))
//     } else {
//       console.log("success")
//       resume(Effect.succeed("yay!"))
//     }
//   })

//   // 定義重試策略：固定延遲 100 毫秒
//   const policy = Schedule.fixed("100 millis")

//   // 重試任務
//   const repeated = Effect.retry(task, policy)

//   Effect.runPromise(repeated).then(console.log)
//   /*
//   輸出:
//   failure
//   failure
//   failure
//   success
//   yay!
//   */
// }

// 固定重試
{
  // const task = Effect.tryPromise({
  //   try: async (): Promise<Response> => {
  //     console.log("嘗試健康檢查...")
  //     const response = await fetch("https://httpbin.org/status/500")
  //     console.log(`收到回應: ${response.status}`)
  //     // 檢查 HTTP 狀態碼，500 應該觸發錯誤
  //     if (response.status >= 400) {
  //       throw new Error(`Health check failed: ${response.status}`)
  //     }
  //     return response.json()
  //   },
  //   catch: (error) => Effect.fail(`Health check failed: ${error}`)
  // })

  // Effect.runPromise(
  //   Effect.retry(task, Schedule.fixed("500 millis"))
  // )
}

{
  // const task = Effect.tryPromise({
  //   try: async (): Promise<Response> => {
  //     console.log("嘗試健康檢查...")
  //     const response = await fetch("https://httpbin.org/status/500")
  //     console.log(`收到回應: ${response.status}`)
  //     // 檢查 HTTP 狀態碼，500 應該觸發錯誤
  //     if (response.status >= 400) {
  //       throw new Error(`Health check failed: ${response.status}`)
  //     }
  //     return response.json()
  //   },
  //   catch: (error) => Effect.fail(`Health check failed: ${error}`)
  // })

  // // 定義重試策略：固定延遲 500 毫秒，最多重試 3 次
  // const retryPolicy = Schedule.compose(
  //   Schedule.recurs(3), // 最多重試 3 次
  //   Schedule.fixed("500 millis") // 固定延遲 500 毫秒
  // )

  // Effect.runPromise(
  //   Effect.retry(task, retryPolicy)
  // )
}

// 條件重試
{
  // // HTTP 錯誤類型定義
  // type HttpError = {
  //   status: number
  //   message?: string
  // }

  // // 判斷是否為可重試的 HTTP 錯誤
  // function isRetriableHttpError(error: unknown): boolean {
  //   if (error && typeof error === "object" && "status" in error) {
  //     const httpError = error as HttpError
  //     return httpError.status === 429 || (httpError.status >= 500 && httpError.status < 600)
  //   }
  //   return false
  // }

  // class ApiError extends Error {
  //   constructor(message: string, cause: number) {
  //     super(message, { cause })
  //   }
  // }
  // class ErrorNeedRetry extends Error {}
  // class ErrorNotRetry extends Error {}

  // const task = Effect.tryPromise({
  //   try: async (): Promise<Response> => {
  //     console.log("嘗試健康檢查...")
  //     // 200 來測試成功情況;4xx,5xx 來測試重試情況
  //     const response = await fetch("https://httpbin.org/status/500")
  //     console.log(`收到回應: ${response.status}`)

  //     if (response.status !== 200) {
  //       throw new ApiError(`Health check failed: ${response.status}`, response.status)
  //     }
  //     return response
  //   },
  //   catch: (error) => {
  //     if (error instanceof ApiError) {
  //       // 使用 isRetriableHttpError 函數來判斷是否應該重試
  //       if (isRetriableHttpError({ status: error.cause as number })) {
  //         console.log(`HTTP 錯誤 ${error.cause} 是可重試的`)
  //         return new ErrorNeedRetry()
  //       } else {
  //         console.log(`HTTP 錯誤 ${error.cause} 不可重試`)
  //         return new ErrorNotRetry()
  //       }
  //     }
  //     return error
  //   }
  // })

  // // 定義重試策略：最多重試 3 次，每次重試間隔 500 毫秒
  // const retryPolicy = Schedule.compose(
  //   Schedule.recurs(3), // 最多重試 3 次
  //   Schedule.fixed("500 millis") // 固定延遲 500 毫秒
  // )

  // Effect.runPromise(
  //   Effect.retry(task, {
  //     while: (error) => error instanceof ErrorNeedRetry,
  //     schedule: retryPolicy
  //   })
  // ).catch((error) => {
  //   console.log(`最終失敗: ${error.message}`)
  // })
}

// 加上指數回退 (Exponential Backoff) 範例
{
  // type HttpError = {
  //   status: number
  //   message?: string
  // }

  // function isRetriableHttpError(error: unknown): boolean {
  //   if (error && typeof error === "object" && "status" in error) {
  //     const httpError = error as HttpError
  //     return httpError.status === 429 || (httpError.status >= 500 && httpError.status < 600)
  //   }
  //   return false
  // }

  // class ApiError extends Error {
  //   constructor(message: string, cause: number) {
  //     super(message, { cause })
  //   }
  // }
  // class ErrorNeedRetry extends Error {}
  // class ErrorNotRetry extends Error {}

  // const task = Effect.tryPromise({
  //   try: async (): Promise<Response> => {
  //     console.log("嘗試健康檢查...")
  //     // 200 來測試成功情況;4xx,5xx 來測試重試情況
  //     const response = await fetch("https://httpbin.org/status/500")
  //     console.log(`收到回應: ${response.status}`)

  //     if (response.status !== 200) {
  //       throw new ApiError(`Health check failed: ${response.status}`, response.status)
  //     }
  //     return response
  //   },
  //   catch: (error) => {
  //     if (error instanceof ApiError) {
  //       // 使用 isRetriableHttpError 函數來判斷是否應該重試
  //       if (isRetriableHttpError({ status: error.cause as number })) {
  //         console.log(`HTTP 錯誤 ${error.cause} 是可重試的`)
  //         return new ErrorNeedRetry()
  //       } else {
  //         console.log(`HTTP 錯誤 ${error.cause} 不可重試`)
  //         return new ErrorNotRetry()
  //       }
  //     }
  //     return error
  //   }
  // })

  // const retryPolicy = Schedule.compose(
  //   Schedule.recurs(30),
  //   Schedule.exponential("200 millis")
  // )

  // Effect.runPromise(
  //   Effect.retry(task, {
  //     while: (error) => error instanceof ErrorNeedRetry,
  //     schedule: retryPolicy
  //   })
  // ).catch((error) => {
  //   console.log(`最終失敗: ${error.message}`)
  // })
}

{
  type HttpError = {
    status: number
    message?: string
  }

  function isRetriableHttpError(error: unknown): boolean {
    if (error && typeof error === "object" && "status" in error) {
      const httpError = error as HttpError
      return httpError.status === 429 || (httpError.status >= 500 && httpError.status < 600)
    }
    return false
  }

  class ApiError extends Error {
    constructor(message: string, cause: number) {
      super(message, { cause })
    }
  }
  class ErrorNeedRetry extends Error {}
  class ErrorNotRetry extends Error {}

  const task = Effect.tryPromise({
    try: async (): Promise<Response> => {
      console.log("嘗試健康檢查...")
      // 200 來測試成功情況;4xx,5xx 來測試重試情況
      const response = await fetch("https://httpbin.org/status/500")
      console.log(`收到回應: ${response.status}`)

      if (response.status !== 200) {
        throw new ApiError(`Health check failed: ${response.status}`, response.status)
      }
      return response
    },
    catch: (error) => {
      if (error instanceof ApiError) {
        // 使用 isRetriableHttpError 函數來判斷是否應該重試
        if (isRetriableHttpError({ status: error.cause as number })) {
          console.log(`HTTP 錯誤 ${error.cause} 是可重試的`)
          return new ErrorNeedRetry()
        } else {
          console.log(`HTTP 錯誤 ${error.cause} 不可重試`)
          return new ErrorNotRetry()
        }
      }
      return error
    }
  })

  const retryPolicy = Schedule.compose(
    Schedule.recurs(30),
    Schedule.jittered(Schedule.exponential("200 millis"))
  )

  Effect.runPromise(
    Effect.retry(task, {
      while: (error) => error instanceof ErrorNeedRetry,
      schedule: retryPolicy
    })
  ).catch((error) => {
    console.log(`最終失敗: ${error.message}`)
  })
}

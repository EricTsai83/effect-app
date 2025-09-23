import { Effect, pipe } from "effect"

/** 加入固定服務費（純函式，無副作用） */
const addServiceCharge = (amount: number): number => amount + 1

/**
 * 套用折扣（含輸入驗證）。
 * @param total 總金額（必須 > 0）
 * @param discountRate 折扣百分比（0 < rate ≤ 100）
 * @returns Effect<number, Error> 折扣後金額或錯誤
 */
const applyDiscount = (
  total: number,
  discountRate: number
): Effect.Effect<number, Error> => {
  if (total <= 0) {
    return Effect.fail(new Error("Total must be positive"))
  }
  if (discountRate <= 0 || discountRate > 100) {
    return Effect.fail(new Error("Discount rate must be in (0, 100]"))
  }
  const discounted = total - (total * discountRate) / 100
  return Effect.succeed(discounted)
}

type ApiSuccess<T> = { status: 200; data: T }

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/**
 * 模擬 API 請求（以 setTimeout 延遲回傳）。
 * @param data 回傳資料
 * @param ms 延遲毫秒數（預設 120）
 * @param shouldFail 是否強制失敗（預設 false）
 * @param error 失敗時回傳的錯誤物件（預設 500 Mock error）
 * @example 成功：mockFetch({ id: 1, name: "Alice" }, 120, false).then(console.log)
 * @example 失敗：mockFetch({ id: 1 }, 120, true).catch(console.error)
 */
const mockFetch = <T>(
  data: T,
  ms = 120,
  shouldFail = false,
  error: ApiError = new ApiError(500, "Mock error")
): Promise<ApiSuccess<T>> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(error)
        return
      }
      resolve({ status: 200, data })
    }, ms)
  })
}

/**
 * 將 Promise<ApiSuccess<T>> 轉為 Effect，並統一錯誤為 Error。
 * - 只擷取成功回應的 data 欄位。
 */
const fromApi = <T>(promise: Promise<ApiSuccess<T>>): Effect.Effect<T, Error> => {
  return pipe(
    Effect.tryPromise({
      try: () => promise,
      catch: (error: unknown) => error instanceof ApiError ? error : new Error(String(error))
    }),
    Effect.map((res) => res.data)
  )
}

// 取得交易金額與折扣比例（模擬 API）
const fetchTransactionAmount = fromApi(mockFetch(100, 120))
const fetchDiscountRate = fromApi(mockFetch(5, 80))

/**
 * 先並行取得金額與折扣，接著套用折扣邏輯。
 */
const discountedAmountEffect = pipe(
  Effect.all([fetchTransactionAmount, fetchDiscountRate]),
  Effect.andThen(([transactionAmount, discountRate]) => applyDiscount(transactionAmount, discountRate))
)

/**
 * 將金額格式化為幣別字串（預設 zh-TW / TWD）。
 */
const formatAmount = (
  amount: number,
  locale: string = "zh-TW",
  currency: string = "TWD"
): string => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * 建立主程式流程：折扣 → 加入服務費 → 輸出格式化字串。
 */
const buildProgram = (): Effect.Effect<string, Error> => {
  return pipe(
    discountedAmountEffect,
    Effect.andThen(addServiceCharge),
    Effect.andThen((finalAmount) => `Final amount to charge: ${formatAmount(finalAmount)}`)
  )
}

// 執行並輸出結果
Effect.runPromise(buildProgram()).then(console.log)

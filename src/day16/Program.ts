import { Effect, Schedule } from "effect"

// ============================================================================
// 電商網站的用戶個人頁面 - 多層降級策略
// ============================================================================

// 通用模擬函數配置類型
type MockConfig = {
  name: string
  icon: string
  failureThreshold: number
  delay: number
  successMessage: string
  failureMessage: string
  dataGenerator: (userId: string) => any
}

// 通用模擬函數工廠
const createMockFunction = (config: MockConfig) => {
  let attemptCount = 0

  return (userId: string) => {
    return Effect.tryPromise({
      try: () => {
        attemptCount++
        console.log(`${config.icon} 嘗試從 ${config.name} 獲取用戶 ${userId} 的資料 (嘗試 ${attemptCount})`)

        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (attemptCount <= config.failureThreshold) {
              console.log(`❌ ${config.name} 第 ${attemptCount} 次嘗試失敗`)
              reject(new Error(`${config.failureMessage} - 嘗試 ${attemptCount}`))
            } else {
              console.log(`✅ ${config.successMessage}`)
              resolve(config.dataGenerator(userId))
            }
          }, config.delay)
        })
      },
      catch: (error) => new Error(`${config.name} 錯誤: ${error}`)
    })
  }
}

// 模擬函數配置
const mockConfigs = {
  api: {
    name: "API",
    icon: "🔄",
    failureThreshold: 2,
    delay: 1000,
    successMessage: "API 調用成功",
    failureMessage: "API 調用失敗",
    dataGenerator: (userId: string) => ({
      id: userId,
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      avatar: `https://i.pravatar.cc/150?img=${userId}`,
      phone: `+1-555-${userId.padStart(4, "0")}`,
      website: `https://user${userId}.example.com`,
      company: `Company ${userId}`,
      source: "API"
    })
  },
  redis: {
    name: "Redis",
    icon: "🔍",
    failureThreshold: 2,
    delay: 500,
    successMessage: "Redis 連接成功，返回快取資料",
    failureMessage: "Redis 連接失敗",
    dataGenerator: (userId: string) => ({
      id: userId,
      name: `Cached User ${userId}`,
      email: `cached${userId}@example.com`,
      avatar: `https://i.pravatar.cc/150?img=${userId}`,
      phone: `+1-555-${userId.padStart(4, "0")}`,
      website: `https://cached${userId}.example.com`,
      company: `Cached Company ${userId}`,
      source: "Redis Cache"
    })
  },
  localStorage: {
    name: "LocalStorage",
    icon: "💾",
    failureThreshold: 1,
    delay: 300,
    successMessage: "LocalStorage 讀取成功，返回本地資料",
    failureMessage: "LocalStorage 讀取失敗",
    dataGenerator: (userId: string) => ({
      id: userId,
      name: `Local User ${userId}`,
      email: `local${userId}@example.com`,
      avatar: `https://i.pravatar.cc/150?img=${userId}`,
      phone: `+1-555-${userId.padStart(4, "0")}`,
      website: `https://local${userId}.example.com`,
      company: `Local Company ${userId}`,
      source: "LocalStorage"
    })
  }
}

// 創建模擬函數實例
const getFromAPI = createMockFunction(mockConfigs.api)
const getFromRedis = createMockFunction(mockConfigs.redis)
const getFromLocalStorage = createMockFunction(mockConfigs.localStorage)

// 重試策略配置
const retryPolicy = Schedule.compose(
  Schedule.recurs(3),
  Schedule.fixed("1 seconds")
)

// 主要 API 調用 + 重試機制 (核心業務邏輯)
export const fetchUserFromAPI = (userId: string) =>
  Effect.retryOrElse(
    getFromAPI(userId),
    retryPolicy,
    () => getCachedUserData(userId) // 降級到快取
  )

// 第二層：Redis 快取降級
const getCachedUserData = (userId: string) =>
  Effect.retryOrElse(
    getFromRedis(userId),
    retryPolicy,
    () => getLocalStorageData(userId) // 降級到本地儲存
  )

// 第三層：本地儲存降級
const getLocalStorageData = (userId: string) =>
  Effect.retryOrElse(
    getFromLocalStorage(userId),
    retryPolicy,
    () => getDefaultUserData(userId) // 降級到預設資料
  )

// 第四層：預設資料降級
const getDefaultUserData = (userId: string) =>
  Effect.succeed({
    id: userId,
    name: "訪客用戶",
    avatar: "/assets/default-avatar.png"
    // ... 其他預設資料
  })

// ============================================================================
// 測試代碼 - 多層降級策略測試
// ============================================================================

// 創建測試場景的降級函數
const createTestScenario = (apiConfig: MockConfig, redisConfig: MockConfig, localStorageConfig: MockConfig) => {
  const testApiCall = createMockFunction(apiConfig)
  const testGetFromRedis = createMockFunction(redisConfig)
  const testGetFromLocalStorage = createMockFunction(localStorageConfig)

  const testFetchUserFromAPI = (userId: string) =>
    Effect.retryOrElse(
      Effect.tryPromise({
        try: () => testApiCall(userId).pipe(Effect.runPromise),
        catch: (error) => new Error(`Failed to fetch user profile: ${error}`)
      }),
      retryPolicy,
      () => testGetCachedUserData(userId)
    )

  const testGetCachedUserData = (userId: string) =>
    Effect.retryOrElse(
      testGetFromRedis(userId),
      retryPolicy,
      () => testGetLocalStorageData(userId)
    )

  const testGetLocalStorageData = (userId: string) =>
    Effect.retryOrElse(
      testGetFromLocalStorage(userId),
      retryPolicy,
      () => getDefaultUserData(userId)
    )

  return testFetchUserFromAPI
}

// 測試程序
const program = Effect.gen(function*() {
  console.log("🚀 開始測試多層降級策略...")
  console.log("📝 降級策略：API → Redis → LocalStorage → 預設資料")
  console.log("⏱️  每層都有重試機制，最多重試 3 次")
  console.log("🛡️  完整降級流程測試")
  console.log("=".repeat(60))

  // 測試場景 1：API 成功（第 3 次重試成功）
  console.log("📋 測試場景 1：API 重試成功")
  const scenario1 = createTestScenario(
    mockConfigs.api, // API 正常
    { ...mockConfigs.redis, failureThreshold: 10 }, // Redis 永遠失敗
    { ...mockConfigs.localStorage, failureThreshold: 10 } // LocalStorage 永遠失敗
  )
  const userProfile1 = yield* scenario1("1")
  console.log("✅ 場景 1 結果:", userProfile1)
  console.log("=".repeat(40))

  // 測試場景 2：API 失敗，Redis 成功
  console.log("📋 測試場景 2：API 失敗，Redis 重試成功")
  const scenario2 = createTestScenario(
    { ...mockConfigs.api, failureThreshold: 10 }, // API 永遠失敗
    mockConfigs.redis, // Redis 正常
    { ...mockConfigs.localStorage, failureThreshold: 10 } // LocalStorage 永遠失敗
  )
  const userProfile2 = yield* scenario2("2")
  console.log("✅ 場景 2 結果:", userProfile2)
  console.log("=".repeat(40))

  // 測試場景 3：API 和 Redis 都失敗，LocalStorage 成功
  console.log("📋 測試場景 3：API 和 Redis 都失敗，LocalStorage 重試成功")
  const scenario3 = createTestScenario(
    { ...mockConfigs.api, failureThreshold: 10 }, // API 永遠失敗
    { ...mockConfigs.redis, failureThreshold: 10 }, // Redis 永遠失敗
    mockConfigs.localStorage // LocalStorage 正常
  )
  const userProfile3 = yield* scenario3("3")
  console.log("✅ 場景 3 結果:", userProfile3)
  console.log("=".repeat(40))

  // 測試場景 4：所有層級都失敗，降級到預設資料
  console.log("📋 測試場景 4：所有層級都失敗，降級到預設資料")
  const scenario4 = createTestScenario(
    { ...mockConfigs.api, failureThreshold: 10 }, // API 永遠失敗
    { ...mockConfigs.redis, failureThreshold: 10 }, // Redis 永遠失敗
    { ...mockConfigs.localStorage, failureThreshold: 10 } // LocalStorage 永遠失敗
  )
  const userProfile4 = yield* scenario4("4")
  console.log("✅ 場景 4 結果:", userProfile4)
  console.log("=".repeat(40))

  return {
    scenario1: userProfile1,
    scenario2: userProfile2,
    scenario3: userProfile3,
    scenario4: userProfile4
  }
})

// 執行測試
Effect.runPromise(program).then((res) => {
  console.log("🔍 最終結果:", res)
})

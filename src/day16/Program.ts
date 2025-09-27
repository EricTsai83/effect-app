import { Effect, Schedule } from "effect"

// 使用免費的 JSONPlaceholder API 獲取用戶資料
const fetchUserProfile = (userId: string) =>
  Effect.tryPromise({
    try: () =>
      fetch(`https://jsonplaceholder.typicode.com/users/${userId}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => ({
          id: data.id.toString(),
          name: data.name,
          email: data.email,
          avatar: `https://i.pravatar.cc/150?img=${data.id}`,
          phone: data.phone,
          website: data.website,
          company: data.company.name
        })),
    catch: (error) => new Error(`Failed to fetch user profile: ${error}`)
  })

// 重試策略：最多重試 3 次，每次間隔 1 秒
const retryPolicy = Schedule.recurs(3).pipe(
  Schedule.andThen(Schedule.exponential("1 seconds"))
)

export const getUserProfile = (userId: string) =>
  Effect.retryOrElse(
    fetchUserProfile(userId),
    retryPolicy,
    () =>
      Effect.succeed({
        id: userId,
        name: "Guest User",
        avatar: "/assets/default-avatar.png"
      })
  )

// 使用範例
const program = Effect.gen(function*() {
  console.log("正在獲取用戶資料...")

  // 嘗試獲取用戶 ID 為 1 的資料
  const userProfile = yield* getUserProfile("1")

  console.log("用戶資料:", userProfile)

  return userProfile
})

// 執行程式
Effect.runPromise(program)
  .then(console.log)
  .catch(console.error)

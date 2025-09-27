// ❌ 使用純物件 - 沒有 stack trace
function badErrorExample() {
  throw { message: "Database connection failed", code: 500 }
}

// 測試差異
try {
  badErrorExample()
} catch (error: any) {
  console.log("純物件錯誤:", error.stack) // 純物件錯誤: undefined
}

// ✅ 使用 Error 物件 - 有完整的 stack trace
function goodErrorExample() {
  throw new Error("Database connection failed")
}

try {
  goodErrorExample()
} catch (error: any) {
  console.log("Error 物件:", error.stack)
}
/**
 * Error 物件: Error: Database connection failed
    at goodErrorExample (/Users/eric/personal-project/effect-app/src/day13/Program.ts:8:9)
    at <anonymous> (/Users/eric/personal-project/effect-app/src/day13/Program.ts:19:3)
    at ModuleJob.run (node:internal/modules/esm/module_job:345:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:651:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:117:5)
 */

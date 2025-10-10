import { Chunk, Console, Duration, Effect, Equal, Hash, HashMap, HashSet, Ref, Schedule } from "effect"

{
  // 1) 建立時間長度（常用單位 + 無窮）
  const ms100 = Duration.millis(100)
  const oneSec = Duration.seconds(1)
  const fiveMin = Duration.minutes(5)
  const forever = Duration.infinity

  // 2) 時間運算（加總 / 倍數）
  const ninetySec = Duration.sum(Duration.seconds(30), Duration.minutes(1)) // 1m 30s
  const backoff = Duration.times(oneSec, 4) // 4 秒

  // 3) 比較
  const isShorter = Duration.lessThan(Duration.millis(900), oneSec)

  // 4) 轉字串（人類可讀）
  const label = Duration.format(ninetySec) // "1m 30s"

  console.log(ms100)
  console.log(oneSec)
  console.log(fiveMin)
  console.log(forever)
  console.log(ninetySec)
  console.log(backoff)
  console.log(isShorter)
  console.log(label)
}
console.log("--------------------------------")

{
  // 1) 固定間隔輪詢 + 總逾時
  const interval = Duration.millis(750)
  const totalTimeout = Duration.seconds(5)

  // 模擬後端工作：第 5 次才完成
  let pollCount = 0
  function checkJobStatus() {
    return Effect.sync<"pending" | "done">(() => {
      pollCount++
      return pollCount >= 5 ? "done" : "pending"
    })
  }

  // 宣告式排程 + 全域逾時
  const pollOnce = checkJobStatus().pipe(
    Effect.tap(
      (s) => Effect.sync(() => console.log(`🛰️ 輪詢 #${pollCount}: ${s}`))
    ),
    Effect.flatMap(
      (s) => (s === "done" ? Effect.succeed("done") : Effect.fail("pending"))
    )
  )

  const polling = Effect.retry(pollOnce, Schedule.spaced(interval))

  const program = Effect.timeout(polling, totalTimeout)

  Effect.runPromise(
    Effect.match(program, {
      onSuccess: () => console.log("✅ 完成"),
      onFailure: () => console.log("⌛ 逾時")
    })
  )
}
console.log("--------------------------------")

{
  // 範例：滾動進度上傳 — 最多每 300ms 上傳一次
  const minInterval = Duration.millis(300)
  let lastEmitAt = 0

  function reportScrollProgress(progressPercent: number) {
    const now = Date.now()
    const elapsedMs = now - lastEmitAt
    if (Duration.lessThan(Duration.millis(elapsedMs), minInterval)) return
    lastEmitAt = now
    console.log(`📊 ${new Date(now).toISOString()} | +${elapsedMs}ms | Scroll progress: ${progressPercent}%`)
  }

  // 模擬高頻事件（Effect 版）：每 50ms 產生一次 scroll 進度
  const simulation = Effect.gen(function*() {
    let progress = 0
    while (progress < 100) {
      progress = Math.min(100, progress + Math.floor(Math.random() * 7))
      reportScrollProgress(progress)
      yield* Effect.sleep(Duration.millis(50))
    }
    console.log("🛑 模擬結束")
  })

  Effect.runFork(simulation)
}

{
  // 好理解版：模擬 SSE + 代理的閒置逾時（idleTimeout = 3s）
  // - 無心跳：長時間沒資料 → 被代理關閉
  // - 有心跳：每 1s ping 一次 → 不會被關閉
  // - Duration.infinity：讓服務持續存活

  const idleTimeout = Duration.seconds(3)

  function simulate(label: string, enableHeartbeat: boolean) {
    return Effect.gen(function*() {
      console.log(`${label} OPEN`)
      const bootAt = Date.now()
      let lastActivityAt = bootAt

      for (let i = 0; i <= 24; i++) {
        const elapsedMs = Date.now() - bootAt

        if (i === 0 || i === 20) {
          lastActivityAt = Date.now()
          console.log(`${label} event: data`)
        }

        if (enableHeartbeat && i % 4 === 0) {
          lastActivityAt = Date.now()
          console.log(`${label} ping`)
        }

        const idleMs = Date.now() - lastActivityAt
        if (!Duration.lessThan(Duration.millis(idleMs), idleTimeout)) {
          console.log(`${label} CLOSED by proxy (idle ${idleMs}ms @ t≈${elapsedMs}ms)`)
          return
        }

        yield* Effect.sleep(Duration.millis(250))
      }

      console.log(`${label} END`)
    })
  }

  // Effect.runFork(simulate("[no-heartbeat]", false))
  Effect.runFork(simulate("[heartbeat]", true))
}

{
  // 僅在需要「重複接合」時使用 Chunk
  // Chunk 專為降低重複陣列接合的成本而優化。
  // 若不是重複接合的情境，使用 Chunk 可能引入不必要的額外負擔，
  // 反而使效能較慢。

  const c1 = Chunk.make(1, 2, 3)
  // 效能注意事項
  // Chunk.fromIterable 會複製可疊代物件的元素建立新資料。
  // 對大型資料或重複呼叫來說，這個拷貝成本可能影響效能。
  const c2 = Chunk.fromIterable([4, 5])
  const arr = Chunk.toReadonlyArray(c1) // readonly [1,2,3]

  // 2) 接合 / 變換 / 篩選
  const c3 = Chunk.appendAll(c1, c2) // [1,2,3,4,5]
  const mapped = Chunk.map(c3, (n) => n * 2) // [2,4,6,8,10]
  const filtered = Chunk.filter(mapped, (n) => n > 5) // [6,8,10]

  // 3) 取捨 / 切片
  const dropped = Chunk.drop(c3, 2) // [3,4,5]
  const taken = Chunk.take(c3, 3) // [1,2,3]
  const sliced = Chunk.take(Chunk.drop(c3, 1), 3) // [2,3,4]

  // 3.5) 建立空集合 + 累積（適合重複接合場景）
  const empty = Chunk.empty<number>()
  const built = Chunk.appendAll(
    Chunk.append(Chunk.append(empty, 1), 2),
    Chunk.fromIterable([3, 4])
  ) // [1,2,3,4]

  // 3.6) unsafeFromArray（避免複製，需小心）
  // Chunk.unsafeFromArray 直接由陣列建立 Chunk，不會進行拷貝。
  // 透過避免複製可提升效能，但需特別小心，
  // 因為它繞過了不可變性(immutability)保證。
  const direct = Chunk.unsafeFromArray([6, 7, 8]) // ⚠️ 請勿改動來源陣列

  // 3.7) 比較 — 結構相等
  // 比較兩個 Chunk 是否相等請使用 Equal.equals。
  // 會以結構相等（逐一比對內容）的方式比較。
  const isEqual = Equal.equals(c3, Chunk.make(1, 2, 3, 4, 5)) // true

  // 4) 疊代（保持不可變）
  let sum = 0
  for (const n of c3) sum += n

  console.log(arr)
  console.log(Chunk.toReadonlyArray(c3))
  console.log(Chunk.toReadonlyArray(mapped))
  console.log(Chunk.toReadonlyArray(filtered))
  console.log(Chunk.toReadonlyArray(dropped))
  console.log(Chunk.toReadonlyArray(taken))
  console.log(Chunk.toReadonlyArray(sliced))
  console.log(sum)
  console.log(Chunk.toReadonlyArray(empty))
  console.log(Chunk.toReadonlyArray(built))
  console.log(Chunk.toReadonlyArray(direct))
  console.log(isEqual)
}

{
  // 模擬文字串流：以固定延遲依序送出片段

  // 將一段文字依指定大小切成多個片段
  function splitTextBySize(text: string, chunkSize: number): ReadonlyArray<string> {
    if (chunkSize <= 0) return [text]
    const result: Array<string> = []
    for (let i = 0; i < text.length; i += chunkSize) {
      result.push(text.slice(i, i + chunkSize))
    }
    return result
  }

  // 直接以 Chunk 進行縫合（避免中間陣列配置）
  function stitchChunk(parts: Chunk.Chunk<string>): string {
    return Chunk.reduce(parts, "", (acc, s) => acc + s)
  }

  // 以 Effect 模擬串流：逐一送出片段，片段間以 delayMs 間隔
  function mockTextStreamEffect(
    text: string,
    chunkSize: number,
    delayMs: number,
    onChunk: (chunk: string, index: number) => Effect.Effect<void>
  ) {
    const pieces = splitTextBySize(text, Math.max(1, chunkSize))

    return Effect.forEach(
      pieces,
      (piece, idx) =>
        Effect.gen(function*() {
          yield* onChunk(piece, idx)
          if (idx < pieces.length - 1) {
            yield* Effect.sleep(Duration.millis(Math.max(0, delayMs)))
          }
        }),
      { concurrency: 1 }
    )
  }

  // 使用 Chunk 接收串流並即時縫合（純 Effect）
  function consumeStreamWithChunkEffect() {
    return Effect.gen(function*() {
      // 更小的示例文字，方便閱讀與觀察每次拼接
      const sampleText = "你好，這是串流測試。讓我們逐塊接收並縫合。"

      // 以 Ref<Chunk<string>> 做為累積容器（適合重複 append 場景）
      const receivedRef = yield* Ref.make(Chunk.empty<string>())

      yield* mockTextStreamEffect(
        sampleText,
        6, // 每 6 個字元切一塊
        100, // 每 100ms 送出一次
        (chunk, idx) =>
          Effect.gen(function*() {
            // 每收到一個片段就接到 Chunk 後面
            yield* Ref.update(receivedRef, (acc) => Chunk.append(acc, chunk))

            // 只輸出片段與當前統計，避免每步驟字符串重建
            const snapshot = yield* Ref.get(receivedRef)
            yield* Console.log(`片段#${idx}:`, JSON.stringify(chunk))
            yield* Console.log("目前片段數：", Chunk.size(snapshot))
            // 每次縫合並顯示目前完整結果
            const current = stitchChunk(snapshot)
            yield* Console.log("目前拼接：", current)
          })
      )

      const final = yield* Ref.get(receivedRef)
      yield* Console.log("串流完成，片段數：", Chunk.size(final))
    })
  }

  // 執行
  Effect.runFork(consumeStreamWithChunkEffect())
}

{
  // 1) 未實作 Equal → 比較是否為同一個物件（同一個記憶體位址）
  console.log("1) 未實作 Equal：比較是否為同一個物件（同一記憶體位址）")
  const a = { name: "Alice", age: 30 }
  const b = { name: "Alice", age: 30 }
  console.log("===:", a, "vs", b, "=>", a === b) // false（不是同一個物件 / 記憶體位址不同）
  console.log("Equal.equals:", a, "vs", b, "=>", Equal.equals(a, b)) // false（依 === 判斷：不是同一個物件）

  // 2) 使用 Equal + Hash 實作 Equal Interface，用以比較 class 物件是否結構相等
  class Person implements Equal.Equal {
    constructor(
      readonly id: number,
      readonly name: string,
      readonly age: number
    ) {}

    [Equal.symbol](that: Equal.Equal): boolean {
      if (that instanceof Person) {
        return (
          Equal.equals(this.id, that.id) &&
          Equal.equals(this.name, that.name) &&
          Equal.equals(this.age, that.age)
        )
      }
      return false
    }

    [Hash.symbol](): number {
      // 以 id 產生雜湊值（快速不等判斷）
      return Hash.hash(this.id)
    }
  }

  console.log("2) 類別自訂值相等（Equal + Hash）")
  const alice = new Person(1, "Alice", 30)
  const aliceSame = new Person(1, "Alice", 30)
  const bob = new Person(2, "Bob", 40)
  console.log("Equal.equals:", alice, "vs", aliceSame, "=>", Equal.equals(alice, aliceSame)) // true
  console.log("Equal.equals:", alice, "vs", bob, "=>", Equal.equals(alice, bob)) // false

  // 3) HashSet：以值相等去重（需元素實作 Equal）
  console.log("3) HashSet：值相等去重（元素需實作 Equal）")
  let setWithEqual = HashSet.empty<Person>()
  const p1 = new Person(1, "Alice", 30)
  const p2 = new Person(1, "Alice", 30)
  setWithEqual = HashSet.add(setWithEqual, p1)
  setWithEqual = HashSet.add(setWithEqual, p2)
  console.log("HashSet size (Equal):", HashSet.size(setWithEqual)) // 1

  let setWithPlain = HashSet.empty<{ name: string; age: number }>()
  const o1 = { name: "Alice", age: 30 }
  const o2 = { name: "Alice", age: 30 }
  setWithPlain = HashSet.add(setWithPlain, o1)
  setWithPlain = HashSet.add(setWithPlain, o2)
  console.log("HashSet size (plain):", HashSet.size(setWithPlain)) // 2

  // 4) HashMap：Key 以值相等（需 Key 實作 Equal）
  console.log("4) HashMap：Key 值相等（Key 需實作 Equal）")
  let map = HashMap.empty<Person, number>()
  const key1 = new Person(1, "Alice", 30)
  const key2 = new Person(1, "Alice", 30)
  map = HashMap.set(map, key1, 1)
  map = HashMap.set(map, key2, 2)
  console.log("HashMap size:", HashMap.size(map)) // 1（第二次覆蓋第一次）
  console.log("HashMap get:", HashMap.get(map, key2))
}

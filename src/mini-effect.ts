// MiniEffect<Success, Error, Requirements>
type MiniEffect<A, E, R> = ((env: R) => Promise<A> | Promise<never>) & { readonly _E?: E }

function succeed<A>(value: A): MiniEffect<A, never, unknown> {
  return async () => value
}

function fail<E>(error: E): MiniEffect<never, E, unknown> {
  return async () => {
    throw error
  }
}

function fromPromise<A>(
  f: () => Promise<A>
): MiniEffect<A, unknown, unknown> {
  return async () => f()
}

function flatMap<A, E, R, B, E2, R2>(
  eff: MiniEffect<A, E, R>,
  f: (a: A) => MiniEffect<B, E2, R2>
): MiniEffect<B, E | E2, R & R2> {
  return async (env: R & R2) => {
    const a = await eff(env)
    return f(a)(env)
  }
}

async function runMiniEffect<A, E, R>(
  eff: MiniEffect<A, E, R>,
  env: R
): Promise<A> {
  return eff(env)
}

const ok = succeed(42)
const bad = fail("Oh no!")

runMiniEffect(ok, {}).then(console.log) // 42
runMiniEffect(bad, {}).catch(console.error) // Oh no!

type Env = { apiUrl: string }

const getEnv: MiniEffect<string, never, Env> = async (env) => env.apiUrl

runMiniEffect(getEnv, { apiUrl: "https://example.com" })
  .then(console.log) // "https://example.com"

const program = flatMap(getEnv, (url) => fromPromise(() => fetch(url).then((res) => res.text())))

runMiniEffect(program, { apiUrl: "https://example.com" })
  .then(console.log)
  .catch(console.error)

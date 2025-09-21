{
  class PriceChain {
    constructor(private currentAmount: number) {}

    applyDiscount(percent: number) {
      this.currentAmount = Math.round(this.currentAmount * (1 - percent))
      return this
    }

    addTax(rate: number) {
      this.currentAmount = Math.round(this.currentAmount * (1 + rate))
      return this
    }

    roundToDollar() {
      this.currentAmount = Math.round(this.currentAmount)
      return this
    }

    total() {
      return this.currentAmount
    }
  }

  const total = new PriceChain(1000)
    .applyDiscount(0.1)
    .addTax(0.05)
    .roundToDollar()
    .total()

  console.log(total) // 945
}

{
  class MutablePriceChain {
    constructor(private amount: number) {}
    applyDiscount(percent: number) {
      this.amount = Math.round(this.amount * (1 - percent))
      return this
    }
    addTax(rate: number) {
      this.amount = Math.round(this.amount * (1 + rate))
      return this
    }
    total() {
      return this.amount
    }
  }

  const shared = new MutablePriceChain(1000)

  function flowA() {
    return shared.applyDiscount(0.1).total() // shared 變為 900（狀態被改動）
  }

  function flowB() {
    return shared.addTax(0.05).total() // 對 900 加稅，而非預期的 1000
  }

  const a = flowA()
  const b = flowB()
  console.log(a) // 900
  console.log(b) // 945（非預期，原本可能期望 1050）
}

{
  class ImmutablePriceChain {
    constructor(private readonly amount: number) {}
    applyDiscount(percent: number) {
      return new ImmutablePriceChain(Math.round(this.amount * (1 - percent)))
    }
    addTax(rate: number) {
      return new ImmutablePriceChain(Math.round(this.amount * (1 + rate)))
    }
    total() {
      return this.amount
    }
  }

  const base = new ImmutablePriceChain(1000)

  function flowA() {
    return base.applyDiscount(0.1).total() // 900（base 本身不變）
  }

  function flowB() {
    return base.addTax(0.05).total() // 1050（如預期，未受 flowA 影響）
  }

  const a = flowA()
  const b = flowB()
  console.log(a) // 900
  console.log(b) // 1050
}

function applyDiscount(percent: number): (amount: number) => number {
  function apply(amount: number): number {
    return Math.round(amount * (1 - percent))
  }
  return apply
}

function addTax(rate: number): (amount: number) => number {
  function add(amount: number): number {
    return Math.round(amount * (1 + rate))
  }
  return add
}

function roundToDollar(): (amount: number) => number {
  function round(amount: number): number {
    return Math.round(amount)
  }
  return round
}

{
  const s1 = applyDiscount(0.1)(1000)
  const s2 = addTax(0.05)(s1)
  const totalManual = roundToDollar()(s2)
  console.log(totalManual) // 945
}

{
  function pipe<T>(input: T, ...steps: Array<(value: any) => any>) {
    return steps.reduce((acc, step) => step(acc), input)
  }

  const total = pipe(1000, applyDiscount(0.1), addTax(0.05), roundToDollar())
  console.log(total) // 945
}

import * as Fs from "node:fs"
import Package from "../package.json" with { type: "json" }

const tpl = Fs.readFileSync("./scripts/version.template.txt").toString("utf8")

Fs.mkdirSync("src/internal", { recursive: true })
Fs.writeFileSync(
  "src/internal/version.ts",
  tpl.replace("VERSION", Package.version)
)

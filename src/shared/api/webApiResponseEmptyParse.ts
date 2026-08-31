import { type Result, resultTryParsingFetchErr } from "#result"
import { resultCreate } from "../result/resultCreate.js"

export async function webApiResponseEmptyParse(op: string, response: Response): Promise<Result<void>> {
  if (response.ok) return resultCreate(undefined)

  let text = ""
  try {
    text = await response.text()
  } catch {
    // Ignore response read failures while preserving the HTTP error contract.
  }
  return resultTryParsingFetchErr(op, text, response.status, response.statusText)
}

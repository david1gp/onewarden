import { type Result, resultTryParsingFetchErr, type ResultErr } from "#result"
import * as v from "valibot"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"

type WebApiResponseParseOptions = {
  errorResultTransform?: (result: ResultErr, text: string) => ResultErr
}

export async function webApiResponseParse<TSchema extends v.GenericSchema>(
  op: string,
  response: Response,
  schema: TSchema,
  options: WebApiResponseParseOptions = {},
): Promise<Result<v.InferOutput<TSchema>>> {
  let text: string
  try {
    text = await response.text()
  } catch {
    return resultErrorCreate(op, "Failed to read server response.", {
      code: "platform.unavailable",
      statusCode: 503,
    })
  }

  if (!response.ok) {
    const result = resultTryParsingFetchErr(op, text, response.status, response.statusText)
    return options.errorResultTransform?.(result, text) ?? result
  }

  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return resultErrorCreate(op, "Server returned invalid JSON response.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }

  const parsed = v.safeParse(schema, json)
  if (!parsed.success) {
    return resultErrorCreate(op, "Server response did not match expected schema.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }

  return resultCreate(parsed.output)
}

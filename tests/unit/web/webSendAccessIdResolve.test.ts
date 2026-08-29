import { expect, test } from "bun:test"
import { webSendAccessIdResolve } from "../../../src/web/sends/model/webSendAccessIdResolve.js"

test("webSendAccessIdResolve extracts public Send IDs without consuming decryption-key path segments", () => {
  expect(webSendAccessIdResolve("/send/access-1#key")).toBe("access-1")
  expect(webSendAccessIdResolve("/sends/access/access%202/key")).toBe("access 2")
  expect(webSendAccessIdResolve("/send-access?send=access-3#key")).toBe("access-3")
  expect(webSendAccessIdResolve("/send-access")).toBe("")
})

const bridgeSource = "onewarden.credential-capture.v1"
type CredentialBridgeWindow = Window & {
  XMLHttpRequest: typeof XMLHttpRequest
  HTMLFormElement: typeof HTMLFormElement
}

/** Reports only request method/URL metadata from the page world; request bodies are never inspected. */
export function extensionCredentialNetworkBridgeStart(
  windowValue: CredentialBridgeWindow = window as unknown as CredentialBridgeWindow,
): () => void {
  const fetchOriginal = windowValue.fetch
  const xhrOpenOriginal = windowValue.XMLHttpRequest.prototype.open
  const xhrSendOriginal = windowValue.XMLHttpRequest.prototype.send
  const formSubmitOriginal = windowValue.HTMLFormElement.prototype.submit
  const xhrMetadata = new WeakMap<XMLHttpRequest, { method: string; url: string }>()
  const report = (methodValue: string, urlValue: string): void => {
    const method = methodValue.toUpperCase()
    if (method !== "POST" && method !== "PUT" && method !== "PATCH") return
    windowValue.postMessage({ source: bridgeSource, type: "network", method, url: urlValue }, "*")
  }

  const fetchWrapped = function (this: Window, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const request = input instanceof Request ? input : null
    report(init?.method ?? request?.method ?? "GET", request?.url ?? String(input))
    return Reflect.apply(fetchOriginal, this, [input, init])
  }
  const xhrOpenWrapped = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    xhrMetadata.set(this, { method, url: String(url) })
    Reflect.apply(xhrOpenOriginal, this, [method, url, async ?? true, username, password])
  }
  const xhrSendWrapped = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null): void {
    const metadata = xhrMetadata.get(this)
    if (metadata !== undefined) report(metadata.method, metadata.url)
    Reflect.apply(xhrSendOriginal, this, [body])
  }
  const formSubmitWrapped = function (this: HTMLFormElement): void {
    this.dispatchEvent(new CustomEvent("onewarden:programmatic-submit"))
    Reflect.apply(formSubmitOriginal, this, [])
  }
  windowValue.fetch = fetchWrapped
  windowValue.XMLHttpRequest.prototype.open = xhrOpenWrapped
  windowValue.XMLHttpRequest.prototype.send = xhrSendWrapped
  windowValue.HTMLFormElement.prototype.submit = formSubmitWrapped

  return () => {
    if (windowValue.fetch === fetchWrapped) windowValue.fetch = fetchOriginal
    if (windowValue.XMLHttpRequest.prototype.open === xhrOpenWrapped) {
      windowValue.XMLHttpRequest.prototype.open = xhrOpenOriginal
    }
    if (windowValue.XMLHttpRequest.prototype.send === xhrSendWrapped) {
      windowValue.XMLHttpRequest.prototype.send = xhrSendOriginal
    }
    if (windowValue.HTMLFormElement.prototype.submit === formSubmitWrapped) {
      windowValue.HTMLFormElement.prototype.submit = formSubmitOriginal
    }
  }
}

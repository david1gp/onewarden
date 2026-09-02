import { expect, test } from "bun:test"
import { Route, Router } from "@solidjs/router"
import { fireEvent, render, waitFor } from "@solidjs/testing-library"
import { createComponent } from "solid-js"
import { webAppStateCreate } from "../../../src/web/ui/webAppStateCreate.js"

test("webAppStateCreate derives pages and dynamic IDs from the typed route match", async () => {
  const previousUrl = window.location.href
  window.happyDOM.setURL("http://localhost/CIPHERS/Cipher%20One/EDIT/")
  let state!: ReturnType<typeof webAppStateCreate>
  const screen = render(() =>
    createComponent(Router, {
      children: createComponent(Route, {
        path: "/*",
        component: () => {
          state = webAppStateCreate()
          return null
        },
      }),
    }),
  )

  try {
    expect(state.currentRoute()).toBe("cipher-edit")
    expect(state.routeCipherId()).toBe("Cipher One")

    state.navigate("/vault/Cipher-View")
    await waitFor(() => {
      expect(state.currentRoute()).toBe("cipher-view")
      expect(state.routeCipherId()).toBe("Cipher-View")
    })

    state.navigate("/send/Send%2FOne/")
    await waitFor(() => {
      expect(state.currentRoute()).toBe("send-access")
      expect(state.currentSendAccessId()).toBe("Send/One")
    })

    state.navigate("/send-access?send=query-id")
    await waitFor(() => {
      expect(state.currentRoute()).toBe("send-access")
      expect(state.currentSendAccessId()).toBe("query-id")
    })

    state.navigate("/ciphers/new/edit")
    await waitFor(() => {
      expect(state.currentRoute()).toBe("cipher-edit")
      expect(state.routeCipherId()).toBeNull()
    })
  } finally {
    screen.unmount()
    window.happyDOM.setURL(previousUrl)
  }
})

test("router keeps same-origin links in the SPA", async () => {
  const previousUrl = window.location.href
  window.happyDOM.setURL("http://localhost/login")
  let state!: ReturnType<typeof webAppStateCreate>
  const screen = render(() =>
    createComponent(Router, {
      children: createComponent(Route, {
        path: "/*",
        component: () => {
          state = webAppStateCreate()
          return null
        },
      }),
    }),
  )

  const link = document.createElement("a")
  link.href = "/send-access?send=anchor-id#section"
  link.textContent = "Open send"
  screen.container.append(link)

  try {
    fireEvent.click(link)
    await waitFor(() => {
      expect(window.location.pathname).toBe("/send-access")
      expect(window.location.search).toBe("?send=anchor-id")
      expect(window.location.hash).toBe("#section")
      expect(state.currentSendAccessId()).toBe("anchor-id")
    })
  } finally {
    screen.unmount()
    window.happyDOM.setURL(previousUrl)
  }
})

#!/usr/bin/env bun

import { serverAppCreate as serverAppCreateSource } from "../server/serverAppCreate.js"
import { serverListen as serverListenSource } from "../server/serverListen.js"

const serverAppCreate = serverAppCreateSource
const serverListen = serverListenSource

export { serverAppCreate, serverListen }

if (import.meta.main) serverListen()

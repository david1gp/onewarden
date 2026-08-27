import "../web/webStyles.css"
import { webRootMount as webRootMountSource } from "../web/webRootMount"

const webRootMount = webRootMountSource

export { webRootMount }

webRootMount(document.querySelector<HTMLElement>("#onewarden-root"))

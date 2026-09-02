import { Route, Router } from "@solidjs/router"
import { render } from "solid-js/web"
import { WebApp } from "./ui/WebApp.jsx"
import "./webStyles.css"

const root = document.getElementById("root")
if (!root) throw new Error("webMount could not find the #root element")

render(
  () => (
    <Router>
      <Route path="/*" component={WebApp} />
    </Router>
  ),
  root,
)

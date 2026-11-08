import { render } from "solid-js/web";
import App from "./App";
import { MiniPlayer } from "./MiniPlayer";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";
import "./styles/pages.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
const mini = new URLSearchParams(window.location.search).has("mini");
render(() => (mini ? <MiniPlayer /> : <App />), root);

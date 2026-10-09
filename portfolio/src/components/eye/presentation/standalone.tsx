import { createRoot } from "react-dom/client";
import EyeConstruction from "./EyeConstruction";

const mount = document.getElementById("presentation");
if (mount) createRoot(mount).render(<EyeConstruction standalone />);

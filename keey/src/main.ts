import { initApp, readDeps } from "./utils/appStarter";

readDeps().then(deps => {
  initApp(deps);
})

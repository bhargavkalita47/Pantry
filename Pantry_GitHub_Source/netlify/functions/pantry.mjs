import { hostedRequest } from "../../lib/hosted.mjs";
export default request=>hostedRequest(request);
export const config={path:["/api/config","/api/state","/api/session"]};

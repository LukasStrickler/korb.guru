import config from "../../packages/config/eslint.config.js";

export default [...config, { ignores: [".expo/**"] }];

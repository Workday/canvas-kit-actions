// This file is the entry point for the `build:ncc` script. DO NOT remove this file unless you are
// planning to change the way actions build. `ncc` will use this entry point to create a single JS
// file including all `node_modules` dependencies. This method ensures only required files in
// `node_modules` are actually included in the final build artifact which reduces a lot of bytes
// downloaded when GitHub actions calls files. All `src/actions/*` files import this `lib` directly.
import * as actionsCore from '@actions/core'
import * as actionsGithub from '@actions/github'

export {actionsCore, actionsGithub}

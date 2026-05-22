import packageJson from '../package.json'

const version = packageJson.version

/** Outbound requests from the OpenShelf server (URL checks, title fetch, etc.). */
export const OPENSHELF_HTTP_USER_AGENT = `OpenShelf/${version} (+self-hosted read-later app)`

export const OPENSHELF_URL_CHECK_USER_AGENT = `OpenShelf/${version} URL checker (+self-hosted read-later app)`

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_OAUTH_GOOGLE_CLIENT_ID: string
  readonly VITE_OAUTH_GITHUB_CLIENT_ID: string
  readonly VITE_ENABLE_MOCKS: string
  readonly VITE_ROUTER_FUTURE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg?react' {
  import type { FC, SVGProps } from 'react'
  const ReactComponent: FC<SVGProps<SVGSVGElement>>
  export default ReactComponent
}
import { createElement } from 'react'

// Reown AppKit's <appkit-button> web component (registered by createAppKit in lib/appkit).
// createElement avoids needing a JSX intrinsic-element declaration for the custom tag.
export function ConnectButton() {
  return createElement('appkit-button', { balance: 'hide' })
}

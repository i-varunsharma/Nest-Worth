import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/*
  Vite settings.

  The port is pinned on purpose. By default Vite takes 5173, but if something
  else is already using it, it quietly moves to 5174 and then 5175. That is
  usually harmless, but it breaks Google sign-in: Google only trusts the exact
  addresses registered in the Cloud Console, so a page served from 5174 is a
  stranger to it even though 5173 is registered.

  strictPort turns the quiet move into a loud error. If 5173 is taken, the
  server refuses to start and tells you, which is far easier to deal with than a
  sign-in that fails for a reason nothing on screen explains.
*/
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
})

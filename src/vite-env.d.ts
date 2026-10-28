/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** OAuth 2.0 Web client ID from Google Cloud. Empty = Drive features off, data stays on the device. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** "true" adds the drive.readonly scope so sync can pull images cosplayers upload into Ref folders. */
  readonly VITE_READ_REF_UPLOADS?: string;
}

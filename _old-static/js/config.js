/* หมูถ่ายรูป — app configuration.
   GOOGLE_CLIENT_ID: the OAuth 2.0 "Web application" client ID from Google Cloud Console.
   Leave it empty to run the app without Google Drive (data stays on this device only).
   See README.md → "ตั้งค่า Google Drive". */
window.APP_CONFIG = {
  GOOGLE_CLIENT_ID: '',

  /* Off by default. With only the drive.file scope the app can create the Ref folder and share it,
     but it cannot see images the cosplayer uploads into it. Turning this on adds the drive.readonly
     scope so "ซิงก์" can pull those images in as refs. drive.readonly is a restricted scope:
     fine for personal/testing use, but a public app needs Google's verification. */
  READ_REF_UPLOADS: false,

  ROOT_FOLDER: 'หมูถ่ายรูป',
  DATA_FILE: 'data.json',
};

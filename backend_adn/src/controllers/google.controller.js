// Google OAuth Controller deshabilitado
export const googleAuth = (req, res) => res.status(404).json({ success: false, error: 'Google Auth deshabilitado' });
export const googleCallback = (req, res) => res.status(404).json({ success: false, error: 'Google Auth deshabilitado' });
export const googleStatus = (req, res) => res.json({ enabled: false });
export const googleOneClick = (req, res) => res.status(404).json({ success: false, error: 'Google One-Click deshabilitado' });

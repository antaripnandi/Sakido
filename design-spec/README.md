# Stitch Design Specifications & References

This directory contains design tokens, HTML templates, and UI specs exported from Stitch, organized by feature/screen:

## Folders:

### 1. `auth-login/`
Contains specs for the initial Authentication / Sign-In Modal:
- `code.html`: Exported HTML template for the login screen.
- `DESIGN.md`: Primary design tokens (typography, colors, radii, spacing).

### 2. `auth-otp/`
Contains specs for the 6-digit OTP / Passkey Verification Screen:
- `code.html`: Exported HTML template for the passkey entry form.
- `DESIGN.md`: Design spec for the OTP input grid & verify button.

### 3. `auth-authorized/`
Contains specs for the Authorized / Logged-in State:
- `code.html`: Exported HTML template for the success / session established state.
- `DESIGN.md`: Primary design tokens (typography, colors, surface layers).

---

### Adding New Screens:
When adding new Stitch exports, create a dedicated subfolder (e.g., `design-spec/dashboard-header/` or `design-spec/courses-list/`) and place the corresponding `code.html` and `DESIGN.md` inside it!

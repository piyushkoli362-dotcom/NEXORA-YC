# UI package boundary
Reusable Phase 1 UI lives in apps/web/components/ui.tsx and tokens in apps/web/app/globals.css. Buttons use shadcn-style CVA and Radix Slot; modal uses Radix Dialog for focus management, Escape handling, semantics and focus restoration. Extract into a publishable package when a second client needs it. Do not duplicate components prematurely.

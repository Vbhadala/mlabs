// Transitional shim — re-exports the shadcn primitive from @mlabs/ui-web so
// existing imports at "@/components/ui/button" keep working. Phase 5 will
// rewrite callers to import from @mlabs/ui-web directly.
export { Button, buttonVariants } from "@mlabs/ui-web/button"

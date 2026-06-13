/**
 * Pricing helpers — re-export of the shared money math.
 *
 * The implementation lives in `@/shared/lib/pricing` so client components
 * (the /upgrade coupon UI) can import the same functions without crossing
 * the components→server boundary. Server + app code keeps importing from
 * here for back-compat.
 */
export * from "@/shared/lib/pricing";

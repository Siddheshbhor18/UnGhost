// Legacy glass primitives — kept for backward compatibility while the
// editorial-system atoms in `components/ui/` are rolled out page by page.
// New code should import from `@/components/ui` instead.
export { GlassCard } from "./GlassCard";
export type { GlassCardProps } from "./GlassCard";
export { GlassButton } from "./GlassButton";
export type { GlassButtonProps } from "./GlassButton";
export { GlassInput, GlassTextarea, GlassSelect } from "./GlassInput";
export { GlassBadge } from "./GlassBadge";
export type { BadgeTone } from "./GlassBadge";
export { GlassNavbar } from "./GlassNavbar";
export { BlobField } from "./BlobField";
export { Logo } from "./Logo";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";
export { DemoModeBadge } from "./DemoModeBadge";
export { NotificationBell } from "./NotificationBell";
export { AccountMenu } from "./AccountMenu";
export { DoorAnimation } from "./DoorAnimation";

// Pass-through re-exports of the new editorial primitives. This lets
// existing files that import `@/components/glass` pick up new atoms with
// only a name change at the import site (no path change).
export {
  Button,
  Card,
  Input,
  Textarea,
  Select,
  Field,
  Badge,
  TierBadge,
  Chip,
  Skeleton,
  SkeletonLines,
  SkeletonCard,
  EmptyState,
  SectionLabel,
  Stat,
  Modal,
  Drawer,
  ToastProvider,
  useToast,
  AppNav,
  BackdropMesh,
} from "@/components/ui";

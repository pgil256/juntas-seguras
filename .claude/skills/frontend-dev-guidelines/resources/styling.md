# Styling Patterns (Tailwind CSS & shadcn/ui)

## Tailwind CSS Basics

### Common Utility Classes

```tsx
// Layout
<div className="flex items-center justify-between gap-4">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
<div className="container mx-auto px-4 py-8">

// Spacing
<div className="p-4 m-2">           {/* padding/margin all sides */}
<div className="px-4 py-2">         {/* x and y axis */}
<div className="pt-4 mb-6">         {/* top padding, bottom margin */}
<div className="space-y-4">         {/* vertical spacing between children */}

// Typography
<h1 className="text-3xl font-bold tracking-tight">
<p className="text-sm text-muted-foreground">
<span className="font-medium">

// Colors (using CSS variables from shadcn/ui)
<div className="bg-background text-foreground">
<div className="bg-primary text-primary-foreground">
<div className="bg-muted text-muted-foreground">
<div className="border border-border">

// Sizing
<div className="w-full max-w-md">
<div className="h-10 w-10">
<div className="min-h-screen">

// Borders & Rounded
<div className="rounded-lg border shadow-sm">
<div className="rounded-full">

// States
<button className="hover:bg-accent focus:outline-none focus:ring-2">
<div className="disabled:opacity-50 disabled:cursor-not-allowed">
```

## The cn() Helper

```tsx
// lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Usage Examples

```tsx
import { cn } from '@/lib/utils';

// Basic merging
<div className={cn('base-class', className)}>

// Conditional classes
<div className={cn(
  'rounded-lg p-4',
  isActive && 'bg-primary text-primary-foreground',
  isDisabled && 'opacity-50 cursor-not-allowed'
)}>

// Overriding classes (tailwind-merge handles conflicts)
<Button className={cn('w-full', className)}>
  {/* If className contains 'w-auto', it will override 'w-full' */}
</Button>
```

## Component Variants with CVA

```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
```

### Usage

```tsx
<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline" size="sm">Small Outline</Button>
<Button variant="ghost" size="icon"><Icon /></Button>
```

## Responsive Design

```tsx
// Mobile-first approach
<div className="
  flex flex-col          {/* mobile: column */}
  md:flex-row            {/* tablet+: row */}
  gap-4
">

// Grid responsive
<div className="
  grid
  grid-cols-1            {/* mobile: 1 column */}
  sm:grid-cols-2         {/* small: 2 columns */}
  lg:grid-cols-3         {/* large: 3 columns */}
  xl:grid-cols-4         {/* extra large: 4 columns */}
  gap-6
">

// Hide/show at breakpoints
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>

// Text sizing
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
```

## Dark Mode

```tsx
// Using CSS variables (automatic with shadcn/ui)
<div className="bg-background text-foreground">
  {/* Automatically switches in dark mode */}
</div>

// Explicit dark mode classes
<div className="bg-white dark:bg-gray-900">
<div className="text-gray-900 dark:text-gray-100">
```

## shadcn/ui Components

### Available Components (components/ui/)

| Component | File | Purpose |
|-----------|------|---------|
| Alert | alert.tsx | Status messages |
| AlertDialog | alert-dialog.tsx | Confirmation dialogs |
| Avatar | avatar.tsx | User avatars |
| Badge | badge.tsx | Status badges |
| Button | button.tsx | Action buttons |
| Card | card.tsx | Content containers |
| Checkbox | checkbox.tsx | Checkboxes |
| Dialog | dialog.tsx | Modal dialogs |
| DropdownMenu | dropdown-menu.tsx | Dropdown menus |
| Input | input.tsx | Text inputs |
| Label | label.tsx | Form labels |
| Select | select.tsx | Select dropdowns |
| Separator | separator.tsx | Dividers |
| Skeleton | skeleton.tsx | Loading placeholders |
| Table | table.tsx | Data tables |
| Tabs | tabs.tsx | Tab navigation |
| Textarea | textarea.tsx | Multi-line inputs |
| Toast | toast.tsx | Notifications |

### Component Usage Examples

```tsx
// Dialog with form
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function CreatePoolDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Pool</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Pool</DialogTitle>
          <DialogDescription>
            Set up a new savings pool for your group.
          </DialogDescription>
        </DialogHeader>
        <form>
          {/* Form content */}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Common Layout Patterns

### Page Container

```tsx
<main className="container mx-auto py-8 px-4 max-w-6xl">
  {/* Page content */}
</main>
```

### Card Grid

```tsx
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  {items.map(item => (
    <Card key={item.id}>{/* Card content */}</Card>
  ))}
</div>
```

### Form Layout

```tsx
<form className="space-y-6 max-w-md">
  <div className="space-y-2">
    <Label htmlFor="name">Name</Label>
    <Input id="name" />
  </div>
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" />
  </div>
  <Button type="submit" className="w-full">Submit</Button>
</form>
```

### Flex Between

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-xl font-semibold">Title</h2>
  <Button variant="outline" size="sm">Action</Button>
</div>
```

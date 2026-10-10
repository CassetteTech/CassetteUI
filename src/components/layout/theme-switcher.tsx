'use client'

import * as React from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeSwitcher() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const

/** Inline Light / Dark / System choice; the selected option uses the sidebar's active-row fill. */
export function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme()
  // next-themes knows the stored choice only on the client, so nothing is selected before hydration.
  const hydrated = React.useSyncExternalStore(() => () => {}, () => true, () => false)

  return (
    <RadioGroupPrimitive.Root
      aria-label="Theme"
      orientation="horizontal"
      value={hydrated ? (theme ?? '') : ''}
      onValueChange={setTheme}
      className="inline-flex gap-0.5"
    >
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <RadioGroupPrimitive.Item
          key={value}
          value={value}
          aria-label={label}
          title={label}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=checked]:bg-sidebar-accent data-[state=checked]:text-sidebar-accent-foreground"
        >
          <Icon className="size-4" />
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  )
}

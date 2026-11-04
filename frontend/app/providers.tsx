'use client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { getQueryClient } from '@/app/get-query-client'
import type * as React from 'react'
import { Container, createTheme, MantineProvider, rem } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { Navbar } from './layout/Navbar';
import { Footer } from './layout/Footer';
import useSettingsStore from './store/useSettingsStore';
import { useEffect } from 'react';
import useAuthStore from './store/useAuthStore'
import { Fredoka, Nunito, JetBrains_Mono } from 'next/font/google'
// fonts match the DuckSquad website (ducksquad.de)
const headingFont = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
})
const bodyFont = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
})
const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
})

const CONTAINER_SIZES: Record<string, string> = {
  xxs: rem(300),
  xs: rem(400),
  sm: rem(500),
  md: rem(600),
  lg: rem(700),
  xl: rem(800),
  xxl: rem(900),
  "3xl": rem(1000),
  "4xl": rem(1100),
  "5xl": rem(1200),
  "6xl": rem(1300),
  "7xl": rem(1400),
};

const theme = createTheme({
  fontFamily: bodyFont.style.fontFamily,
  fontFamilyMonospace: monoFont.style.fontFamily,
  headings: {
    fontFamily: headingFont.style.fontFamily,
    fontWeight: "700",
  },
  primaryColor: "duck",
  primaryShade: { light: 6, dark: 5 },
  // dark text on the yellow primary color
  autoContrast: true,
  defaultRadius: "lg",
  cursorType: "pointer",
  defaultGradient: { from: "duck.5", to: "beak.5", deg: 120 },
  breakpoints: {
    xs: "30em",
    sm: "48em",
    md: "64em",
    lg: "74em",
    xl: "90em",
    xxl: "100em",
    "3xl": "116em",
    "4xl": "130em",
    "5xl": "146em",
    "6xl": "160em"
  },
  components: {
    Container: Container.extend({
      vars: (_, { size, fluid }) => ({
        root: {
          '--container-size': fluid
            ? '100%'
            : size !== undefined && size in CONTAINER_SIZES
              ? CONTAINER_SIZES[size]
              : rem(size),
        },
      }),
    }),
  },
  colors: {
    // DuckSquad duck yellow (primary)
    duck: [
      '#fff8e1',
      '#ffefc0',
      '#ffe9a8',
      '#ffdd7a',
      '#ffd255',
      '#ffc83d',
      '#f5b81f',
      '#dda10f',
      '#c48b00',
      '#a87600',
    ],
    // DuckSquad beak orange
    beak: [
      '#fff1e6',
      '#ffdcc2',
      '#ffc299',
      '#ffa86f',
      '#ff9d5c',
      '#ff8a3d',
      '#f2761f',
      '#e2621c',
      '#c45212',
      '#a3430c',
    ],
    // DuckSquad pool cyan
    pool: [
      '#e6fbfe',
      '#c9f4fb',
      '#a2ecf7',
      '#7fe3f3',
      '#62d8ee',
      '#5fdcf0',
      '#38c4dd',
      '#1ea6c2',
      '#128aa8',
      '#0b6f88',
    ],
    // DuckSquad dark surfaces (night pond)
    dark: [
      '#eef2f8',
      '#cfd8e4',
      '#a9b5c6',
      '#6e7c90',
      '#3a4556',
      '#2a3442',
      '#1d2633',
      '#18202b',
      '#121821',
      '#0b0f15',
    ],
  },
});

export default function Providers({ children, latestRelease = null }: { children: React.ReactNode; latestRelease?: string | null }) {
  const { fetchUser } = useAuthStore()
  const queryClient = getQueryClient()

  const videoTheaterMode = useSettingsStore((state) => state.videoTheaterMode);

  // Attempt to authenticate user on initial page load
  useEffect(() => {
    fetchUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <Notifications />
      <QueryClientProvider client={queryClient}>
        {!videoTheaterMode && <Navbar />}
        {children}
        {!videoTheaterMode && <Footer latestRelease={latestRelease} />}
        <ReactQueryDevtools />
      </QueryClientProvider>
    </MantineProvider>
  )
}

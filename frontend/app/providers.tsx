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
import localFont from 'next/font/local'
import { Outfit, JetBrains_Mono } from 'next/font/google'
const localInterFont = localFont({
  src: "./Inter-Variable.ttf"
})
const headingFont = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
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
  fontFamily: localInterFont.style.fontFamily,
  fontFamilyMonospace: monoFont.style.fontFamily,
  headings: {
    fontFamily: headingFont.style.fontFamily,
    fontWeight: "700",
  },
  primaryColor: "duck",
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: "md",
  cursorType: "pointer",
  defaultGradient: { from: "duck.5", to: "mint.5", deg: 120 },
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
    // violet-indigo primary
    duck: [
      '#f1eeff',
      '#e0dafe',
      '#c0b3fb',
      '#9e8af8',
      '#8267f6',
      '#7152f5',
      '#6746f4',
      '#5738da',
      '#4c31c3',
      '#4027ac',
    ],
    // mint accent
    mint: [
      '#e3fcf6',
      '#d0f6ec',
      '#a3ecd8',
      '#72e2c3',
      '#4ad9b1',
      '#31d4a6',
      '#20d1a0',
      '#0db98b',
      '#00a47b',
      '#008e69',
    ],
    // dark surfaces with a slight violet tint
    dark: [
      '#c9c7d6',
      '#a9a6bb',
      '#8c89a1',
      '#5f5c75',
      '#3a3850',
      '#2b2a3d',
      '#1d1c2b',
      '#161522',
      '#12111c',
      '#0d0c15',
    ],
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
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
        {!videoTheaterMode && <Footer />}
        <ReactQueryDevtools />
      </QueryClientProvider>
    </MantineProvider>
  )
}

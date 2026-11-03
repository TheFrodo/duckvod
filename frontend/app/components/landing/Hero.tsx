"use client"
import { Box, Button, Container, Flex, Group, Text } from '@mantine/core';
import classes from './Hero.module.css';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl'


export function LandingHero() {
  const t = useTranslations("LandingHeroComponent")

  return (
    <div className={classes.root}>
      <Container size="xxl" className={classes.inner}>
        <Group justify="space-between" wrap="nowrap">

          <div>
            <span className={classes.eyebrow}>VOD · Archiv · Chat-Replay</span>
            <Text component="h1" className={classes.title}>Duck<span className={classes.titleAccent}>VOD</span></Text>
            <Text component="p" className={classes.subtitle} mt={10}>{t('subtitle')}</Text>
            <Flex mt={28} wrap="wrap" gap={12}>
              <Button
                variant="filled"
                size="md"
                radius="xl"
                component={Link}
                href="/channels"
              >
                {t('channelsButton')}
              </Button>
            </Flex>
          </div>

          {/* hidden on small screens via CSS so there is no layout shift after hydration */}
          <Box mr={40} visibleFrom="sm">
            <Image src="/images/ducksquad-mascot.webp" height={220} width={220} alt="DuckSquad Maskottchen" className={classes.mascot} unoptimized priority />
          </Box>
        </Group>
      </Container>

      {/* water wave like on ducksquad.de */}
      <div className={classes.wave} aria-hidden="true">
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none">
          <path d="M-10,40 C180,90 360,0 540,40 C720,80 900,10 1080,40 C1260,70 1350,30 1450,45 L1450,100 L-10,100 Z" />
        </svg>
      </div>
    </div>
  );
}

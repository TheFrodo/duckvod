"use client"
import { Box, Button, Container, Flex, Group, Title, Text, useMantineTheme } from '@mantine/core';
import classes from './Hero.module.css';
import Image from 'next/image';
import Link from 'next/link';
import { useMediaQuery } from '@mantine/hooks';
import { useTranslations } from 'next-intl'


export function LandingHero() {
  const theme = useMantineTheme()
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const t = useTranslations("LandingHeroComponent")

  return (
    <div className={classes.root}>
      <Container size="xxl">
        <Group justify="space-between">

          <div>
            <span className={classes.eyebrow}>VOD · Archiv · Chat-Replay</span>
            <Text className={classes.title}>Duck<span className={classes.titleAccent}>VOD</span></Text>
            <Title className={classes.subtitle} mt={10} order={3}>{t('subtitle')}</Title>
            <Flex mt={24}>
              <Button
                variant="gradient"
                size="md"
                radius="xl"
                component={Link}
                href="/channels"
                className={classes.button}
              >
                {t('channelsButton')}
              </Button>
              <Button
                ml={10}
                size="md"
                radius="xl"
                variant="default"
                component={Link}
                href="/login"
              >
                {t('loginButton')}
              </Button>
            </Flex>
          </div>

          {!isMobile && (
            <Box mr={60}>
              <Flex justify={"center"} align={"center"}>
                <div className={classes.logoBackground}></div>
                <Image src="/images/ganymede_logo.png" height={140} width={140} alt="DuckVOD logo" className={classes.logo} />
              </Flex>
            </Box>
          )}
        </Group>
      </Container>
    </div>
  );
}
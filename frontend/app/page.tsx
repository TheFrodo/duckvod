"use client"
import { Box, Container, Title } from "@mantine/core";
import useAuthStore from "./store/useAuthStore";
import { LandingHero } from "./components/landing/Hero";
import ContinueWatching from "./components/landing/ContinueWatching";
import RecentlyArchived from "./components/landing/RecentlyArchived";
import LandingChannels from "./components/landing/Channels";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function Home() {
  const { isLoggedIn } = useAuthStore();

  useEffect(() => {
    document.title = "DuckVOD";
  }, []);

  const t = useTranslations("HomePage");

  return (
    <div>
      {!isLoggedIn && (
        <Box mb={5}>
          <LandingHero />
        </Box>
      )}

      {isLoggedIn && (
        <Box mt="xl">
          <Container size={"7xl"}>
            <Title order={2} className="duck-section-title">{t('continueWatching')}</Title>
          </Container>
          <Container mt="md" size={"7xl"}>
            <ContinueWatching count={4} />
          </Container>
        </Box>
      )}

      <Box mt="xl">
        <Container size={"7xl"}>
          <Title order={2} className="duck-section-title">{t('channels')}</Title>
        </Container>
        <Container mt="md" size={"7xl"}>
          <LandingChannels />
        </Container>
      </Box>

      <Box mt="xl" pb="xl">
        <Container size={"7xl"}>
          <Title order={2} className="duck-section-title">{t('recentlyArchived')}</Title>
        </Container>
        <Container mt="md" size={"7xl"}>
          <RecentlyArchived count={8} />
        </Container>
      </Box>



    </div>
  );
}

"use client"

import { Avatar, Container, Progress, SimpleGrid, Text, Title, Tooltip } from "@mantine/core";
import { IconClockHour4, IconDatabase, IconMovie, IconUsers } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { env } from "next-runtime-env";
import Link from "next/link";
import type { ReactNode } from "react";
import GanymedeLoadingText from "../components/utils/GanymedeLoadingText";
import { usePublicStatistics } from "../hooks/useStatistics";
import classes from "./StatisticsPage.module.css";

const VIDEO_TYPES = ["archive", "live", "highlight", "upload", "clip"] as const;

const BYTE_UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];

const formatBytesLocale = (bytes: number, locale: string) => {
  if (bytes <= 0) return "0 B";
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / Math.pow(1024, i));
  return `${value} ${BYTE_UNITS[i]}`;
};

const percent = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);

const StatTile = ({ icon, value, label }: { icon: ReactNode; value: string; label: string }) => (
  <div className={classes.tile}>
    <div className={classes.tileIcon}>{icon}</div>
    <div>
      <div className={classes.tileValue}>{value}</div>
      <div className={classes.tileLabel}>{label}</div>
    </div>
  </div>
);


export default function StatisticsPage() {
  const t = useTranslations("StatisticsPage");
  const locale = useLocale();
  const { data, isPending, isError } = usePublicStatistics();

  if (isPending) return <GanymedeLoadingText message={t("loading")} />;
  if (isError || !data) {
    return (
      <Container size={1240} className={classes.root}>
        <div className={classes.card}>{t("error")}</div>
      </Container>
    );
  }

  const number = new Intl.NumberFormat(locale);
  const date = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  const bytes = (value: number) => formatBytesLocale(value, locale);
  const hours = (seconds: number) => number.format(Math.round(seconds / 3600));

  const types = VIDEO_TYPES
    .map((type) => ({ type, count: data.video_types[type] ?? 0 }))
    .filter((entry) => entry.count > 0);
  const largestTypeCount = Math.max(...types.map((entry) => entry.count), 1);

  return (
    <Container size={1240} className={classes.root}>
      <div className={classes.header}>
        <Title order={1} className="duck-section-title">{t("title")}</Title>
        <Text className={classes.subtitle}>{t("subtitle")}</Text>
        {data.first_streamed_at && data.last_streamed_at && (
          <Text className={classes.period}>
            {t("period", {
              first: date.format(new Date(data.first_streamed_at)),
              last: date.format(new Date(data.last_streamed_at)),
            })}
          </Text>
        )}
      </div>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
        <StatTile icon={<IconMovie size={26} />} value={number.format(data.video_count)} label={t("videos")} />
        <StatTile icon={<IconUsers size={26} />} value={number.format(data.channel_count)} label={t("channels")} />
        <StatTile icon={<IconClockHour4 size={26} />} value={hours(data.total_duration_seconds)} label={t("hours")} />
        <StatTile icon={<IconDatabase size={26} />} value={bytes(data.total_storage_bytes)} label={t("archiveSize")} />
      </SimpleGrid>

      <div className={classes.columns}>
        {types.length > 0 && (
          <section className={classes.card}>
            <Title order={2} className={classes.cardTitle}>{t("typesTitle")}</Title>
            <div className={classes.typeList}>
              {types.map(({ type, count }) => (
                <div key={type} className={classes.typeRow}>
                  <div className={classes.typeHead}>
                    <span className={classes.typeName}>{t(`types.${type}`)}</span>
                    <span className={classes.typeCount}>{number.format(count)}</span>
                  </div>
                  <Progress value={percent(count, largestTypeCount)} color="duck.5" size="md" radius="xl" className={classes.bar} />
                </div>
              ))}
            </div>
          </section>
        )}

        {data.channels.length > 0 && (
          <section className={`${classes.card} ${classes.channelsCard}`}>
            <Title order={2} className={classes.cardTitle}>{t("channelsTitle")}</Title>
            <div className={classes.channelList}>
              {data.channels.map((channel) => (
                <div key={channel.id} className={classes.channelRow}>
                  <Link href={`/channels/${channel.name}`} className={classes.channelLink}>
                    <Avatar
                      src={`${env("NEXT_PUBLIC_CDN_URL") ?? ""}${channel.image_path}`}
                      alt={channel.display_name}
                      size={48}
                      radius="xl"
                      className={classes.channelAvatar}
                    />
                    <span className={classes.channelName}>{channel.display_name}</span>
                  </Link>
                  <div className={classes.channelStats}>
                    <span>{t("channelVideos", { count: channel.video_count })}</span>
                    <span>{t("channelHours", { hours: hours(channel.duration_seconds) })}</span>
                    <span className={classes.channelStorage}>{bytes(channel.storage_bytes)}</span>
                  </div>
                  <Tooltip label={t("channelShare", { percent: number.format(Math.round(percent(channel.storage_bytes, data.total_storage_bytes))) })}>
                    <Progress
                      value={percent(channel.storage_bytes, data.total_storage_bytes)}
                      color="duck.5"
                      size="md"
                      radius="xl"
                      className={classes.bar}
                    />
                  </Tooltip>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Container>
  );
}

"use client"
import { useEffect, useState } from "react";
import { ActionIcon, Affix, Button, Group, Loader, Paper, Progress, Stack, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconDownload, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import {
  DownloadState,
  downloadFileUrl,
  isDownloadFinished,
  useCancelDownload,
  useDownloadStatus,
} from "@/app/hooks/useDownloads";
import useDownloadStore, { DownloadEntry } from "@/app/store/useDownloadStore";
import { formatBytes } from "@/app/util/util";
import classes from "./DownloadPanel.module.css";

const COMPLETED_DISMISS_MS = 10000;

// A plain link lets the browser stream the file to disk instead of memory.
const triggerBrowserDownload = (url: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const DownloadItem = ({ entry }: { entry: DownloadEntry }) => {
  const t = useTranslations("Downloads");
  const { data } = useDownloadStatus(entry.ticketId);
  const markStarted = useDownloadStore((state) => state.markStarted);
  const removeDownload = useDownloadStore((state) => state.removeDownload);
  const cancelDownload = useCancelDownload();
  const state = data?.state;

  useEffect(() => {
    if (state === DownloadState.Ready && !entry.started) {
      markStarted(entry.ticketId);
      triggerBrowserDownload(downloadFileUrl(entry.ticketId));
    }
  }, [state, entry.started, entry.ticketId, markStarted]);

  useEffect(() => {
    if (state !== DownloadState.Completed) return;
    const timer = setTimeout(() => removeDownload(entry.ticketId), COMPLETED_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [state, entry.ticketId, removeDownload]);

  const finished = state !== undefined && isDownloadFinished(state);

  const handleClose = async () => {
    if (!finished) {
      try {
        await cancelDownload.mutateAsync({ ticketId: entry.ticketId });
      } catch (error) {
        console.error(error);
      }
    }
    removeDownload(entry.ticketId);
  };

  const total = data?.total_bytes ?? 0;
  const sent = data?.bytes_sent ?? 0;
  let percent = total > 0 ? Math.min(100, (sent / total) * 100) : 0;
  // Remuxed sizes are estimates; never claim 100% before the server does.
  if (data?.size_estimated && state !== DownloadState.Completed) percent = Math.min(percent, 99);
  if (state === DownloadState.Completed) percent = 100;

  const renderStatus = () => {
    switch (state) {
      case undefined:
        return <Loader size="xs" />;
      case DownloadState.Queued:
        return (
          <>
            <Group gap={6}>
              <Loader size={12} />
              <Text size="xs">{t("queued", { position: data?.position ?? 0 })}</Text>
            </Group>
            <Text size="xs" c="dimmed">{t("keepTabOpen")}</Text>
          </>
        );
      case DownloadState.Ready:
        return (
          <Group justify="space-between" gap="xs">
            <Text size="xs">{t("ready")}</Text>
            <Button
              size="compact-xs"
              variant="light"
              leftSection={<IconDownload size={12} />}
              onClick={() => triggerBrowserDownload(downloadFileUrl(entry.ticketId))}
            >
              {t("startButton")}
            </Button>
          </Group>
        );
      case DownloadState.Downloading:
      case DownloadState.Completed:
        return (
          <>
            <Progress value={percent} size="sm" animated={state === DownloadState.Downloading} />
            <Group justify="space-between" gap="xs">
              <Text size="xs" c="dimmed">
                {state === DownloadState.Completed
                  ? t("completed")
                  : t(data?.size_estimated ? "progressEstimated" : "progress", {
                    sent: formatBytes(sent, 1),
                    total: formatBytes(total, 1),
                  })}
              </Text>
              {state === DownloadState.Completed ? (
                <IconCheck size={14} color="var(--mantine-color-green-6)" />
              ) : (
                <Text size="xs" c="dimmed">{Math.floor(percent)}%</Text>
              )}
            </Group>
          </>
        );
      case DownloadState.Failed:
        return <Text size="xs" c="red">{t("failed")}</Text>;
      case DownloadState.Expired:
        return <Text size="xs" c="red">{t("expired")}</Text>;
      case DownloadState.Canceled:
        return <Text size="xs" c="dimmed">{t("canceled")}</Text>;
    }
  };

  return (
    <Paper withBorder p="xs" radius="md" className={classes.item}>
      <Group justify="space-between" wrap="nowrap" gap="xs" mb={4}>
        <Text size="sm" fw={600} lineClamp={1} title={entry.title}>
          {entry.title}
        </Text>
        <Tooltip label={finished ? t("dismiss") : t("cancel")} openDelay={250}>
          <ActionIcon
            size="sm"
            variant="subtle"
            color="gray"
            onClick={handleClose}
            loading={cancelDownload.isPending}
            aria-label={finished ? t("dismiss") : t("cancel")}
          >
            <IconX size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Stack gap={4}>{renderStatus()}</Stack>
    </Paper>
  );
};

/** Floating list of queued and running downloads, shown on every page. */
const DownloadPanel = () => {
  const t = useTranslations("Downloads");
  const downloads = useDownloadStore((state) => state.downloads);
  // The store is restored from sessionStorage, which the server render lacks.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || downloads.length === 0) return null;

  return (
    <Affix position={{ bottom: 16, right: 16 }} zIndex={300}>
      <Paper shadow="lg" p="sm" radius="lg" withBorder className={classes.panel}>
        <Text size="sm" fw={700} mb="xs">{t("title")}</Text>
        <Stack gap="xs">
          {downloads.map((entry) => (
            <DownloadItem key={entry.ticketId} entry={entry} />
          ))}
        </Stack>
      </Paper>
    </Affix>
  );
};

export default DownloadPanel;

"use client"
import { Box, Button } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Video } from "@/app/hooks/useVideos";
import { ArchiveStatus } from "@/app/util/archiveStatus";
import useStartVideoDownload from "./useStartVideoDownload";

const VideoDownloadButton = ({ video }: { video: Video }) => {
  const t = useTranslations("Downloads");
  const { start, isPending } = useStartVideoDownload();

  if (video.status !== ArchiveStatus.Completed) return null;

  return (
    <Box mt={5} mr={5}>
      <Button
        variant="default"
        size="xs"
        leftSection={<IconDownload size={14} />}
        loading={isPending}
        onClick={() => start(video)}
      >
        {t("button")}
      </Button>
    </Box>
  );
};

export default VideoDownloadButton;

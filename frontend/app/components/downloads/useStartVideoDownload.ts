import { showNotification } from "@mantine/notifications";
import { useTranslations } from "next-intl";
import {
  downloadErrorMessage,
  downloadErrorStatus,
  useCreateDownload,
} from "@/app/hooks/useDownloads";
import useDownloadStore from "@/app/store/useDownloadStore";

type DownloadableVideo = { id: string; title: string };

/** Queues a video download; the global DownloadPanel takes it from there. */
const useStartVideoDownload = () => {
  const t = useTranslations("Downloads");
  const createDownload = useCreateDownload();
  const addDownload = useDownloadStore((state) => state.addDownload);

  const start = async (video: DownloadableVideo) => {
    try {
      const status = await createDownload.mutateAsync({ videoId: video.id });
      addDownload({ ticketId: status.id, videoId: video.id, title: video.title });
      showNotification({ message: t("queuedNotification") });
    } catch (error) {
      const statusCode = downloadErrorStatus(error);
      const message =
        statusCode === 429
          ? t("limitError")
          : statusCode === 503
            ? t("busyError")
            : downloadErrorMessage(error) ?? t("genericError");
      showNotification({ title: t("errorTitle"), message, color: "red" });
    }
  };

  return { start, isPending: createDownload.isPending };
};

export default useStartVideoDownload;

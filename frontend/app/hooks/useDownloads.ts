import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { env } from "next-runtime-env";
import useAxios, { ApiResponse } from "./useAxios";

export enum DownloadState {
  Queued = "queued",
  Ready = "ready",
  Downloading = "downloading",
  Completed = "completed",
  Failed = "failed",
  Expired = "expired",
  Canceled = "canceled",
}

export interface DownloadStatus {
  id: string;
  vod_id: string;
  state: DownloadState;
  position: number;
  bytes_sent: number;
  total_bytes: number;
  size_estimated: boolean;
  filename: string;
}

export const isDownloadFinished = (state: DownloadState) =>
  state === DownloadState.Completed ||
  state === DownloadState.Failed ||
  state === DownloadState.Expired ||
  state === DownloadState.Canceled;

export const downloadFileUrl = (ticketId: string) =>
  `${env("NEXT_PUBLIC_API_URL") ?? ""}/api/v1/download/${ticketId}/file`;

const createDownload = async (videoId: string): Promise<DownloadStatus> => {
  const response = await useAxios.post<ApiResponse<DownloadStatus>>(
    `/api/v1/vod/${videoId}/download`
  );
  return response.data.data;
};

export const useCreateDownload = () =>
  useMutation<DownloadStatus, Error, { videoId: string }>({
    mutationFn: ({ videoId }) => createDownload(videoId),
  });

const fetchDownloadStatus = async (ticketId: string): Promise<DownloadStatus> => {
  try {
    const response = await useAxios.get<ApiResponse<DownloadStatus>>(
      `/api/v1/download/${ticketId}`
    );
    return response.data.data;
  } catch (error) {
    // Tickets are kept in server memory and vanish after a restart.
    if (isAxiosError(error) && error.response?.status === 404) {
      return {
        id: ticketId,
        vod_id: "",
        state: DownloadState.Expired,
        position: 0,
        bytes_sent: 0,
        total_bytes: 0,
        size_estimated: false,
        filename: "",
      };
    }
    throw error;
  }
};

// Polling doubles as the heartbeat that keeps a queued ticket alive.
export const useDownloadStatus = (ticketId: string) =>
  useQuery({
    queryKey: ["download", ticketId],
    queryFn: () => fetchDownloadStatus(ticketId),
    refetchInterval: (query) => {
      const status = query.state.data;
      if (status && isDownloadFinished(status.state)) return false;
      return status?.state === DownloadState.Downloading ? 1000 : 2000;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  });

export const useCancelDownload = () =>
  useMutation<void, Error, { ticketId: string }>({
    mutationFn: async ({ ticketId }) => {
      await useAxios.delete(`/api/v1/download/${ticketId}`);
    },
  });

/** Returns the API error message, if any, for display. */
export const downloadErrorMessage = (error: unknown): string | undefined =>
  isAxiosError(error) ? error.response?.data?.message : undefined;

export const downloadErrorStatus = (error: unknown): number | undefined =>
  isAxiosError(error) ? error.response?.status : undefined;

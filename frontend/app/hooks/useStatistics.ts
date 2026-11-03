import { useQuery } from "@tanstack/react-query";
import useAxios, { ApiResponse } from "./useAxios";

export interface PublicChannelStatistics {
  id: string;
  name: string;
  display_name: string;
  image_path: string;
  video_count: number;
  duration_seconds: number;
  storage_bytes: number;
}

export interface PublicStorageStatistics {
  used_bytes: number; // Tracked video storage
  free_bytes: number; // Free space of the videos filesystem
  total_bytes: number; // Capacity of the videos filesystem
}

export interface PublicStatistics {
  video_count: number;
  channel_count: number;
  total_duration_seconds: number;
  total_storage_bytes: number;
  video_types: Record<string, number>;
  channels: PublicChannelStatistics[];
  storage?: PublicStorageStatistics;
  first_streamed_at?: string;
  last_streamed_at?: string;
}

const fetchPublicStatistics = async (): Promise<PublicStatistics> => {
  const response = await useAxios.get<ApiResponse<PublicStatistics>>(
    "/api/v1/statistics"
  );
  return response.data.data;
};

const usePublicStatistics = () => {
  return useQuery({
    queryKey: ["statistics", "public"],
    queryFn: fetchPublicStatistics,
    refetchOnWindowFocus: false,
  });
};

export { fetchPublicStatistics, usePublicStatistics };

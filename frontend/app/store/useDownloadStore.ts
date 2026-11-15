import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface DownloadEntry {
  ticketId: string;
  videoId: string;
  title: string;
  // Set once the browser download was triggered so it is not started twice.
  started: boolean;
}

interface DownloadStoreState {
  downloads: DownloadEntry[];
  addDownload: (entry: Omit<DownloadEntry, "started">) => void;
  markStarted: (ticketId: string) => void;
  removeDownload: (ticketId: string) => void;
}

// Session storage keeps queue places across reloads within a tab.
const useDownloadStore = create<DownloadStoreState>()(
  persist(
    (set) => ({
      downloads: [],
      addDownload: (entry) =>
        set((state) =>
          state.downloads.some((d) => d.ticketId === entry.ticketId)
            ? state
            : { downloads: [...state.downloads, { ...entry, started: false }] }
        ),
      markStarted: (ticketId) =>
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.ticketId === ticketId ? { ...d, started: true } : d
          ),
        })),
      removeDownload: (ticketId) =>
        set((state) => ({
          downloads: state.downloads.filter((d) => d.ticketId !== ticketId),
        })),
    }),
    {
      name: "ganymede-downloads",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export default useDownloadStore;

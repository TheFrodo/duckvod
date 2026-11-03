import { useGetVideoChatHistogram } from "@/app/hooks/useVideos";
import { BarChart } from '@mantine/charts';
import { Title } from "@mantine/core";
import classes from "./ChatHistogram.module.css";
import { RefObject } from "react";
import { useTranslations } from "next-intl";

type Props = {
  videoId: string;
  playerRef: RefObject<HTMLVideoElement | null>;
}

const VideoChatHistogram = ({ videoId, playerRef }: Props) => {
  const t = useTranslations('VideoComponents')
  const { data, isPending, isError } = useGetVideoChatHistogram(videoId)

  // Hide the whole section while loading or when the video has no usable chat history.
  if (isPending || isError || !data) {
    return null
  }

  const secondsToHHMM = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const HHMMToseconds = (str: string): number => {
    const p = str.split(':');
    return Number.parseInt(p[0]) * 3600 + Number.parseInt(p[1]) * 60;
  }

  const result = Object.entries(data).map(([time, count]) => ({
    Time: secondsToHHMM(parseInt(time)),
    Messages: count,
  }));

  if (!result.some((point) => Number(point.Messages) > 0)) {
    return null
  }

  return (
    <div className={classes.card}>
      <Title order={2} className="duck-section-title" mb="lg">{t('chatHistogramTitle')}</Title>
      <BarChart
        h={300}
        data={result}
        dataKey="Time"
        barProps={{ radius: [6, 6, 0, 0], stroke: "var(--ds-line)", strokeWidth: 2 }}
        gridAxis="y"
        strokeDasharray="4 4"
        cursorFill="color-mix(in srgb, var(--mantine-color-duck-5) 18%, transparent)"
        barChartProps={{
          style: { cursor: "pointer" },
          onClick: ({ activeLabel }) => {
            if (activeLabel === undefined || playerRef.current === null) {
              return;
            }

            playerRef.current.currentTime = HHMMToseconds(String(activeLabel));
          },
        }}
        series={[
          { name: 'Messages', color: 'duck.5' },
        ]}
        tickLine="y"
      />
    </div>
  );
}

export default VideoChatHistogram;

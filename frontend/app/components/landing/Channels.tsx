import { SimpleGrid } from "@mantine/core"
import ChannelCard from "../channel/Card"
import { useFetchChannels } from "@/app/hooks/useChannels"
import { useTranslations } from "next-intl"

const LandingChannels = () => {
  const t = useTranslations("ChannelsPage")

  const { data: channels, isPending, isError } = useFetchChannels()

  if (isPending) return (<div></div>)
  if (isError) return <div>{t('error')}</div>

  return (
    <SimpleGrid
      cols={{ base: 2, sm: 3, md: 4, lg: 6, xl: 8 }}
      spacing="lg"
      verticalSpacing="lg"
    >
      {channels.map((channel) => (
        <ChannelCard key={channel.id} channel={channel} />
      ))}
    </SimpleGrid>
  )
}

export default LandingChannels

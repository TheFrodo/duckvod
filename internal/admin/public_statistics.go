package admin

import (
	"context"
	"fmt"
	"sort"
	"time"
)

type PublicChannelStatistics struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	DisplayName     string `json:"display_name"`
	ImagePath       string `json:"image_path"`
	VideoCount      int    `json:"video_count"`
	DurationSeconds int64  `json:"duration_seconds"`
	StorageBytes    int64  `json:"storage_bytes"`
}

// GetPublicStatisticsResponse only contains aggregate archive numbers that are safe to show
// to anonymous visitors: no file paths, users, queue, host or filesystem details.
type GetPublicStatisticsResponse struct {
	VideoCount           int                       `json:"video_count"`
	ChannelCount         int                       `json:"channel_count"`
	TotalDurationSeconds int64                     `json:"total_duration_seconds"`
	TotalStorageBytes    int64                     `json:"total_storage_bytes"`
	VideoTypes           map[string]int            `json:"video_types"`
	Channels             []PublicChannelStatistics `json:"channels"`
	FirstStreamedAt      *time.Time                `json:"first_streamed_at,omitempty"`
	LastStreamedAt       *time.Time                `json:"last_streamed_at,omitempty"`
}

// GetPublicStatistics returns archive statistics for the public statistics page.
func (s *Service) GetPublicStatistics(ctx context.Context) (GetPublicStatisticsResponse, error) {
	resp := GetPublicStatisticsResponse{
		VideoTypes: make(map[string]int),
		Channels:   make([]PublicChannelStatistics, 0),
	}

	channels, err := s.Store.Client.Channel.Query().All(ctx)
	if err != nil {
		return resp, fmt.Errorf("error getting channels: %w", err)
	}
	byChannel := make(map[string]*PublicChannelStatistics, len(channels))
	for _, ch := range channels {
		byChannel[ch.ID.String()] = &PublicChannelStatistics{
			ID:          ch.ID.String(),
			Name:        ch.Name,
			DisplayName: ch.DisplayName,
			ImagePath:   ch.ImagePath,
		}
	}

	vods, err := s.Store.Client.Vod.Query().WithChannel().All(ctx)
	if err != nil {
		return resp, fmt.Errorf("error getting videos: %w", err)
	}

	for _, vod := range vods {
		resp.VideoCount++
		resp.TotalDurationSeconds += int64(vod.Duration)
		resp.TotalStorageBytes += vod.StorageSizeBytes
		resp.VideoTypes[string(vod.Type)]++

		if !vod.StreamedAt.IsZero() {
			streamedAt := vod.StreamedAt
			if resp.FirstStreamedAt == nil || streamedAt.Before(*resp.FirstStreamedAt) {
				resp.FirstStreamedAt = &streamedAt
			}
			if resp.LastStreamedAt == nil || streamedAt.After(*resp.LastStreamedAt) {
				resp.LastStreamedAt = &streamedAt
			}
		}

		if vod.Edges.Channel == nil {
			continue
		}
		if ch, ok := byChannel[vod.Edges.Channel.ID.String()]; ok {
			ch.VideoCount++
			ch.DurationSeconds += int64(vod.Duration)
			ch.StorageBytes += vod.StorageSizeBytes
		}
	}

	resp.ChannelCount = len(channels)
	for _, ch := range byChannel {
		resp.Channels = append(resp.Channels, *ch)
	}
	sort.Slice(resp.Channels, func(i, j int) bool {
		if resp.Channels[i].StorageBytes != resp.Channels[j].StorageBytes {
			return resp.Channels[i].StorageBytes > resp.Channels[j].StorageBytes
		}
		return resp.Channels[i].Name < resp.Channels[j].Name
	})

	return resp, nil
}

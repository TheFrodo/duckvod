package http

import (
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/zibbp/ganymede/ent"
)

func TestPathWithin(t *testing.T) {
	t.Parallel()

	base := filepath.Join(t.TempDir(), "videos")
	tests := []struct {
		name   string
		target string
		want   bool
	}{
		{"file inside", filepath.Join(base, "channel", "vod", "video.m3u8"), true},
		{"base itself", base, false},
		{"parent traversal", filepath.Join(base, "..", "secret.txt"), false},
		{"sibling with shared prefix", base + "-other" + string(filepath.Separator) + "video.mp4", false},
		{"unrelated path", filepath.Join(t.TempDir(), "video.mp4"), false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, pathWithin(base, tt.target))
		})
	}
	assert.False(t, pathWithin("", filepath.Join(base, "video.mp4")))
}

func TestDownloadFilename(t *testing.T) {
	t.Parallel()

	video := &ent.Vod{
		ID:         uuid.New(),
		Title:      `Late "stream": a/b\c <test>?`,
		StreamedAt: time.Date(2026, 3, 4, 20, 0, 0, 0, time.UTC),
	}
	video.Edges.Channel = &ent.Channel{Name: "duck", DisplayName: "Duck"}

	assert.Equal(t, "Duck - 2026-03-04 - Late stream a b c test.mp4", downloadFilename(video))
}

func TestDownloadFilenameFallsBackToID(t *testing.T) {
	t.Parallel()

	video := &ent.Vod{ID: uuid.New(), Title: `???`}
	assert.Equal(t, video.ID.String()+".mp4", downloadFilename(video))
}

func TestSanitizeFilenameTruncates(t *testing.T) {
	t.Parallel()

	got := sanitizeFilename(strings.Repeat("ä", maxDownloadFilenameRunes+20))
	assert.Equal(t, maxDownloadFilenameRunes, len([]rune(got)))
}

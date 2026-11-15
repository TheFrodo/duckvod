package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/zibbp/ganymede/ent"
	"github.com/zibbp/ganymede/internal/download"
	"github.com/zibbp/ganymede/internal/utils"
)

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

type downloadVodServiceStub struct {
	VodService
	video *ent.Vod
}

func (s downloadVodServiceStub) GetVod(_ context.Context, _ uuid.UUID, _, _, _, _ bool) (*ent.Vod, error) {
	return s.video, nil
}

func decodeDownloadStatus(t *testing.T, body []byte) download.Status {
	t.Helper()
	var res struct {
		Data download.Status `json:"data"`
	}
	require.NoError(t, json.Unmarshal(body, &res))
	return res.Data
}

func TestDownloadFlowServesConcatenatedHls(t *testing.T) {
	videosDir := t.TempDir()
	t.Setenv("TWITCH_CLIENT_ID", "test")
	t.Setenv("TWITCH_CLIENT_SECRET", "test")
	t.Setenv("VIDEOS_DIR", videosDir)

	dir := filepath.Join(videosDir, "duck", "123")
	require.NoError(t, os.MkdirAll(dir, 0o755))
	playlist := filepath.Join(dir, "123-video.m3u8")
	require.NoError(t, os.WriteFile(playlist, []byte("#EXTM3U\n#EXT-X-MAP:URI=\"123_init.mp4\"\n#EXTINF:1,\n123_segment0.m4s\n#EXTINF:1,\n123_segment1.m4s\n#EXT-X-ENDLIST\n"), 0o644))
	for name, content := range map[string]string{"123_init.mp4": "init", "123_segment0.m4s": "-zero", "123_segment1.m4s": "-one"} {
		require.NoError(t, os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644))
	}

	video := &ent.Vod{ID: uuid.New(), Title: "Stream", Status: utils.ArchiveCompleted, VideoPath: playlist}
	e := echo.New()
	h := Handler{Service: Services{
		VodService:      downloadVodServiceStub{video: video},
		DownloadService: download.NewManager(download.Options{MaxActive: 1, MaxPerClient: 1}),
	}}
	call := func(method, target string, fn echo.HandlerFunc, params ...string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, target, nil)
		req.RemoteAddr = "192.0.2.1:1234"
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("id")
		c.SetParamValues(params...)
		require.NoError(t, fn(c))
		return rec
	}

	rec := call(http.MethodPost, "/", h.CreateVodDownload, video.ID.String())
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	ticket := decodeDownloadStatus(t, rec.Body.Bytes())
	require.Equal(t, download.StateReady, ticket.State)
	require.EqualValues(t, len("init-zero-one"), ticket.TotalBytes)

	// The per-client limit applies to other videos.
	other := *video
	other.ID = uuid.New()
	h.Service.VodService = downloadVodServiceStub{video: &other}
	rec = call(http.MethodPost, "/", h.CreateVodDownload, other.ID.String())
	require.Equal(t, http.StatusTooManyRequests, rec.Code)

	rec = call(http.MethodGet, "/", h.GetDownloadFile, ticket.ID.String())
	require.Equal(t, http.StatusOK, rec.Code)
	require.Equal(t, "init-zero-one", rec.Body.String())
	require.Equal(t, "13", rec.Header().Get(echo.HeaderContentLength))
	require.Contains(t, rec.Header().Get(echo.HeaderContentDisposition), "Stream.mp4")

	rec = call(http.MethodGet, "/", h.GetDownload, ticket.ID.String())
	status := decodeDownloadStatus(t, rec.Body.Bytes())
	require.Equal(t, download.StateCompleted, status.State)
	require.EqualValues(t, 13, status.BytesSent)

	rec = call(http.MethodGet, "/", h.GetDownloadFile, ticket.ID.String())
	require.Equal(t, http.StatusConflict, rec.Code, "tickets are single-use")
}

func TestCreateVodDownloadRejectsPathOutsideVideosDir(t *testing.T) {
	t.Setenv("TWITCH_CLIENT_ID", "test")
	t.Setenv("TWITCH_CLIENT_SECRET", "test")
	t.Setenv("VIDEOS_DIR", filepath.Join(t.TempDir(), "videos"))

	outside := filepath.Join(t.TempDir(), "secret.mp4")
	require.NoError(t, os.WriteFile(outside, []byte("secret"), 0o644))
	video := &ent.Vod{ID: uuid.New(), Status: utils.ArchiveCompleted, VideoPath: outside}
	h := Handler{Service: Services{
		VodService:      downloadVodServiceStub{video: video},
		DownloadService: download.NewManager(download.Options{}),
	}}

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	rec := httptest.NewRecorder()
	c := echo.New().NewContext(req, rec)
	c.SetParamNames("id")
	c.SetParamValues(video.ID.String())
	require.NoError(t, h.CreateVodDownload(c))
	require.Equal(t, http.StatusForbidden, rec.Code)
}

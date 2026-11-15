package http

import (
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"unicode"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
	"github.com/zibbp/ganymede/ent"
	"github.com/zibbp/ganymede/internal/config"
	"github.com/zibbp/ganymede/internal/exec"
	"github.com/zibbp/ganymede/internal/utils"
)

const maxDownloadFilenameRunes = 150

// DownloadVod godoc
//
//	@Summary		Download a vod as MP4
//	@Description	Streams the archived video as an MP4 file. HLS archives are remuxed on the fly without re-encoding, so the response has no Content-Length and cannot be resumed.
//	@Tags			vods
//	@Produce		video/mp4
//	@Param			id	path		string	true	"Vod ID"
//	@Success		200	{file}		file
//	@Failure		400	{object}	utils.ErrorResponse
//	@Failure		403	{object}	utils.ErrorResponse
//	@Failure		404	{object}	utils.ErrorResponse
//	@Failure		409	{object}	utils.ErrorResponse
//	@Failure		500	{object}	utils.ErrorResponse
//	@Router			/vod/{id}/download [get]
//	@Security		ApiKeyAuth
func (h *Handler) DownloadVod(c echo.Context) error {
	vID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return ErrorResponse(c, http.StatusBadRequest, err.Error())
	}
	ctx := c.Request().Context()
	video, err := h.Service.VodService.GetVod(ctx, vID, true, false, false, false)
	if err != nil {
		if err.Error() == "vod not found" {
			return ErrorResponse(c, http.StatusNotFound, err.Error())
		}
		return ErrorResponse(c, http.StatusInternalServerError, err.Error())
	}
	if video.Status != utils.ArchiveCompleted {
		return ErrorResponse(c, http.StatusConflict, "video is not completely archived yet")
	}

	videoPath := filepath.Clean(video.VideoPath)
	if !pathWithin(config.GetEnvConfig().VideosDir, videoPath) {
		log.Warn().Str("vod_id", vID.String()).Str("path", videoPath).Msg("refusing download outside videos directory")
		return ErrorResponse(c, http.StatusForbidden, "video path is outside the videos directory")
	}
	info, err := os.Stat(videoPath)
	if err != nil || !info.Mode().IsRegular() {
		return ErrorResponse(c, http.StatusNotFound, "video file not found")
	}

	disposition := mime.FormatMediaType("attachment", map[string]string{"filename": downloadFilename(video)})
	c.Response().Header().Set(echo.HeaderContentDisposition, disposition)

	if !strings.EqualFold(filepath.Ext(videoPath), ".m3u8") {
		// Direct files support Range requests and resuming.
		return c.File(videoPath)
	}

	// The response is committed on ffmpeg's first write.
	res := c.Response()
	res.Header().Set(echo.HeaderContentType, "video/mp4")
	res.Header().Set("X-Accel-Buffering", "no")

	err = exec.StreamHlsAsMp4(ctx, videoPath, video.Title, res)
	switch {
	case err == nil:
		return nil
	case exec.IsCanceled(err):
		log.Debug().Str("vod_id", vID.String()).Msg("vod download canceled by client")
		return nil
	case !res.Committed:
		log.Error().Err(err).Str("vod_id", vID.String()).Msg("vod download failed before streaming")
		res.Header().Del(echo.HeaderContentDisposition)
		return ErrorResponse(c, http.StatusInternalServerError, "failed to prepare video download")
	default:
		// Headers are already sent; the client sees a truncated download.
		log.Error().Err(err).Str("vod_id", vID.String()).Msg("vod download failed while streaming")
		return nil
	}
}

// pathWithin reports whether target lies inside base after cleaning both.
func pathWithin(base, target string) bool {
	if base == "" {
		return false
	}
	rel, err := filepath.Rel(filepath.Clean(base), filepath.Clean(target))
	if err != nil {
		return false
	}
	return rel != "." && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)) && !filepath.IsAbs(rel)
}

// downloadFilename returns "<channel> - <YYYY-MM-DD> - <title>.mp4" with
// characters that are invalid on common filesystems removed.
func downloadFilename(video *ent.Vod) string {
	parts := make([]string, 0, 3)
	if video.Edges.Channel != nil {
		if name := video.Edges.Channel.DisplayName; name != "" {
			parts = append(parts, name)
		} else if video.Edges.Channel.Name != "" {
			parts = append(parts, video.Edges.Channel.Name)
		}
	}
	if !video.StreamedAt.IsZero() {
		parts = append(parts, video.StreamedAt.Format("2006-01-02"))
	}
	parts = append(parts, video.Title)

	name := sanitizeFilename(strings.Join(parts, " - "))
	if name == "" {
		name = video.ID.String()
	}
	return name + ".mp4"
}

func sanitizeFilename(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch {
		case strings.ContainsRune(`<>:"/\|?*`, r), unicode.IsControl(r):
			b.WriteRune(' ')
		default:
			b.WriteRune(r)
		}
	}
	name := strings.Join(strings.Fields(b.String()), " ")
	if runes := []rune(name); len(runes) > maxDownloadFilenameRunes {
		name = string(runes[:maxDownloadFilenameRunes])
	}
	return strings.Trim(name, " .")
}

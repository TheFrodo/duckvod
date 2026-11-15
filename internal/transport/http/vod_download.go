package http

import (
	"context"
	"errors"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"unicode"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog/log"
	"github.com/zibbp/ganymede/ent"
	"github.com/zibbp/ganymede/internal/config"
	"github.com/zibbp/ganymede/internal/download"
	"github.com/zibbp/ganymede/internal/exec"
	"github.com/zibbp/ganymede/internal/utils"
)

const maxDownloadFilenameRunes = 150

type DownloadService interface {
	Enqueue(vodID uuid.UUID, client, filename string, src *download.Source) (download.Status, error)
	Status(id uuid.UUID) (download.Status, error)
	Cancel(id uuid.UUID) error
	Start(ctx context.Context, id uuid.UUID) (*download.Lease, error)
}

// CreateVodDownload godoc
//
//	@Summary		Queue a vod download
//	@Description	Creates a download ticket. Only a limited number of downloads run at once; poll the ticket until it is ready, then fetch its file.
//	@Tags			downloads
//	@Produce		json
//	@Param			id	path		string	true	"Vod ID"
//	@Success		200	{object}	download.Status
//	@Failure		400	{object}	utils.ErrorResponse
//	@Failure		403	{object}	utils.ErrorResponse
//	@Failure		404	{object}	utils.ErrorResponse
//	@Failure		409	{object}	utils.ErrorResponse
//	@Failure		429	{object}	utils.ErrorResponse
//	@Failure		503	{object}	utils.ErrorResponse
//	@Router			/vod/{id}/download [post]
func (h *Handler) CreateVodDownload(c echo.Context) error {
	vID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return ErrorResponse(c, http.StatusBadRequest, err.Error())
	}
	video, err := h.Service.VodService.GetVod(c.Request().Context(), vID, true, false, false, false)
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
	if !download.PathWithin(config.GetEnvConfig().VideosDir, videoPath) {
		log.Warn().Str("vod_id", vID.String()).Str("path", videoPath).Msg("refusing download outside videos directory")
		return ErrorResponse(c, http.StatusForbidden, "video path is outside the videos directory")
	}
	src, err := download.Resolve(videoPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return ErrorResponse(c, http.StatusNotFound, "video file not found")
		}
		log.Error().Err(err).Str("vod_id", vID.String()).Msg("failed to prepare vod download")
		return ErrorResponse(c, http.StatusInternalServerError, "failed to prepare video download")
	}

	status, err := h.Service.DownloadService.Enqueue(vID, c.RealIP(), downloadFilename(video), src)
	switch {
	case errors.Is(err, download.ErrClientLimit):
		return ErrorResponse(c, http.StatusTooManyRequests, err.Error())
	case errors.Is(err, download.ErrQueueFull):
		return ErrorResponse(c, http.StatusServiceUnavailable, err.Error())
	case err != nil:
		return ErrorResponse(c, http.StatusInternalServerError, err.Error())
	}
	return SuccessResponse(c, status, "download queued")
}

// GetDownload godoc
//
//	@Summary		Get download ticket status
//	@Description	Returns queue position or transfer progress. Polling keeps a queued ticket alive.
//	@Tags			downloads
//	@Produce		json
//	@Param			id	path		string	true	"Download ticket ID"
//	@Success		200	{object}	download.Status
//	@Failure		400	{object}	utils.ErrorResponse
//	@Failure		404	{object}	utils.ErrorResponse
//	@Router			/download/{id} [get]
func (h *Handler) GetDownload(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return ErrorResponse(c, http.StatusBadRequest, err.Error())
	}
	status, err := h.Service.DownloadService.Status(id)
	if err != nil {
		return downloadErrorResponse(c, err)
	}
	return SuccessResponse(c, status, "download status")
}

// CancelDownload godoc
//
//	@Summary		Cancel a download
//	@Tags			downloads
//	@Produce		json
//	@Param			id	path		string	true	"Download ticket ID"
//	@Success		200	{object}	nil
//	@Failure		400	{object}	utils.ErrorResponse
//	@Failure		404	{object}	utils.ErrorResponse
//	@Router			/download/{id} [delete]
func (h *Handler) CancelDownload(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return ErrorResponse(c, http.StatusBadRequest, err.Error())
	}
	if err := h.Service.DownloadService.Cancel(id); err != nil {
		return downloadErrorResponse(c, err)
	}
	return SuccessResponse(c, nil, "download canceled")
}

// GetDownloadFile godoc
//
//	@Summary		Download the MP4 file of a ready ticket
//	@Description	Streams the video as MP4. Concatenable fMP4 archives have an exact Content-Length; other HLS archives are remuxed by ffmpeg without re-encoding. Each ticket can be started once.
//	@Tags			downloads
//	@Produce		video/mp4
//	@Param			id	path	string	true	"Download ticket ID"
//	@Success		200	{file}	file
//	@Failure		400	{object}	utils.ErrorResponse
//	@Failure		404	{object}	utils.ErrorResponse
//	@Failure		409	{object}	utils.ErrorResponse
//	@Router			/download/{id}/file [get]
func (h *Handler) GetDownloadFile(c echo.Context) error {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return ErrorResponse(c, http.StatusBadRequest, err.Error())
	}
	lease, err := h.Service.DownloadService.Start(c.Request().Context(), id)
	if err != nil {
		return downloadErrorResponse(c, err)
	}
	logger := log.With().Str("download_id", id.String()).Str("path", lease.Source.Path).Logger()

	res := c.Response()
	res.Header().Set(echo.HeaderContentType, "video/mp4")
	res.Header().Set(echo.HeaderContentDisposition, mime.FormatMediaType("attachment", map[string]string{"filename": lease.Filename}))
	res.Header().Set("X-Accel-Buffering", "no")
	res.Header().Set(echo.HeaderCacheControl, "no-store")

	ctx := lease.Context()
	if lease.Source.Remux {
		// The response is committed on ffmpeg's first write.
		err = exec.StreamHlsAsMp4(ctx, lease.Source.Path, strings.TrimSuffix(lease.Filename, ".mp4"), lease.Writer(res))
	} else {
		var reader io.ReadCloser
		reader, err = lease.Source.Open()
		if err == nil {
			res.Header().Set(echo.HeaderContentLength, strconv.FormatInt(lease.Source.Size, 10))
			res.WriteHeader(http.StatusOK)
			_, err = io.Copy(lease.Writer(res), &contextReader{ctx: ctx, r: reader})
			_ = reader.Close()
		}
	}
	lease.Finish(err)

	switch {
	case err == nil:
		logger.Info().Int64("bytes", lease.BytesSent()).Msg("vod download completed")
		return nil
	case exec.IsCanceled(err) || ctx.Err() != nil:
		logger.Debug().Int64("bytes", lease.BytesSent()).Msg("vod download aborted")
		return nil
	case !res.Committed:
		logger.Error().Err(err).Msg("vod download failed before streaming")
		res.Header().Del(echo.HeaderContentDisposition)
		return ErrorResponse(c, http.StatusInternalServerError, "failed to stream video download")
	default:
		// Headers are already sent; the client sees a truncated download.
		logger.Error().Err(err).Int64("bytes", lease.BytesSent()).Msg("vod download failed while streaming")
		return nil
	}
}

func downloadErrorResponse(c echo.Context, err error) error {
	switch {
	case errors.Is(err, download.ErrNotFound):
		return ErrorResponse(c, http.StatusNotFound, err.Error())
	case errors.Is(err, download.ErrNotReady):
		return ErrorResponse(c, http.StatusConflict, err.Error())
	default:
		return ErrorResponse(c, http.StatusInternalServerError, err.Error())
	}
}

// contextReader stops a copy once the download is canceled.
type contextReader struct {
	ctx context.Context
	r   io.Reader
}

func (r *contextReader) Read(p []byte) (int, error) {
	if err := r.ctx.Err(); err != nil {
		return 0, err
	}
	return r.r.Read(p)
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

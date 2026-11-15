package exec

import (
	"context"
	"errors"
	"fmt"
	"io"
	osExec "os/exec"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// hlsToMp4StreamArgs remuxes without re-encoding into a fragmented MP4, which
// can be written to a non-seekable pipe. starts restores per-stream offsets
// that the HLS demuxer otherwise shifts across segment boundaries.
func hlsToMp4StreamArgs(playlistPath, title string, starts []mediaStreamStart) []string {
	args := []string{
		"-hide_banner", "-nostdin", "-loglevel", "error",
		"-i", playlistPath,
		"-map", "0", "-dn", "-sn", "-ignore_unknown",
		"-c", "copy",
		"-avoid_negative_ts", "make_zero",
		"-movflags", "frag_keyframe+empty_moov+default_base_moof",
		"-metadata", "title=" + title,
	}
	args = appendMediaTimestampArgs(args, starts, false)
	return append(args, "-f", "mp4", "pipe:1")
}

// StreamHlsAsMp4 writes the HLS playlist as MP4 to w. Cancelling ctx (e.g. a
// client disconnect) kills ffmpeg.
func StreamHlsAsMp4(ctx context.Context, playlistPath, title string, w io.Writer) error {
	starts, err := probeMediaStreamStarts(ctx, playlistPath)
	if err != nil {
		return fmt.Errorf("probe HLS stream starts: %w", err)
	}
	args := hlsToMp4StreamArgs(playlistPath, title, starts)
	log.Debug().Str("playlist", playlistPath).Str("cmd", strings.Join(args, " ")).Msg("streaming HLS as MP4")

	stderr := &limitedBuffer{limit: 4096}
	cmd := osExec.CommandContext(ctx, "ffmpeg", args...)
	cmd.Stdout = w
	cmd.Stderr = stderr
	cmd.WaitDelay = 5 * time.Second

	if err := cmd.Run(); err != nil {
		if ctxErr := ctx.Err(); ctxErr != nil {
			return ctxErr
		}
		return fmt.Errorf("ffmpeg HLS to MP4 stream: %w: %s", err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

// limitedBuffer keeps the first bytes of ffmpeg's stderr for error context.
type limitedBuffer struct {
	limit int
	buf   strings.Builder
}

func (b *limitedBuffer) Write(p []byte) (int, error) {
	if remaining := b.limit - b.buf.Len(); remaining > 0 {
		if len(p) > remaining {
			b.buf.Write(p[:remaining])
		} else {
			b.buf.Write(p)
		}
	}
	return len(p), nil
}

func (b *limitedBuffer) String() string { return b.buf.String() }

// IsCanceled reports whether err stems from context cancellation.
func IsCanceled(err error) bool {
	return errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded)
}

package exec

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func TestHlsToMp4StreamArgsWritesFragmentedMp4ToStdout(t *testing.T) {
	t.Parallel()

	starts := []mediaStreamStart{{Specifier: "v:0", Time: 1.5, Anchor: "STARTPTS"}}
	args := hlsToMp4StreamArgs("/videos/a/123-video.m3u8", "title", starts)

	if got := args[len(args)-3:]; got[0] != "-f" || got[1] != "mp4" || got[2] != "pipe:1" {
		t.Fatalf("expected MP4 stdout output at the end, got %v", got)
	}
	want := map[string]string{
		"-i":        "/videos/a/123-video.m3u8",
		"-c":        "copy",
		"-movflags": "frag_keyframe+empty_moov+default_base_moof",
		"-bsf:v:0":  "setts=pts=PTS-STARTPTS+1.500000000/TB:dts=DTS-STARTPTS+1.500000000/TB",
	}
	for flag, value := range want {
		found := false
		for i := 0; i < len(args)-1; i++ {
			if args[i] == flag && args[i+1] == value {
				found = true
			}
		}
		if !found {
			t.Errorf("missing %s %s in %v", flag, value, args)
		}
	}
}

// Builds a fMP4 HLS archive like ConvertVideoToHLS and checks the streamed MP4
// keeps the source duration instead of the demuxer's shifted audio timeline.
func TestStreamHlsAsMp4(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	src := filepath.Join(dir, "src.mp4")
	runTestCommand(t, "ffmpeg", "-y", "-loglevel", "error",
		"-f", "lavfi", "-i", "testsrc=duration=25:size=128x96:rate=30",
		"-f", "lavfi", "-i", "sine=duration=25",
		"-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", src)
	playlist := filepath.Join(dir, "123-video.m3u8")
	runTestCommand(t, "ffmpeg", "-y", "-loglevel", "error", "-i", src, "-c", "copy",
		"-start_number", "0", "-hls_time", "10", "-hls_list_size", "0", "-hls_playlist_type", "event",
		"-hls_flags", "append_list+independent_segments", "-hls_segment_type", "fmp4",
		"-hls_fmp4_init_filename", "123_init.mp4",
		"-hls_segment_filename", filepath.Join(dir, "123_segment%06d.m4s"),
		"-f", "hls", playlist)

	var out bytes.Buffer
	if err := StreamHlsAsMp4(context.Background(), playlist, "test", &out); err != nil {
		t.Fatalf("StreamHlsAsMp4: %v", err)
	}
	outPath := filepath.Join(dir, "out.mp4")
	if err := os.WriteFile(outPath, out.Bytes(), 0o644); err != nil {
		t.Fatal(err)
	}

	duration, err := ProbeMediaDuration(context.Background(), outPath)
	if err != nil {
		t.Fatalf("probe output: %v", err)
	}
	if duration.FormatDuration < 24 || duration.FormatDuration > 26 {
		t.Fatalf("expected ~25s output, got %+v", duration)
	}
}

func TestStreamHlsAsMp4Canceled(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	err := StreamHlsAsMp4(ctx, filepath.Join(t.TempDir(), "missing.m3u8"), "test", &bytes.Buffer{})
	if err == nil {
		t.Fatal("expected error for canceled context")
	}
}

func runTestCommand(t *testing.T, name string, args ...string) {
	t.Helper()
	if out, err := exec.Command(name, args...).CombinedOutput(); err != nil {
		t.Fatalf("%s failed: %v: %s", name, err, out)
	}
}

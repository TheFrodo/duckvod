package download

import (
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	require.NoError(t, os.MkdirAll(filepath.Dir(path), 0o755))
	require.NoError(t, os.WriteFile(path, []byte(content), 0o644))
}

const fmp4Playlist = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-MAP:URI="1%20a_init.mp4"
#EXT-X-DISCONTINUITY
#EXTINF:10.0,
1%20a_segment000000.m4s
#EXTINF:10.0,
1%20a_segment000001.m4s
#EXT-X-ENDLIST
`

func TestResolveConcatenatesSingleInitFmp4(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	playlist := filepath.Join(dir, "1-video.m3u8")
	writeFile(t, playlist, fmp4Playlist)
	writeFile(t, filepath.Join(dir, "1 a_init.mp4"), "INIT")
	writeFile(t, filepath.Join(dir, "1 a_segment000000.m4s"), "seg0-")
	writeFile(t, filepath.Join(dir, "1 a_segment000001.m4s"), "seg1")

	src, err := Resolve(playlist)
	require.NoError(t, err)
	require.False(t, src.Remux)
	require.EqualValues(t, len("INITseg0-seg1"), src.Size)

	r, err := src.Open()
	require.NoError(t, err)
	defer func() { _ = r.Close() }()
	got, err := io.ReadAll(r)
	require.NoError(t, err)
	require.Equal(t, "INITseg0-seg1", string(got))
}

func TestResolveFallsBackToRemux(t *testing.T) {
	t.Parallel()
	tests := map[string]string{
		"mid-stream discontinuity": strings.Replace(fmp4Playlist, "#EXTINF:10.0,\n1%20a_segment000001", "#EXT-X-DISCONTINUITY\n#EXTINF:10.0,\n1%20a_segment000001", 1),
		"mpeg-ts segments":         strings.ReplaceAll(strings.Replace(fmp4Playlist, "#EXT-X-MAP:URI=\"1%20a_init.mp4\"\n", "", 1), ".m4s", ".ts"),
	}
	for name, content := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			dir := t.TempDir()
			playlist := filepath.Join(dir, "1-video.m3u8")
			writeFile(t, playlist, content)
			writeFile(t, filepath.Join(dir, "1 a_init.mp4"), "INIT")
			for _, ext := range []string{".m4s", ".ts"} {
				writeFile(t, filepath.Join(dir, "1 a_segment000000"+ext), "seg0")
				writeFile(t, filepath.Join(dir, "1 a_segment000001"+ext), "seg1")
			}

			src, err := Resolve(playlist)
			require.NoError(t, err)
			require.True(t, src.Remux)
			require.Positive(t, src.Size)
		})
	}
}

func TestResolveRejectsEntriesOutsidePlaylistDir(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	playlist := filepath.Join(dir, "v", "1-video.m3u8")
	writeFile(t, playlist, "#EXTM3U\n#EXTINF:1,\n../secret.m4s\n")
	writeFile(t, filepath.Join(dir, "secret.m4s"), "secret")

	_, err := Resolve(playlist)
	require.Error(t, err)
}

func TestResolveDirectMp4(t *testing.T) {
	t.Parallel()
	path := filepath.Join(t.TempDir(), "video.mp4")
	writeFile(t, path, "mp4data")

	src, err := Resolve(path)
	require.NoError(t, err)
	require.False(t, src.Remux)
	require.EqualValues(t, 7, src.Size)
}

func TestConcatReaderDetectsShrunkFile(t *testing.T) {
	t.Parallel()
	path := filepath.Join(t.TempDir(), "video.mp4")
	writeFile(t, path, "short")

	r := &concatReader{parts: []part{{path, 10}}}
	_, err := io.ReadAll(r)
	require.ErrorIs(t, err, io.ErrUnexpectedEOF)
}

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
	}
	for _, tt := range tests {
		require.Equal(t, tt.want, PathWithin(base, tt.target), tt.name)
	}
	require.False(t, PathWithin("", filepath.Join(base, "video.mp4")))
}

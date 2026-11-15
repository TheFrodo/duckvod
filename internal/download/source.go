package download

import (
	"bufio"
	"errors"
	"fmt"
	"io"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// Source describes how an archived video is delivered as one MP4 file.
type Source struct {
	// Size is exact when Remux is false, otherwise an estimate.
	Size int64
	// Remux means the HLS playlist at Path must be remuxed with ffmpeg.
	Remux bool
	Path  string
	parts []part
}

type part struct {
	path string
	size int64
}

var errNotConcatenable = errors.New("playlist cannot be concatenated")

var mapURIPattern = regexp.MustCompile(`URI="([^"]*)"`)

// Resolve inspects a VOD's video file. MP4 files are served as-is. A fMP4 HLS
// playlist with a single init segment and no mid-stream discontinuity is a
// valid fragmented MP4 when its files are concatenated, which gives an exact
// size without running ffmpeg; other playlists fall back to remuxing.
func Resolve(videoPath string) (*Source, error) {
	if !strings.EqualFold(filepath.Ext(videoPath), ".m3u8") {
		info, err := regularFile(videoPath)
		if err != nil {
			return nil, err
		}
		return &Source{Size: info.Size(), Path: videoPath, parts: []part{{videoPath, info.Size()}}}, nil
	}

	pl, err := parsePlaylist(videoPath)
	if err != nil {
		return nil, err
	}
	parts, err := pl.concatParts()
	if err == nil {
		return &Source{Size: sumParts(parts), Path: videoPath, parts: parts}, nil
	}
	if !errors.Is(err, errNotConcatenable) {
		return nil, err
	}

	// Estimate from the media files; remuxing changes container overhead only.
	var estimate int64
	for _, p := range append(append([]string{}, pl.maps...), pl.segments...) {
		if info, err := regularFile(p); err == nil {
			estimate += info.Size()
		}
	}
	return &Source{Size: estimate, Remux: true, Path: videoPath}, nil
}

// Open returns a reader over the concatenated files. It must not be called
// for remux sources.
func (s *Source) Open() (io.ReadCloser, error) {
	if s.Remux {
		return nil, errors.New("remux source has no direct reader")
	}
	return &concatReader{parts: s.parts}, nil
}

type playlist struct {
	maps               []string
	segments           []string
	midDiscontinuity   bool
	unsupportedFeature bool
}

func parsePlaylist(path string) (*playlist, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer func() { _ = f.Close() }()

	dir := filepath.Dir(path)
	pl := &playlist{}
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		switch {
		case line == "":
		case strings.HasPrefix(line, "#EXT-X-MAP:"):
			if strings.Contains(line, "BYTERANGE") {
				pl.unsupportedFeature = true
			}
			m := mapURIPattern.FindStringSubmatch(line)
			if m == nil {
				return nil, fmt.Errorf("EXT-X-MAP without URI in %s", path)
			}
			p, err := resolveURI(dir, m[1])
			if err != nil {
				return nil, err
			}
			pl.maps = append(pl.maps, p)
		case strings.HasPrefix(line, "#EXT-X-DISCONTINUITY"):
			if len(pl.segments) > 0 {
				pl.midDiscontinuity = true
			}
		case strings.HasPrefix(line, "#EXT-X-BYTERANGE"), strings.HasPrefix(line, "#EXT-X-KEY"):
			pl.unsupportedFeature = true
		case strings.HasPrefix(line, "#"):
		default:
			p, err := resolveURI(dir, line)
			if err != nil {
				return nil, err
			}
			pl.segments = append(pl.segments, p)
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("read playlist %s: %w", path, err)
	}
	if len(pl.segments) == 0 {
		return nil, fmt.Errorf("playlist %s has no segments", path)
	}
	return pl, nil
}

func (pl *playlist) concatParts() ([]part, error) {
	if pl.unsupportedFeature || pl.midDiscontinuity || len(pl.maps) != 1 ||
		!strings.EqualFold(filepath.Ext(pl.maps[0]), ".mp4") {
		return nil, errNotConcatenable
	}
	parts := make([]part, 0, len(pl.segments)+1)
	for _, p := range append([]string{pl.maps[0]}, pl.segments...) {
		ext := strings.ToLower(filepath.Ext(p))
		if p != pl.maps[0] && ext != ".m4s" && ext != ".mp4" {
			return nil, errNotConcatenable
		}
		info, err := regularFile(p)
		if err != nil {
			return nil, err
		}
		parts = append(parts, part{p, info.Size()})
	}
	return parts, nil
}

// resolveURI maps a playlist entry to a file in the playlist's directory.
func resolveURI(dir, uri string) (string, error) {
	if strings.Contains(uri, "://") {
		return "", fmt.Errorf("remote playlist entry %q is not supported", uri)
	}
	if i := strings.IndexAny(uri, "?#"); i >= 0 {
		uri = uri[:i]
	}
	decoded, err := url.PathUnescape(uri)
	if err != nil {
		return "", fmt.Errorf("invalid playlist entry %q: %w", uri, err)
	}
	p := filepath.Join(dir, filepath.FromSlash(decoded))
	if !PathWithin(dir, p) {
		return "", fmt.Errorf("playlist entry %q points outside %s", uri, dir)
	}
	return p, nil
}

// PathWithin reports whether target lies strictly inside base.
func PathWithin(base, target string) bool {
	if base == "" {
		return false
	}
	rel, err := filepath.Rel(filepath.Clean(base), filepath.Clean(target))
	if err != nil {
		return false
	}
	return rel != "." && rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)) && !filepath.IsAbs(rel)
}

func regularFile(path string) (os.FileInfo, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	if !info.Mode().IsRegular() {
		return nil, fmt.Errorf("%s is not a regular file", path)
	}
	return info, nil
}

func sumParts(parts []part) int64 {
	var total int64
	for _, p := range parts {
		total += p.size
	}
	return total
}

// concatReader reads parts sequentially, opening one file at a time.
type concatReader struct {
	parts []part
	idx   int
	read  int64 // bytes read from the current part
	cur   *os.File
}

func (r *concatReader) Read(b []byte) (int, error) {
	for r.idx < len(r.parts) {
		if r.cur == nil {
			f, err := os.Open(r.parts[r.idx].path)
			if err != nil {
				return 0, err
			}
			r.cur, r.read = f, 0
		}
		// Never read past the size announced in Content-Length.
		remaining := r.parts[r.idx].size - r.read
		if remaining > 0 {
			if int64(len(b)) > remaining {
				b = b[:remaining]
			}
			n, err := r.cur.Read(b)
			r.read += int64(n)
			if n > 0 {
				return n, nil
			}
			if errors.Is(err, io.EOF) {
				err = fmt.Errorf("%s shrank while downloading: %w", r.parts[r.idx].path, io.ErrUnexpectedEOF)
			}
			if err != nil {
				_ = r.Close()
				r.idx = len(r.parts)
				return 0, err
			}
			continue
		}
		_ = r.cur.Close()
		r.cur = nil
		r.idx++
	}
	return 0, io.EOF
}

func (r *concatReader) Close() error {
	if r.cur != nil {
		err := r.cur.Close()
		r.cur = nil
		return err
	}
	return nil
}

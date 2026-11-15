// Package download limits concurrent VOD downloads with an in-memory queue.
// Tickets live in the API process only and are lost on restart.
package download

import (
	"context"
	"errors"
	"io"
	"slices"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
)

type State string

const (
	StateQueued      State = "queued"
	StateReady       State = "ready"
	StateDownloading State = "downloading"
	StateCompleted   State = "completed"
	StateFailed      State = "failed"
	StateExpired     State = "expired"
	StateCanceled    State = "canceled"
)

func (s State) finished() bool {
	return s == StateCompleted || s == StateFailed || s == StateExpired || s == StateCanceled
}

var (
	ErrNotFound    = errors.New("download not found")
	ErrNotReady    = errors.New("download is not ready to start")
	ErrClientLimit = errors.New("too many downloads for this client")
	ErrQueueFull   = errors.New("download queue is full")
)

// Status is the client-visible state of a ticket.
type Status struct {
	ID            uuid.UUID `json:"id"`
	VodID         uuid.UUID `json:"vod_id"`
	State         State     `json:"state"`
	Position      int       `json:"position"` // 1-based while queued, otherwise 0
	BytesSent     int64     `json:"bytes_sent"`
	TotalBytes    int64     `json:"total_bytes"`
	SizeEstimated bool      `json:"size_estimated"`
	Filename      string    `json:"filename"`
}

type Options struct {
	MaxActive    int
	MaxPerClient int
	MaxTickets   int
	// QueueIdleTimeout drops queued tickets whose client stopped polling.
	QueueIdleTimeout time.Duration
	// ReadyTimeout frees a slot that was granted but never started.
	ReadyTimeout time.Duration
	// Retention keeps finished tickets so clients can read the final state.
	Retention time.Duration
	Now       func() time.Time
}

type ticket struct {
	status     Status
	client     string
	source     *Source
	lastSeen   time.Time
	readyAt    time.Time
	finishedAt time.Time
	bytesSent  atomic.Int64
	cancel     context.CancelFunc
}

type Manager struct {
	mu      sync.Mutex
	opts    Options
	tickets map[uuid.UUID]*ticket
	queue   []uuid.UUID
}

func NewManager(opts Options) *Manager {
	if opts.MaxActive < 1 {
		opts.MaxActive = 3
	}
	if opts.MaxPerClient < 1 {
		opts.MaxPerClient = 2
	}
	if opts.MaxTickets < 1 {
		opts.MaxTickets = 200
	}
	if opts.QueueIdleTimeout <= 0 {
		opts.QueueIdleTimeout = 30 * time.Second
	}
	if opts.ReadyTimeout <= 0 {
		opts.ReadyTimeout = 2 * time.Minute
	}
	if opts.Retention <= 0 {
		opts.Retention = 5 * time.Minute
	}
	if opts.Now == nil {
		opts.Now = time.Now
	}
	return &Manager{opts: opts, tickets: make(map[uuid.UUID]*ticket)}
}

// Enqueue creates a ticket, or returns the client's existing live ticket for
// the same VOD.
func (m *Manager) Enqueue(vodID uuid.UUID, client, filename string, src *Source) (Status, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := m.opts.Now()
	m.sweep(now)

	live := 0
	for _, t := range m.tickets {
		if t.client != client || t.status.State.finished() {
			continue
		}
		if t.status.VodID == vodID {
			t.lastSeen = now
			return m.snapshot(t), nil
		}
		live++
	}
	if live >= m.opts.MaxPerClient {
		return Status{}, ErrClientLimit
	}
	if len(m.tickets) >= m.opts.MaxTickets {
		return Status{}, ErrQueueFull
	}

	t := &ticket{
		status: Status{
			ID:            uuid.New(),
			VodID:         vodID,
			State:         StateQueued,
			TotalBytes:    src.Size,
			SizeEstimated: src.Remux,
			Filename:      filename,
		},
		client:   client,
		source:   src,
		lastSeen: now,
	}
	m.tickets[t.status.ID] = t
	m.queue = append(m.queue, t.status.ID)
	m.promote(now)
	return m.snapshot(t), nil
}

// Status returns a ticket's state and counts as a client heartbeat.
func (m *Manager) Status(id uuid.UUID) (Status, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := m.opts.Now()
	m.sweep(now)
	t, ok := m.tickets[id]
	if !ok {
		return Status{}, ErrNotFound
	}
	t.lastSeen = now
	return m.snapshot(t), nil
}

// Cancel leaves the queue or aborts a running transfer.
func (m *Manager) Cancel(id uuid.UUID) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := m.opts.Now()
	t, ok := m.tickets[id]
	if !ok {
		return ErrNotFound
	}
	if !t.status.State.finished() {
		m.finish(t, StateCanceled, now)
	}
	m.promote(now)
	return nil
}

// Lease is a started transfer holding one download slot.
type Lease struct {
	m        *Manager
	t        *ticket
	ctx      context.Context
	Source   *Source
	Filename string
	once     sync.Once
}

// Start claims a ready ticket. ctx is the request context; the lease context
// is additionally cancelled by Cancel.
func (m *Manager) Start(ctx context.Context, id uuid.UUID) (*Lease, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := m.opts.Now()
	m.sweep(now)
	t, ok := m.tickets[id]
	if !ok {
		return nil, ErrNotFound
	}
	if t.status.State != StateReady {
		return nil, ErrNotReady
	}
	leaseCtx, cancel := context.WithCancel(ctx)
	t.status.State = StateDownloading
	t.cancel = cancel
	t.lastSeen = now
	return &Lease{m: m, t: t, ctx: leaseCtx, Source: t.source, Filename: t.status.Filename}, nil
}

func (l *Lease) Context() context.Context { return l.ctx }

// Writer counts bytes written to w as transfer progress.
func (l *Lease) Writer(w io.Writer) io.Writer { return &countingWriter{w: w, n: &l.t.bytesSent} }

func (l *Lease) BytesSent() int64 { return l.t.bytesSent.Load() }

// Finish releases the slot. A transfer is complete when it ended without
// error and, for exact sizes, delivered every byte.
func (l *Lease) Finish(err error) {
	l.once.Do(func() {
		l.m.mu.Lock()
		defer l.m.mu.Unlock()
		now := l.m.opts.Now()
		if l.t.status.State == StateDownloading {
			state := StateFailed
			if err == nil && (l.Source.Remux || l.BytesSent() == l.Source.Size) {
				state = StateCompleted
			}
			l.m.finish(l.t, state, now)
		}
		l.m.promote(now)
	})
}

func (m *Manager) finish(t *ticket, state State, now time.Time) {
	t.status.State = state
	t.finishedAt = now
	if t.cancel != nil {
		t.cancel()
	}
	m.queue = slices.DeleteFunc(m.queue, func(id uuid.UUID) bool { return id == t.status.ID })
}

func (m *Manager) sweep(now time.Time) {
	for id, t := range m.tickets {
		switch {
		case t.status.State == StateQueued && now.Sub(t.lastSeen) > m.opts.QueueIdleTimeout,
			t.status.State == StateReady && now.Sub(t.readyAt) > m.opts.ReadyTimeout:
			m.finish(t, StateExpired, now)
		case t.status.State.finished() && now.Sub(t.finishedAt) > m.opts.Retention:
			delete(m.tickets, id)
		}
	}
	m.promote(now)
}

// promote grants free slots to queued tickets in FIFO order.
func (m *Manager) promote(now time.Time) {
	active := 0
	for _, t := range m.tickets {
		if t.status.State == StateReady || t.status.State == StateDownloading {
			active++
		}
	}
	for active < m.opts.MaxActive && len(m.queue) > 0 {
		t := m.tickets[m.queue[0]]
		m.queue = m.queue[1:]
		if t == nil || t.status.State != StateQueued {
			continue
		}
		t.status.State = StateReady
		t.readyAt = now
		active++
	}
}

func (m *Manager) snapshot(t *ticket) Status {
	s := t.status
	s.BytesSent = t.bytesSent.Load()
	if s.State == StateQueued {
		s.Position = slices.Index(m.queue, s.ID) + 1
	}
	return s
}

type countingWriter struct {
	w io.Writer
	n *atomic.Int64
}

func (c *countingWriter) Write(p []byte) (int, error) {
	n, err := c.w.Write(p)
	c.n.Add(int64(n))
	return n, err
}

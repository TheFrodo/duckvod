package download

import (
	"bytes"
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

type fakeClock struct{ now time.Time }

func (c *fakeClock) Now() time.Time          { return c.now }
func (c *fakeClock) advance(d time.Duration) { c.now = c.now.Add(d) }
func exactSource(size int64) *Source         { return &Source{Size: size} }
func newTestManager(c *fakeClock, max int) *Manager {
	return NewManager(Options{MaxActive: max, MaxPerClient: 2, QueueIdleTimeout: 30 * time.Second, ReadyTimeout: time.Minute, Retention: time.Minute, Now: c.Now})
}

func TestManagerQueuesBeyondMaxActive(t *testing.T) {
	t.Parallel()
	clock := &fakeClock{now: time.Unix(0, 0)}
	m := newTestManager(clock, 2)

	a, err := m.Enqueue(uuid.New(), "a", "a.mp4", exactSource(1))
	require.NoError(t, err)
	b, err := m.Enqueue(uuid.New(), "b", "b.mp4", exactSource(1))
	require.NoError(t, err)
	c, err := m.Enqueue(uuid.New(), "c", "c.mp4", exactSource(1))
	require.NoError(t, err)
	d, err := m.Enqueue(uuid.New(), "d", "d.mp4", exactSource(1))
	require.NoError(t, err)

	require.Equal(t, StateReady, a.State)
	require.Equal(t, StateReady, b.State)
	require.Equal(t, StateQueued, c.State)
	require.Equal(t, 1, c.Position)
	require.Equal(t, 2, d.Position)

	_, err = m.Start(context.Background(), c.ID)
	require.ErrorIs(t, err, ErrNotReady)

	// Finishing one transfer promotes the head of the queue.
	lease, err := m.Start(context.Background(), a.ID)
	require.NoError(t, err)
	lease.Finish(nil)

	c, err = m.Status(c.ID)
	require.NoError(t, err)
	require.Equal(t, StateReady, c.State)
	d, err = m.Status(d.ID)
	require.NoError(t, err)
	require.Equal(t, 1, d.Position)
}

func TestManagerPerClientLimitAndIdempotentEnqueue(t *testing.T) {
	t.Parallel()
	clock := &fakeClock{now: time.Unix(0, 0)}
	m := newTestManager(clock, 3)
	vod := uuid.New()

	first, err := m.Enqueue(vod, "ip", "a.mp4", exactSource(1))
	require.NoError(t, err)
	again, err := m.Enqueue(vod, "ip", "a.mp4", exactSource(1))
	require.NoError(t, err)
	require.Equal(t, first.ID, again.ID)

	_, err = m.Enqueue(uuid.New(), "ip", "b.mp4", exactSource(1))
	require.NoError(t, err)
	_, err = m.Enqueue(uuid.New(), "ip", "c.mp4", exactSource(1))
	require.ErrorIs(t, err, ErrClientLimit)
}

func TestManagerExpiresAbandonedTickets(t *testing.T) {
	t.Parallel()
	clock := &fakeClock{now: time.Unix(0, 0)}
	m := newTestManager(clock, 1)

	ready, err := m.Enqueue(uuid.New(), "a", "a.mp4", exactSource(1))
	require.NoError(t, err)
	queued, err := m.Enqueue(uuid.New(), "b", "b.mp4", exactSource(1))
	require.NoError(t, err)
	waiting, err := m.Enqueue(uuid.New(), "c", "c.mp4", exactSource(1))
	require.NoError(t, err)

	// "b" stops polling; "c" keeps polling while the unused ready slot expires.
	for i := 0; i < 4; i++ {
		clock.advance(20 * time.Second)
		_, err = m.Status(waiting.ID)
		require.NoError(t, err)
	}

	s, err := m.Status(ready.ID)
	require.NoError(t, err)
	require.Equal(t, StateExpired, s.State)
	s, err = m.Status(queued.ID)
	require.NoError(t, err)
	require.Equal(t, StateExpired, s.State)
	s, err = m.Status(waiting.ID)
	require.NoError(t, err)
	require.Equal(t, StateReady, s.State)

	clock.advance(2 * time.Minute)
	_, err = m.Status(ready.ID)
	require.ErrorIs(t, err, ErrNotFound)
}

func TestLeaseTracksProgressAndCompletion(t *testing.T) {
	t.Parallel()
	clock := &fakeClock{now: time.Unix(0, 0)}
	m := newTestManager(clock, 1)

	s, err := m.Enqueue(uuid.New(), "a", "a.mp4", exactSource(5))
	require.NoError(t, err)
	lease, err := m.Start(context.Background(), s.ID)
	require.NoError(t, err)
	_, err = m.Start(context.Background(), s.ID)
	require.ErrorIs(t, err, ErrNotReady, "a ticket can only be started once")

	var out bytes.Buffer
	_, err = lease.Writer(&out).Write([]byte("abc"))
	require.NoError(t, err)
	s, err = m.Status(s.ID)
	require.NoError(t, err)
	require.Equal(t, StateDownloading, s.State)
	require.EqualValues(t, 3, s.BytesSent)

	// Incomplete transfers are failures even without an error.
	lease.Finish(nil)
	s, err = m.Status(s.ID)
	require.NoError(t, err)
	require.Equal(t, StateFailed, s.State)
}

func TestCancelAbortsRunningLease(t *testing.T) {
	t.Parallel()
	clock := &fakeClock{now: time.Unix(0, 0)}
	m := newTestManager(clock, 1)

	s, err := m.Enqueue(uuid.New(), "a", "a.mp4", exactSource(5))
	require.NoError(t, err)
	next, err := m.Enqueue(uuid.New(), "b", "b.mp4", exactSource(5))
	require.NoError(t, err)
	lease, err := m.Start(context.Background(), s.ID)
	require.NoError(t, err)

	require.NoError(t, m.Cancel(s.ID))
	require.True(t, errors.Is(lease.Context().Err(), context.Canceled))
	lease.Finish(context.Canceled)

	s, err = m.Status(s.ID)
	require.NoError(t, err)
	require.Equal(t, StateCanceled, s.State)
	next, err = m.Status(next.ID)
	require.NoError(t, err)
	require.Equal(t, StateReady, next.State)
}
